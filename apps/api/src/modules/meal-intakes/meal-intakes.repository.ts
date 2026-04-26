import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MealIntakesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDailyPlanByIdAndUser(dailyPlanId: string, userId: string) {
    return this.prisma.dailyPlan.findFirst({
      where: {
        id: dailyPlanId,
        userId,
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
      },
    });
  }

  upsertMealIntakeOverride(userId: string, payload: {
    dailyPlanId: string;
    mealType: string;
    source: string;
    foodCode: string;
    foodNameSnapshot: string;
    portionSize: string;
    calories: number;
    proteinG: number;
    carbG: number;
    fatG: number;
  }) {
    return this.prisma.mealIntakeOverride.upsert({
      where: {
        dailyPlanId_mealType: {
          dailyPlanId: payload.dailyPlanId,
          mealType: payload.mealType,
        },
      },
      create: {
        userId,
        ...payload,
      },
      update: {
        source: payload.source,
        foodCode: payload.foodCode,
        foodNameSnapshot: payload.foodNameSnapshot,
        portionSize: payload.portionSize,
        calories: payload.calories,
        proteinG: payload.proteinG,
        carbG: payload.carbG,
        fatG: payload.fatG,
      },
    });
  }

  deleteMealIntakeOverride(dailyPlanId: string, mealType: string) {
    return this.prisma.mealIntakeOverride.deleteMany({
      where: {
        dailyPlanId,
        mealType,
      },
    });
  }
}
