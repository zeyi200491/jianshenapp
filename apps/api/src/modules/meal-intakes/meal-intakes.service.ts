import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { buildDietPlanMeals, buildEffectiveDailyTotals } from './meal-intake-presenter';
import { type MealFood, toFoodSearchResult, type MealType, type PortionSize } from './food-library';
import { FoodLibraryRepository } from './food-library.repository';
import { MealIntakesRepository } from './meal-intakes.repository';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
const PORTION_MULTIPLIERS: Record<PortionSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.25,
};

function assertMealType(mealType: string): MealType {
  if (!MEAL_TYPES.includes(mealType as MealType)) {
    throw new AppException('VALIDATION_ERROR', 'Only breakfast, lunch, and dinner are supported.', 400);
  }
  return mealType as MealType;
}

function roundNutrition(value: number): number {
  return Math.max(1, Math.round(value));
}

function buildMealNutrition(food: MealFood, portionSize: PortionSize) {
  const multiplier = PORTION_MULTIPLIERS[portionSize];

  return {
    calories: roundNutrition(food.nutritionPerMedium.calories * multiplier),
    proteinG: roundNutrition(food.nutritionPerMedium.proteinG * multiplier),
    carbG: roundNutrition(food.nutritionPerMedium.carbG * multiplier),
    fatG: roundNutrition(food.nutritionPerMedium.fatG * multiplier),
  };
}

@Injectable()
export class MealIntakesService {
  constructor(
    private readonly repository: MealIntakesRepository,
    private readonly foodLibraryRepository: FoodLibraryRepository,
  ) {}

  async searchFoods(keyword: string, scene?: string, mealType?: MealType) {
    const foods = await this.foodLibraryRepository.searchFoodLibrary(keyword, scene, mealType);
    return foods.map(toFoodSearchResult);
  }

  async upsertMealIntake(
    userId: string,
    dailyPlanId: string,
    mealType: string,
    payload: { foodCode: string; portionSize: PortionSize },
  ) {
    const normalizedMealType = assertMealType(mealType);
    const plan = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
    if (!plan?.dietPlan) {
      throw new AppException('NOT_FOUND', 'Daily plan not found.', 404);
    }

    const food = await this.foodLibraryRepository.findFoodByCode(payload.foodCode);
    const nutrition = buildMealNutrition(food, payload.portionSize);
    const saved = await this.repository.upsertMealIntakeOverride(userId, {
      dailyPlanId,
      mealType: normalizedMealType,
      source: 'food_library',
      foodCode: food.code,
      foodNameSnapshot: food.name,
      portionSize: payload.portionSize,
      calories: nutrition.calories,
      proteinG: nutrition.proteinG,
      carbG: nutrition.carbG,
      fatG: nutrition.fatG,
    });

    const mergedOverrides = [
      ...(plan.mealIntakeOverrides ?? []).filter((item: { mealType: string }) => item.mealType !== normalizedMealType),
      saved,
    ];

    return {
      actual: {
        mealType: normalizedMealType,
        foodCode: saved.foodCode,
        foodName: saved.foodNameSnapshot,
        portionSize: saved.portionSize,
        calories: saved.calories,
        proteinG: saved.proteinG,
        carbG: saved.carbG,
        fatG: saved.fatG,
      },
      meals: buildDietPlanMeals(plan.dietPlan.items, mergedOverrides),
      effectiveDailyTotals: buildEffectiveDailyTotals(plan.dietPlan.items, mergedOverrides),
    };
  }

  async removeMealIntake(userId: string, dailyPlanId: string, mealType: string) {
    const normalizedMealType = assertMealType(mealType);
    const plan = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
    if (!plan?.dietPlan) {
      throw new AppException('NOT_FOUND', 'Daily plan not found.', 404);
    }

    await this.repository.deleteMealIntakeOverride(dailyPlanId, normalizedMealType);
    const refreshed = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
    if (!refreshed?.dietPlan) {
      throw new AppException('NOT_FOUND', 'Daily plan not found.', 404);
    }

    return {
      meals: buildDietPlanMeals(refreshed.dietPlan.items, refreshed.mealIntakeOverrides ?? []),
      effectiveDailyTotals: buildEffectiveDailyTotals(refreshed.dietPlan.items, refreshed.mealIntakeOverrides ?? []),
    };
  }
}
