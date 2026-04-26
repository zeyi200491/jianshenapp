import { getDisplayDietSceneLabel, type DietScene } from '@campusfit/rule-engine';

type PlannedDietPlanItem = {
  id?: string;
  mealType: string;
  title: string;
  suggestionText?: string;
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  alternatives?: string[];
};

type MealIntakeOverride = {
  mealType: string;
  foodCode: string;
  foodNameSnapshot: string;
  portionSize: string;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

function normalizeMealType(mealType: string) {
  return mealType as 'breakfast' | 'lunch' | 'dinner';
}

function getOverrideMap(overrides: MealIntakeOverride[] = []) {
  return new Map(overrides.map((item) => [item.mealType, item]));
}

export function buildPlannedMeal(item: PlannedDietPlanItem) {
  return {
    id: item.id ?? `${item.mealType}-planned`,
    mealType: normalizeMealType(item.mealType),
    title: item.title,
    description: item.suggestionText ?? '',
    nutrition: {
      calories: item.targetCalories,
      proteinG: item.proteinG,
      carbG: item.carbsG,
      fatG: item.fatG,
    },
    alternatives: item.alternatives ?? [],
  };
}

export function buildActualMeal(item?: MealIntakeOverride | null) {
  if (!item) {
    return null;
  }

  return {
    mealType: normalizeMealType(item.mealType),
    foodCode: item.foodCode,
    foodName: item.foodNameSnapshot,
    portionSize: item.portionSize,
    title: item.foodNameSnapshot,
    nutrition: {
      calories: item.calories,
      proteinG: item.proteinG,
      carbG: item.carbG,
      fatG: item.fatG,
    },
  };
}

export function buildDietPlanMeals(
  items: PlannedDietPlanItem[] = [],
  overrides: MealIntakeOverride[] = [],
) {
  const overrideMap = getOverrideMap(overrides);

  return items.map((item) => {
    const planned = buildPlannedMeal(item);
    const actual = buildActualMeal(overrideMap.get(item.mealType));
    const effective = actual
      ? {
          mealType: actual.mealType,
          title: actual.title,
          description: `已按实际摄入重算：${actual.foodName}（${actual.portionSize === 'small' ? '小份' : actual.portionSize === 'large' ? '大份' : '中份'}）`,
          nutrition: actual.nutrition,
          source: 'actual' as const,
        }
      : {
          mealType: planned.mealType,
          title: planned.title,
          description: planned.description,
          nutrition: planned.nutrition,
          source: 'planned' as const,
        };

    return {
      id: planned.id,
      mealType: planned.mealType,
      title: effective.title,
      description: effective.description,
      target: `${effective.nutrition.calories} kcal / P${effective.nutrition.proteinG} C${effective.nutrition.carbG} F${effective.nutrition.fatG}`,
      alternatives: planned.alternatives,
      notes: [],
      planned,
      actual,
      effective,
    };
  });
}

export function buildEffectiveDailyTotals(
  items: PlannedDietPlanItem[] = [],
  overrides: MealIntakeOverride[] = [],
) {
  const meals = buildDietPlanMeals(items, overrides);

  return meals.reduce(
    (result, meal) => {
      result.calories += meal.effective.nutrition.calories;
      result.proteinG += meal.effective.nutrition.proteinG;
      result.carbG += meal.effective.nutrition.carbG;
      result.fatG += meal.effective.nutrition.fatG;
      return result;
    },
    {
      calories: 0,
      proteinG: 0,
      carbG: 0,
      fatG: 0,
    },
  );
}

export function getDietSceneDisplayLabel(scene: DietScene) {
  return getDisplayDietSceneLabel(scene);
}
