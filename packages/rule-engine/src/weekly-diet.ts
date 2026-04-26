import {
  getDisplayDietScene,
  getDisplayDietSceneLabel,
  type DietScene,
  type DisplayDietScene,
  type NutritionTargets,
  type RuleProfileInput,
  type TargetType,
} from './index';

type WeeklyMealType = 'breakfast' | 'lunch' | 'dinner';
type WeeklyDayType = 'training' | 'rest';

type IngredientTemplate = {
  name: string;
  unit: string;
  amount: number;
};

type MealTemplate = {
  title: string;
  description: string;
  ingredients: IngredientTemplate[];
  alternatives: string[];
  prepTips: string[];
};

type MacroTargets = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export interface WeeklyDietIngredientResult {
  name: string;
  unit: string;
  amount: number;
}

export interface WeeklyDietMealDetailResult {
  mealType: WeeklyMealType;
  title: string;
  description: string;
  ingredients: WeeklyDietIngredientResult[];
  nutrition: MacroTargets;
  alternatives: string[];
  guidance: string[];
  prepTips: string[];
}

export interface WeeklyDietDayResult {
  date: string;
  weekday: string;
  dayType: WeeklyDayType;
  dailyTargets: MacroTargets;
  meals: {
    breakfast: WeeklyDietMealDetailResult;
    lunch: WeeklyDietMealDetailResult;
    dinner: WeeklyDietMealDetailResult;
  };
}

export interface WeeklyDietPlanResult {
  weekStartDate: string;
  weekEndDate: string;
  goalType: TargetType;
  dietScene: DietScene;
  displayScene: DisplayDietScene;
  summary: string;
  days: WeeklyDietDayResult[];
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const DAY_CALORIE_ADJUSTMENT: Record<WeeklyDayType, number> = {
  training: 80,
  rest: -80,
};

const MEAL_RATIOS: Record<WeeklyDayType, Record<WeeklyMealType, number>> = {
  training: {
    breakfast: 0.28,
    lunch: 0.38,
    dinner: 0.34,
  },
  rest: {
    breakfast: 0.3,
    lunch: 0.36,
    dinner: 0.34,
  },
};

const MEAL_LIBRARY: Record<WeeklyMealType, MealTemplate[]> = {
  breakfast: [
    {
      title: '燕麦鸡蛋酸奶碗',
      description: '高蛋白早餐模板，先把蛋白和主食补到位，上午更稳。',
      ingredients: [
        { name: '即食燕麦', amount: 55, unit: 'g' },
        { name: '鸡蛋', amount: 2, unit: '个' },
        { name: '希腊酸奶', amount: 180, unit: 'g' },
        { name: '蓝莓', amount: 80, unit: 'g' },
      ],
      alternatives: ['希腊酸奶可换无糖豆浆 350ml', '蓝莓可换苹果 1 个'],
      prepTips: ['前一晚分装燕麦和酸奶，早上直接拌好', '鸡蛋可提前煮好冷藏'],
    },
    {
      title: '全麦三明治配牛奶',
      description: '适合赶时间的工作日早餐，准备快、执行门槛低。',
      ingredients: [
        { name: '全麦面包', amount: 4, unit: '片' },
        { name: '鸡胸火腿', amount: 90, unit: 'g' },
        { name: '生菜', amount: 60, unit: 'g' },
        { name: '纯牛奶', amount: 300, unit: 'ml' },
      ],
      alternatives: ['鸡胸火腿可换金枪鱼罐头 100g', '纯牛奶可换无糖酸奶 200g'],
      prepTips: ['面包提前冷冻分装，早上烤 2 分钟即可', '生菜洗好沥干后冷藏'],
    },
    {
      title: '红薯鸡蛋豆浆组合',
      description: '训练日前的稳态碳水早餐，饱腹感和能量释放都更平衡。',
      ingredients: [
        { name: '蒸红薯', amount: 220, unit: 'g' },
        { name: '鸡蛋', amount: 2, unit: '个' },
        { name: '无糖豆浆', amount: 350, unit: 'ml' },
        { name: '圣女果', amount: 120, unit: 'g' },
      ],
      alternatives: ['红薯可换玉米 2 根', '豆浆可换高蛋白酸奶 200g'],
      prepTips: ['红薯一次蒸 2 到 3 天的量', '如果上午训练，早餐提前 90 分钟吃完'],
    },
    {
      title: '鸡蛋蔬菜卷饼',
      description: '偏中式的早餐模板，碳水、蛋白和蔬菜一次补齐。',
      ingredients: [
        { name: '全麦卷饼', amount: 2, unit: '张' },
        { name: '鸡蛋', amount: 2, unit: '个' },
        { name: '生菜', amount: 80, unit: 'g' },
        { name: '番茄', amount: 100, unit: 'g' },
      ],
      alternatives: ['卷饼可换全麦吐司 4 片', '鸡蛋可换低脂牛肉 90g'],
      prepTips: ['提前把卷饼和蔬菜分装', '用不粘锅少油煎蛋，控制总油脂'],
    },
    {
      title: '燕麦奶昔配水煮蛋',
      description: '适合晨间食欲不高的人，液体早餐更容易执行。',
      ingredients: [
        { name: '香蕉', amount: 1, unit: '根' },
        { name: '燕麦', amount: 50, unit: 'g' },
        { name: '纯牛奶', amount: 300, unit: 'ml' },
        { name: '鸡蛋', amount: 2, unit: '个' },
      ],
      alternatives: ['香蕉可换芒果 150g', '纯牛奶可换无糖豆浆 350ml'],
      prepTips: ['奶昔打好后 30 分钟内喝完口感更好', '水煮蛋可提前两天备好'],
    },
    {
      title: '玉米鸡蛋酸奶杯',
      description: '低负担早餐模板，适合休息日或轻活动日。',
      ingredients: [
        { name: '玉米', amount: 2, unit: '根' },
        { name: '鸡蛋', amount: 2, unit: '个' },
        { name: '无糖酸奶', amount: 200, unit: 'g' },
        { name: '黄瓜', amount: 120, unit: 'g' },
      ],
      alternatives: ['玉米可换紫薯 200g', '酸奶可换低糖豆乳 300ml'],
      prepTips: ['玉米提前蒸熟冷藏', '休息日早餐不需要额外加油脂'],
    },
    {
      title: '小米南瓜粥配鸡蛋',
      description: '周末恢复型早餐，口感更柔和，方便连续执行。',
      ingredients: [
        { name: '小米南瓜粥', amount: 350, unit: 'ml' },
        { name: '鸡蛋', amount: 2, unit: '个' },
        { name: '苹果', amount: 1, unit: '个' },
        { name: '无糖豆浆', amount: 250, unit: 'ml' },
      ],
      alternatives: ['苹果可换梨 1 个', '小米粥可换燕麦粥 300ml'],
      prepTips: ['小米粥提前预约电饭煲', '周末早餐避免油条、酥点这类高油配餐'],
    },
  ],
  lunch: [
    {
      title: '鸡胸肉糙米饭盒',
      description: '标准高蛋白午餐模板，适合作为训练日主餐。',
      ingredients: [
        { name: '鸡胸肉', amount: 180, unit: 'g' },
        { name: '糙米饭', amount: 180, unit: 'g' },
        { name: '西兰花', amount: 180, unit: 'g' },
        { name: '胡萝卜', amount: 80, unit: 'g' },
      ],
      alternatives: ['鸡胸肉可换虾仁 180g', '糙米饭可换土豆 250g'],
      prepTips: ['午餐建议提前备餐，避免临时外卖失控', '鸡胸肉可一次做 2 餐份'],
    },
    {
      title: '番茄牛肉盖饭',
      description: '兼顾铁元素和碳水补给，适合中高训练量日。',
      ingredients: [
        { name: '瘦牛肉', amount: 170, unit: 'g' },
        { name: '米饭', amount: 200, unit: 'g' },
        { name: '番茄', amount: 180, unit: 'g' },
        { name: '生菜', amount: 120, unit: 'g' },
      ],
      alternatives: ['瘦牛肉可换去皮鸡腿肉 180g', '米饭可换意面 160g'],
      prepTips: ['番茄先炒出汁，少放糖', '午餐主食建议和蛋白一起吃完，别只吃菜'],
    },
    {
      title: '虾仁藜麦沙拉碗',
      description: '清爽型午餐模板，适合休息日控制油脂摄入。',
      ingredients: [
        { name: '虾仁', amount: 180, unit: 'g' },
        { name: '熟藜麦', amount: 160, unit: 'g' },
        { name: '生菜', amount: 120, unit: 'g' },
        { name: '牛油果', amount: 60, unit: 'g' },
      ],
      alternatives: ['虾仁可换金枪鱼 150g', '藜麦可换玉米粒 150g'],
      prepTips: ['牛油果控制在半个以内，避免脂肪过量', '酱汁优先选黑胡椒或油醋'],
    },
    {
      title: '清蒸鱼配米饭时蔬',
      description: '家庭场景稳定模板，蛋白足、油脂低、恢复压力小。',
      ingredients: [
        { name: '鲈鱼', amount: 220, unit: 'g' },
        { name: '米饭', amount: 180, unit: 'g' },
        { name: '上海青', amount: 180, unit: 'g' },
        { name: '香菇', amount: 80, unit: 'g' },
      ],
      alternatives: ['鲈鱼可换鳕鱼 200g', '米饭可换紫薯 220g'],
      prepTips: ['蒸鱼时控制酱油和油量', '优先选择一荤一素一主食的固定结构'],
    },
    {
      title: '鸡腿肉南瓜能量盘',
      description: '偏高饱腹的午餐模板，适合下午活动多的日子。',
      ingredients: [
        { name: '去皮鸡腿肉', amount: 180, unit: 'g' },
        { name: '南瓜', amount: 250, unit: 'g' },
        { name: '芦笋', amount: 150, unit: 'g' },
        { name: '彩椒', amount: 120, unit: 'g' },
      ],
      alternatives: ['鸡腿肉可换牛里脊 160g', '南瓜可换山药 220g'],
      prepTips: ['如果训练安排在晚上，午餐南瓜份量可以保留', '彩椒和芦笋用喷雾油快炒即可'],
    },
    {
      title: '豆腐牛肉双蛋白菜饭',
      description: '更接近日常家常菜，适合需要提高顺手度的时候。',
      ingredients: [
        { name: '瘦牛肉', amount: 130, unit: 'g' },
        { name: '北豆腐', amount: 180, unit: 'g' },
        { name: '米饭', amount: 160, unit: 'g' },
        { name: '白菜', amount: 220, unit: 'g' },
      ],
      alternatives: ['牛肉可换鸡胸肉 160g', '北豆腐可换鸡蛋 2 个'],
      prepTips: ['豆腐先煎到定型再和牛肉同炒', '这类家常菜更适合家庭场景长期执行'],
    },
    {
      title: '照烧鸡胸意面',
      description: '周末变化款午餐，用不同主食提高持续执行意愿。',
      ingredients: [
        { name: '鸡胸肉', amount: 170, unit: 'g' },
        { name: '全麦意面', amount: 160, unit: 'g' },
        { name: '西蓝花', amount: 160, unit: 'g' },
        { name: '口蘑', amount: 100, unit: 'g' },
      ],
      alternatives: ['全麦意面可换米饭 180g', '鸡胸肉可换虾仁 170g'],
      prepTips: ['照烧汁薄薄挂味即可，不要加厚糖浆', '训练日午餐吃这类组合更容易补碳'],
    },
  ],
  dinner: [
    {
      title: '三文鱼紫薯晚餐盘',
      description: '晚餐以清淡蛋白和适量碳水为主，兼顾恢复和饱腹。',
      ingredients: [
        { name: '三文鱼', amount: 160, unit: 'g' },
        { name: '紫薯', amount: 220, unit: 'g' },
        { name: '芦笋', amount: 150, unit: 'g' },
        { name: '生菜', amount: 100, unit: 'g' },
      ],
      alternatives: ['三文鱼可换鳕鱼 180g', '紫薯可换糙米饭 160g'],
      prepTips: ['晚餐烹饪方式优先烤、蒸、煎', '训练后 1 小时内吃完更稳'],
    },
    {
      title: '番茄鸡胸意面',
      description: '训练后恢复模板，碳水和蛋白同时补，避免夜间乱吃。',
      ingredients: [
        { name: '鸡胸肉', amount: 170, unit: 'g' },
        { name: '全麦意面', amount: 150, unit: 'g' },
        { name: '番茄', amount: 180, unit: 'g' },
        { name: '菠菜', amount: 120, unit: 'g' },
      ],
      alternatives: ['鸡胸肉可换虾仁 180g', '意面可换米饭 170g'],
      prepTips: ['番茄基底更容易控制油脂', '如果训练结束太晚，主食减 20 到 30g 即可'],
    },
    {
      title: '牛肉菌菇烩饭',
      description: '恢复日晚餐模板，口味更重一点，但依旧控制油量。',
      ingredients: [
        { name: '瘦牛肉', amount: 150, unit: 'g' },
        { name: '米饭', amount: 160, unit: 'g' },
        { name: '口蘑', amount: 120, unit: 'g' },
        { name: '西葫芦', amount: 140, unit: 'g' },
      ],
      alternatives: ['瘦牛肉可换鸡腿肉 170g', '米饭可换南瓜 220g'],
      prepTips: ['菌菇先干煸再下牛肉，香味更足', '晚餐吃够蛋白，减少宵夜补偿'],
    },
    {
      title: '虾仁豆腐青菜锅',
      description: '偏轻量的晚餐模板，适合休息日晚间活动少的时候。',
      ingredients: [
        { name: '虾仁', amount: 180, unit: 'g' },
        { name: '嫩豆腐', amount: 180, unit: 'g' },
        { name: '青菜', amount: 220, unit: 'g' },
        { name: '玉米', amount: 1, unit: '根' },
      ],
      alternatives: ['虾仁可换巴沙鱼 200g', '玉米可换山药 180g'],
      prepTips: ['这类一锅煮晚餐最容易长期坚持', '休息日晚餐不要再额外叠高油调味'],
    },
    {
      title: '鸡腿肉藜麦温沙拉',
      description: '适合忙碌工作日的快速晚餐，做法简单但结构完整。',
      ingredients: [
        { name: '去皮鸡腿肉', amount: 170, unit: 'g' },
        { name: '熟藜麦', amount: 150, unit: 'g' },
        { name: '羽衣甘蓝', amount: 100, unit: 'g' },
        { name: '南瓜', amount: 150, unit: 'g' },
      ],
      alternatives: ['鸡腿肉可换鸡胸肉 170g', '藜麦可换糙米饭 150g'],
      prepTips: ['藜麦周初一次煮好分装', '训练日晚餐若还饿，可以加 1 份水果'],
    },
    {
      title: '清炒牛柳配杂粮饭',
      description: '家常型晚餐模板，适合想吃得更像正餐但又不失控的时候。',
      ingredients: [
        { name: '牛柳', amount: 150, unit: 'g' },
        { name: '杂粮饭', amount: 170, unit: 'g' },
        { name: '西兰花', amount: 150, unit: 'g' },
        { name: '木耳', amount: 80, unit: 'g' },
      ],
      alternatives: ['牛柳可换鸡胸肉 170g', '杂粮饭可换土豆 220g'],
      prepTips: ['牛柳用黑胡椒和少量生抽腌 10 分钟即可', '这类晚餐控制好饭量就很稳'],
    },
    {
      title: '鳕鱼土豆蔬菜盘',
      description: '周末恢复型晚餐，口感清爽，适合降低整日负担。',
      ingredients: [
        { name: '鳕鱼', amount: 180, unit: 'g' },
        { name: '土豆', amount: 220, unit: 'g' },
        { name: '花菜', amount: 180, unit: 'g' },
        { name: '胡萝卜', amount: 100, unit: 'g' },
      ],
      alternatives: ['鳕鱼可换虾仁 180g', '土豆可换米饭 160g'],
      prepTips: ['鳕鱼用柠檬和黑胡椒调味即可', '周末晚餐尽量不要边追剧边吃，避免超量'],
    },
  ],
};

const SCENE_GUIDANCE: Record<DietScene, { breakfast: string; lunch: string; dinner: string; prep: string }> = {
  canteen: {
    breakfast: '食堂早餐优先鸡蛋、豆浆、全麦主食，避开油条和甜面包。',
    lunch: '午餐按一份高蛋白、一份主食、两份蔬菜去选，优先蒸煮炖。',
    dinner: '晚餐主食根据训练量微调，不够时优先加米饭或土豆，不加奶茶。',
    prep: '如果食堂菜色波动大，提前准备一份无糖酸奶或蛋白奶兜底。',
  },
  dorm: {
    breakfast: '宿舍场景优先选择 10 分钟内能完成的组合，避免因为麻烦直接不吃。',
    lunch: '外卖优先搜轻食饭盒、简餐双拼，备注少油少酱。',
    dinner: '晚餐尽量固定时间吃完，减少夜宵和高糖零食补偿。',
    prep: '常备即食鸡胸肉、燕麦、酸奶、玉米和鸡蛋，执行会稳定很多。',
  },
  home: {
    breakfast: '家庭早餐重点是结构稳定，不需要每顿都做复杂花样。',
    lunch: '午餐用半盘蔬菜、四分之一主食、四分之一蛋白的结构最稳。',
    dinner: '家庭晚餐优先清蒸、炖煮、快炒，少做重油重糖菜。',
    prep: '每周固定一次买菜和分装，能显著降低执行波动。',
  },
};

function roundNumber(value: number) {
  return Math.max(1, Math.round(value));
}

function toDateOnlyString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStartDate(date: Date) {
  const cloned = new Date(date.toISOString());
  const day = cloned.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  cloned.setUTCDate(cloned.getUTCDate() + diff);
  cloned.setUTCHours(0, 0, 0, 0);
  return cloned;
}

function getTrainingWeekdays(days: number): number[] {
  const normalized = Math.max(0, Math.min(days, 7));
  const presets: Record<number, number[]> = {
    0: [],
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };

  return presets[normalized];
}

function getSceneLabel(scene: DietScene) {
  return getDisplayDietSceneLabel(scene);
}

function getGoalLabel(goalType: TargetType) {
  const labels: Record<TargetType, string> = {
    cut: '减脂',
    maintain: '维持',
    bulk: '增肌',
  };

  return labels[goalType];
}

function buildDailyTargets(nutrition: NutritionTargets, dayType: WeeklyDayType): MacroTargets {
  const calorieTarget = nutrition.calorieTarget + DAY_CALORIE_ADJUSTMENT[dayType];
  const proteinTargetG = nutrition.proteinTargetG + (dayType === 'training' ? 6 : 0);
  const carbTargetG = Math.max(90, nutrition.carbTargetG + (dayType === 'training' ? 20 : -15));
  const fatTargetG = Math.max(35, nutrition.fatTargetG + (dayType === 'training' ? -2 : 4));

  return {
    calories: calorieTarget,
    proteinG: proteinTargetG,
    carbG: carbTargetG,
    fatG: fatTargetG,
  };
}

function buildMealNutrition(targets: MacroTargets, dayType: WeeklyDayType, mealType: WeeklyMealType): MacroTargets {
  const ratio = MEAL_RATIOS[dayType][mealType];

  return {
    calories: roundNumber(targets.calories * ratio),
    proteinG: roundNumber(targets.proteinG * ratio),
    carbG: roundNumber(targets.carbG * ratio),
    fatG: roundNumber(targets.fatG * ratio),
  };
}

function scaleIngredients(ingredients: IngredientTemplate[], factor: number): WeeklyDietIngredientResult[] {
  return ingredients.map((item) => ({
    name: item.name,
    unit: item.unit,
    amount: item.unit === '个' || item.unit === '根' ? Math.max(1, Math.round(item.amount * factor)) : roundNumber(item.amount * factor),
  }));
}

function buildMealGuidance(
  scene: DietScene,
  goalType: TargetType,
  dayType: WeeklyDayType,
  mealType: WeeklyMealType,
  nutrition: MacroTargets,
) {
  const sceneGuide = SCENE_GUIDANCE[scene][mealType];
  const goalGuide =
    goalType === 'cut'
      ? '当前目标是减脂，优先保证蛋白，再控制额外烹饪油和隐藏糖分。'
      : goalType === 'bulk'
        ? '当前目标是增肌，主食不要吃得太保守，训练日前后尤其要把碳水吃够。'
        : '当前目标是维持，重点是稳定执行，不要在工作日和周末之间大起大落。';
  const dayGuide =
    dayType === 'training'
      ? `今天是训练日，这餐优先把蛋白吃满，并保证大约 ${nutrition.carbG}g 碳水支持恢复。`
      : `今天是恢复日，这餐保持结构完整即可，避免因为活动少就直接不吃主食。`;

  return [sceneGuide, goalGuide, dayGuide];
}

function buildMealDetail(
  profile: RuleProfileInput,
  targets: MacroTargets,
  dayType: WeeklyDayType,
  mealType: WeeklyMealType,
  templateIndex: number,
): WeeklyDietMealDetailResult {
  const template = MEAL_LIBRARY[mealType][templateIndex % MEAL_LIBRARY[mealType].length];
  const nutrition = buildMealNutrition(targets, dayType, mealType);
  const ingredientFactor =
    profile.targetType === 'bulk' ? 1.08 : profile.targetType === 'cut' && mealType !== 'breakfast' ? 0.95 : 1;

  return {
    mealType,
    title: template.title,
    description: `${getSceneLabel(profile.dietScene)}场景下的${template.description}`,
    ingredients: scaleIngredients(template.ingredients, ingredientFactor),
    nutrition,
    alternatives: template.alternatives,
    guidance: buildMealGuidance(profile.dietScene, profile.targetType, dayType, mealType, nutrition),
    prepTips: [...template.prepTips, SCENE_GUIDANCE[profile.dietScene].prep],
  };
}

export function generateWeeklyDietPlan(
  profile: RuleProfileInput,
  nutrition: NutritionTargets,
  date = new Date(),
): WeeklyDietPlanResult {
  const weekStartDate = getWeekStartDate(date);
  const trainingWeekdays = getTrainingWeekdays(profile.trainingDaysPerWeek);
  const days: WeeklyDietDayResult[] = Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(weekStartDate.toISOString());
    currentDate.setUTCDate(currentDate.getUTCDate() + index);
    const weekday = currentDate.getUTCDay();
    const dayType: WeeklyDayType = trainingWeekdays.includes(weekday) ? 'training' : 'rest';
    const dailyTargets = buildDailyTargets(nutrition, dayType);

    return {
      date: toDateOnlyString(currentDate),
      weekday: WEEKDAY_LABELS[weekday],
      dayType,
      dailyTargets,
      meals: {
        breakfast: buildMealDetail(profile, dailyTargets, dayType, 'breakfast', index),
        lunch: buildMealDetail(profile, dailyTargets, dayType, 'lunch', index),
        dinner: buildMealDetail(profile, dailyTargets, dayType, 'dinner', index),
      },
    };
  });

  const weekEndDate = new Date(weekStartDate.toISOString());
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

  return {
    weekStartDate: toDateOnlyString(weekStartDate),
    weekEndDate: toDateOnlyString(weekEndDate),
    goalType: profile.targetType,
    dietScene: profile.dietScene,
    displayScene: getDisplayDietScene(profile.dietScene),
    summary: `${getSceneLabel(profile.dietScene)}${getGoalLabel(profile.targetType)}周计划：训练日优先补足蛋白和碳水，恢复日控制油脂波动，保持一周七天都能执行。`,
    days,
  };
}
