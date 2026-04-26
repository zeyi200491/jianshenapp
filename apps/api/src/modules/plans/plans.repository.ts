import { Injectable } from '@nestjs/common';
import type { DietPlanResult, NutritionTargets, RuleProfileInput, TrainingPlanResult } from '@campusfit/rule-engine';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileByUserId(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async findDailyPlanByUserAndDate(userId: string, planDate: Date) {
    return this.prisma.dailyPlan.findUnique({
      where: {
        userId_planDate: {
          userId,
          planDate,
        },
      },
      include: {
        dietPlan: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        mealIntakeOverrides: true,
        trainingPlan: {
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async findLatestCompletedTrainingForCycle(userId: string, resetAt: Date, planDate: Date) {
    const lastInclusiveDate = new Date(planDate.toISOString());
    lastInclusiveDate.setUTCDate(lastInclusiveDate.getUTCDate() - 1);

    const checkIns = await this.prisma.checkIn.findMany({
      where: {
        userId,
        checkinDate: {
          gte: resetAt,
          lte: lastInclusiveDate,
        },
      },
    });

    const sortedCheckIns = [...checkIns]
      .filter((item: { trainingCompletionRate: number }) => item.trainingCompletionRate > 0)
      .sort((left: { checkinDate: Date }, right: { checkinDate: Date }) => right.checkinDate.getTime() - left.checkinDate.getTime());

    for (const item of sortedCheckIns) {
      const dailyPlan = await this.findDailyPlanByUserAndDate(userId, item.checkinDate);
      const title = dailyPlan?.trainingPlan?.title;
      const focus =
        title === 'Push 日'
          ? 'push'
          : title === 'Pull 日'
            ? 'pull'
            : title === 'Leg 日'
              ? 'legs'
              : null;

      if (focus) {
        return {
          focus,
          checkinDate: item.checkinDate,
        };
      }
    }

    return null;
  }

  async saveGeneratedPlan(params: {
    userId: string;
    planDate: Date;
    nutrition: NutritionTargets;
    dietPlan: DietPlanResult;
    trainingPlan: TrainingPlanResult;
    regenerate: boolean;
  }) {
    const existing = await this.findDailyPlanByUserAndDate(params.userId, params.planDate);
    if (existing && !params.regenerate) {
      return { ...existing, generated: false };
    }

    return this.prisma.$transaction(async (tx) => {
      const dailyPlan = existing
        ? await tx.dailyPlan.update({
            where: { id: existing.id },
            data: {
              calorieTarget: params.nutrition.calorieTarget,
              proteinTargetG: params.nutrition.proteinTargetG,
              carbTargetG: params.nutrition.carbTargetG,
              fatTargetG: params.nutrition.fatTargetG,
              generatedAt: new Date(),
              generationVersion: 'rule-v1',
              status: 'active',
            },
          })
        : await tx.dailyPlan.create({
            data: {
              userId: params.userId,
              planDate: params.planDate,
              calorieTarget: params.nutrition.calorieTarget,
              proteinTargetG: params.nutrition.proteinTargetG,
              carbTargetG: params.nutrition.carbTargetG,
              fatTargetG: params.nutrition.fatTargetG,
              generatedAt: new Date(),
              generationVersion: 'rule-v1',
              status: 'active',
            },
          });

      const diet = existing?.dietPlan
        ? await tx.dietPlan.update({
            where: { id: existing.dietPlan.id },
            data: {
              scene: params.dietPlan.scene,
              summary: params.dietPlan.summary,
              supplementNotes: params.dietPlan.supplementNotes,
            },
          })
        : await tx.dietPlan.create({
            data: {
              dailyPlanId: dailyPlan.id,
              scene: params.dietPlan.scene,
              summary: params.dietPlan.summary,
              supplementNotes: params.dietPlan.supplementNotes,
            },
          });
      await tx.dietPlanItem.deleteMany({ where: { dietPlanId: diet.id } });
      await tx.dietPlanItem.createMany({
        data: params.dietPlan.items.map((item) => ({
          dietPlanId: diet.id,
          mealType: item.mealType,
          title: item.title,
          targetCalories: item.targetCalories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          suggestionText: item.suggestionText,
          alternatives: item.alternatives,
          displayOrder: item.displayOrder,
        })),
      });

      const training = existing?.trainingPlan
        ? await tx.trainingPlan.update({
            where: { id: existing.trainingPlan.id },
            data: {
              splitType: params.trainingPlan.splitType,
              title: params.trainingPlan.title,
              durationMinutes: params.trainingPlan.durationMinutes,
              intensityLevel: params.trainingPlan.intensityLevel,
              notes: params.trainingPlan.notes,
            },
          })
        : await tx.trainingPlan.create({
            data: {
              dailyPlanId: dailyPlan.id,
              splitType: params.trainingPlan.splitType,
              title: params.trainingPlan.title,
              durationMinutes: params.trainingPlan.durationMinutes,
              intensityLevel: params.trainingPlan.intensityLevel,
              notes: params.trainingPlan.notes,
            },
          });
      await tx.trainingPlanItem.deleteMany({ where: { trainingPlanId: training.id } });
      await tx.trainingPlanItem.createMany({
        data: params.trainingPlan.items.map((item) => ({
          trainingPlanId: training.id,
          exerciseCode: item.exerciseCode,
          exerciseName: item.exerciseName,
          sets: item.sets,
          reps: item.reps,
          restSeconds: item.restSeconds,
          notes: item.notes,
          displayOrder: item.displayOrder,
        })),
      });

      const finalPlan = await tx.dailyPlan.findUniqueOrThrow({
        where: { id: dailyPlan.id },
        include: {
          dietPlan: {
            include: {
              items: { orderBy: { displayOrder: 'asc' } },
            },
          },
          mealIntakeOverrides: true,
          trainingPlan: {
            include: {
              items: { orderBy: { displayOrder: 'asc' } },
            },
          },
        },
      });

      return { ...finalPlan, generated: true };
    });
  }

  findDietPlanByIdAndUser(dietPlanId: string, userId: string) {
    return this.prisma.dietPlan.findFirst({
      where: {
        id: dietPlanId,
        dailyPlan: {
          userId,
        },
      },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
        dailyPlan: true,
      },
    });
  }

  findTrainingPlanByIdAndUser(trainingPlanId: string, userId: string) {
    return this.prisma.trainingPlan.findFirst({
      where: {
        id: trainingPlanId,
        dailyPlan: {
          userId,
        },
      },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' },
        },
        dailyPlan: true,
      },
    });
  }
}
