import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function buildOverrideInclude() {
  return {
    items: {
      orderBy: { displayOrder: 'asc' as const },
    },
  };
}

@Injectable()
export class TrainingOverridesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDailyPlanByIdAndUser(dailyPlanId: string, userId: string) {
    return this.prisma.dailyPlan.findFirst({
      where: { id: dailyPlanId, userId },
      include: {
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

  findTemplateByIdAndUser(templateId: string, userId: string) {
    return this.prisma.userTrainingTemplate.findFirst({
      where: { id: templateId, userId },
      include: {
        days: {
          orderBy: [{ sortOrder: 'asc' }, { dayIndex: 'asc' }],
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  findActiveByDailyPlanIdAndUser(dailyPlanId: string, userId: string) {
    return this.prisma.dailyTrainingOverride.findFirst({
      where: {
        dailyPlanId,
        userId,
        status: 'active',
      },
      include: buildOverrideInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async applyOverride(params: {
    userId: string;
    dailyPlanId: string;
    sourceTemplateId: string;
    sourceTemplateDayId?: string | null;
    sourceWeekday: string;
    title: string;
    splitType: string;
    durationMinutes: number;
    intensityLevel: string;
    notes: string;
    items: Array<{
      sourceTemplateItemId?: string | null;
      exerciseCode: string;
      exerciseName: string;
      sets: number;
      reps: string;
      repText?: string | null;
      sourceType?: string;
      rawInput?: string | null;
      restSeconds: number;
      notes: string;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.dailyTrainingOverride.updateMany({
        where: {
          dailyPlanId: params.dailyPlanId,
          userId: params.userId,
          status: 'active',
        },
        data: {
          status: 'superseded',
        },
      });

      const created = await tx.dailyTrainingOverride.create({
        data: {
          userId: params.userId,
          dailyPlanId: params.dailyPlanId,
          status: 'active',
          sourceWeekday: params.sourceWeekday,
          sourceTemplateId: params.sourceTemplateId,
          sourceTemplateDayId: params.sourceTemplateDayId ?? null,
          title: params.title,
          splitType: params.splitType,
          durationMinutes: params.durationMinutes,
          intensityLevel: params.intensityLevel,
          notes: params.notes,
        },
      });

      if (params.items.length > 0) {
        await tx.dailyTrainingOverrideItem.createMany({
          data: params.items.map((item, index) => ({
            dailyTrainingOverrideId: created.id,
            sourceTemplateItemId: item.sourceTemplateItemId ?? null,
            exerciseCode: item.exerciseCode,
            exerciseName: item.exerciseName,
            sets: item.sets,
            reps: item.reps,
            repText: item.repText ?? item.reps,
            sourceType: item.sourceType ?? 'standard',
            rawInput: item.rawInput ?? null,
            restSeconds: item.restSeconds,
            notes: item.notes,
            displayOrder: index,
          })),
        });
      }

      return tx.dailyTrainingOverride.findUniqueOrThrow({
        where: { id: created.id },
        include: buildOverrideInclude(),
      });
    });
  }

  async removeActiveOverride(dailyPlanId: string, userId: string) {
    await this.prisma.dailyTrainingOverride.updateMany({
      where: {
        dailyPlanId,
        userId,
        status: 'active',
      },
      data: {
        status: 'superseded',
      },
    });
  }
}
