import { getDisplayDietScene, getDisplayDietSceneLabel, type DietScene, type DisplayDietScene } from '@campusfit/rule-engine';
import { AppException } from '../../common/utils/app.exception';

export type PortionSize = 'small' | 'medium' | 'large';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export type FoodNutrition = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type MealFood = {
  code: string;
  name: string;
  aliases: string[];
  sceneTags: DisplayDietScene[];
  suggestedMealTypes: MealType[];
  nutritionPerMedium: FoodNutrition;
  sortOrder?: number;
};

const PORTION_MULTIPLIERS: Record<PortionSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.25,
};

const FOOD_LIBRARY: MealFood[] = [
  {
    code: 'fried-rice',
    name: '炒饭',
    aliases: ['蛋炒饭', '扬州炒饭', '什锦炒饭'],
    sceneTags: ['canteen'],
    suggestedMealTypes: ['lunch', 'dinner'],
    nutritionPerMedium: { calories: 680, proteinG: 18, carbG: 92, fatG: 24 },
  },
  {
    code: 'braised-chicken-rice',
    name: '黄焖鸡米饭',
    aliases: ['黄焖鸡', '黄焖鸡饭'],
    sceneTags: ['canteen'],
    suggestedMealTypes: ['lunch', 'dinner'],
    nutritionPerMedium: { calories: 760, proteinG: 32, carbG: 88, fatG: 28 },
  },
  {
    code: 'beef-noodle-soup',
    name: '牛肉面',
    aliases: ['红烧牛肉面', '牛肉汤面'],
    sceneTags: ['canteen'],
    suggestedMealTypes: ['lunch', 'dinner'],
    nutritionPerMedium: { calories: 620, proteinG: 28, carbG: 78, fatG: 18 },
  },
  {
    code: 'egg-noodles',
    name: '鸡蛋面',
    aliases: ['番茄鸡蛋面', '家常鸡蛋面'],
    sceneTags: ['cookable'],
    suggestedMealTypes: ['breakfast', 'dinner'],
    nutritionPerMedium: { calories: 540, proteinG: 20, carbG: 78, fatG: 16 },
  },
  {
    code: 'chicken-rice-bowl',
    name: '鸡胸肉盖饭',
    aliases: ['鸡胸肉饭', '鸡胸肉饭盒'],
    sceneTags: ['cookable'],
    suggestedMealTypes: ['lunch', 'dinner'],
    nutritionPerMedium: { calories: 610, proteinG: 40, carbG: 66, fatG: 14 },
  },
  {
    code: 'tomato-beef-pasta',
    name: '番茄牛肉意面',
    aliases: ['牛肉意面', '番茄意面'],
    sceneTags: ['cookable'],
    suggestedMealTypes: ['lunch', 'dinner'],
    nutritionPerMedium: { calories: 650, proteinG: 30, carbG: 82, fatG: 18 },
  },
  {
    code: 'oatmeal-yogurt-bowl',
    name: '燕麦酸奶碗',
    aliases: ['燕麦碗', '酸奶燕麦'],
    sceneTags: ['cookable', 'canteen'],
    suggestedMealTypes: ['breakfast'],
    nutritionPerMedium: { calories: 420, proteinG: 24, carbG: 48, fatG: 10 },
  },
  {
    code: 'whole-wheat-sandwich',
    name: '全麦三明治',
    aliases: ['鸡蛋三明治', '金枪鱼三明治'],
    sceneTags: ['cookable', 'canteen'],
    suggestedMealTypes: ['breakfast', 'dinner'],
    nutritionPerMedium: { calories: 460, proteinG: 22, carbG: 46, fatG: 14 },
  },
];

function roundNutrition(value: number): number {
  return Math.max(1, Math.round(value));
}

export function normalizeDisplayDietScene(scene?: string): DisplayDietScene | undefined {
  if (!scene) {
    return undefined;
  }
  if (scene === 'canteen' || scene === 'cookable') {
    return scene;
  }
  return getDisplayDietScene(scene as DietScene);
}

export function getFoodLibrary() {
  return FOOD_LIBRARY;
}

export function searchMealFoods(keyword: string, scene?: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedScene = normalizeDisplayDietScene(scene);

  return FOOD_LIBRARY.filter((item) => {
    if (normalizedScene && !item.sceneTags.includes(normalizedScene)) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    const haystacks = [item.name, ...item.aliases].map((entry) => entry.toLowerCase());
    return haystacks.some((entry) => entry.includes(normalizedKeyword));
  });
}

export function getMealFoodByCode(code: string) {
  const matched = FOOD_LIBRARY.find((item) => item.code === code);
  if (!matched) {
    throw new AppException('NOT_FOUND', '未找到对应的常见食物。', 404);
  }
  return matched;
}

export function estimateMealFoodNutrition(foodCode: string, portionSize: PortionSize) {
  const food = getMealFoodByCode(foodCode);
  const multiplier = PORTION_MULTIPLIERS[portionSize];

  return {
    food,
    portionSize,
    nutrition: {
      calories: roundNutrition(food.nutritionPerMedium.calories * multiplier),
      proteinG: roundNutrition(food.nutritionPerMedium.proteinG * multiplier),
      carbG: roundNutrition(food.nutritionPerMedium.carbG * multiplier),
      fatG: roundNutrition(food.nutritionPerMedium.fatG * multiplier),
    },
  };
}

export function toFoodSearchResult(item: MealFood) {
  return {
    code: item.code,
    name: item.name,
    aliases: item.aliases,
    sceneTags: item.sceneTags,
    sceneLabels: item.sceneTags.map((scene) => getDisplayDietSceneLabel(scene === 'canteen' ? 'canteen' : 'dorm')),
    suggestedMealTypes: item.suggestedMealTypes,
    nutritionPerMedium: item.nutritionPerMedium,
    portions: Object.keys(PORTION_MULTIPLIERS),
  };
}
