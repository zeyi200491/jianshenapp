import type {
  DashboardMetrics,
  DietTemplate,
  GoalType,
  Product,
  ProductStatus,
  TemplateStatus,
  TrainingTemplate,
  WeeklyTrainingTemplate,
  UserFeedback,
} from "@/lib/contracts";
import { applyTrainingItemRule } from "@/lib/training-template-rules";
import { toSlug } from "@/lib/utils";

type TemplateFilters = {
  keyword?: string;
  status?: TemplateStatus | "all";
  scene?: string;
  goalType?: GoalType | "all";
};

type TrainingFilters = {
  keyword?: string;
  status?: TemplateStatus | "all";
  splitType?: string;
  experienceLevel?: string;
};

type WeeklyTrainingFilters = {
  keyword?: string;
  status?: TemplateStatus | "all";
  experienceLevel?: string;
  goalType?: GoalType | "all";
};

type ProductFilters = {
  keyword?: string;
  status?: ProductStatus | "all";
  category?: string;
  sceneTag?: string;
  targetTag?: string;
};

type FeedbackFilters = {
  keyword?: string;
  status?: string;
  channel?: string;
  sentiment?: string;
};

const now = "2026-03-27T10:00:00.000Z";

let dietTemplates: DietTemplate[] = [
  {
    id: "diet_tpl_001",
    name: "食堂减脂基础版",
    scene: "canteen",
    goalType: "cut",
    status: "active",
    version: "v1.2.0",
    summary: "适合大学食堂场景，强调高蛋白和低油选择，降低执行复杂度。",
    tags: ["高蛋白", "食堂党", "减脂"],
    supplementNotes: "默认仅建议乳清蛋白作为补充，不替代正餐。",
    createdAt: now,
    updatedAt: now,
    meals: [
      {
        mealType: "breakfast",
        title: "高蛋白早餐",
        targetCalories: 450,
        proteinG: 28,
        carbsG: 48,
        fatG: 12,
        suggestionText: "鸡蛋 2 个 + 无糖豆浆 + 全麦面包 + 香蕉。",
        alternatives: ["茶叶蛋 + 玉米 + 低糖酸奶", "鸡胸三明治 + 牛奶"],
      },
      {
        mealType: "lunch",
        title: "食堂主餐",
        targetCalories: 700,
        proteinG: 42,
        carbsG: 78,
        fatG: 18,
        suggestionText: "米饭半碗 + 清炒蔬菜 + 鸡胸/牛肉 + 番茄鸡蛋。",
        alternatives: ["盖浇饭少饭版 + 加青菜", "砂锅类去肥肉版本"],
      },
      {
        mealType: "dinner",
        title: "轻负担晚餐",
        targetCalories: 620,
        proteinG: 38,
        carbsG: 60,
        fatG: 16,
        suggestionText: "杂粮饭 + 豆腐/鱼类 + 两份蔬菜。",
        alternatives: ["轻食碗 + 加蛋白", "麻辣烫少丸子多蔬菜"],
      },
    ],
  },
  {
    id: "diet_tpl_002",
    name: "宿舍增肌简做版",
    scene: "dorm",
    goalType: "bulk",
    status: "draft",
    version: "v0.9.0",
    summary: "用微波炉和基础电器解决增肌期高热量需求，适合宿舍简做。",
    tags: ["宿舍简做", "增肌", "高热量"],
    supplementNotes: "可选乳清蛋白和肌酸，先保证主食与蛋白摄入。",
    createdAt: now,
    updatedAt: now,
    meals: [
      {
        mealType: "breakfast",
        title: "快速能量早餐",
        targetCalories: 650,
        proteinG: 32,
        carbsG: 85,
        fatG: 18,
        suggestionText: "燕麦 + 牛奶 + 花生酱 + 水煮蛋。",
        alternatives: ["即食麦片 + 蛋白奶", "面包 + 金枪鱼罐头 + 酸奶"],
      },
      {
        mealType: "snack",
        title: "训练后加餐",
        targetCalories: 380,
        proteinG: 26,
        carbsG: 42,
        fatG: 8,
        suggestionText: "乳清蛋白 + 香蕉 + 面包。",
        alternatives: ["常温奶 + 蛋白棒", "酸奶 + 玉米"],
      },
    ],
  },
];

let trainingTemplates: TrainingTemplate[] = [
  {
    id: "training_tpl_001",
    name: "新手全身 A",
    splitType: "full_body",
    goalType: "cut",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    status: "active",
    version: "v1.1.0",
    durationMinutes: 55,
    intensityLevel: "medium",
    focusTags: ["新手", "全身", "器械友好"],
    notes: "优先建立动作模式和训练节奏，保留 1-2 次力竭余量。",
    createdAt: now,
    updatedAt: now,
    items: [
      {
        exerciseCode: "goblet_squat",
        exerciseName: "高脚杯深蹲",
        sets: 4,
        reps: "10-12",
        restSeconds: 90,
        notes: "下蹲时保持核心收紧，膝盖方向与脚尖一致。",
      },
      {
        exerciseCode: "lat_pulldown",
        exerciseName: "高位下拉",
        sets: 4,
        reps: "10-12",
        restSeconds: 75,
        notes: "先收肩胛再发力，避免借力后仰。",
      },
      {
        exerciseCode: "db_bench_press",
        exerciseName: "哑铃卧推",
        sets: 3,
        reps: "10-12",
        restSeconds: 90,
        notes: "下放控制节奏，感受胸部发力。",
      },
    ],
  },
  {
    id: "training_tpl_002",
    name: "中级 Push 日",
    splitType: "push_pull_legs",
    goalType: "bulk",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    status: "active",
    version: "v1.0.3",
    durationMinutes: 70,
    intensityLevel: "high",
    focusTags: ["中级", "增肌", "推拉腿"],
    notes: "主项优先使用双进阶策略，辅助项控制离心节奏。",
    createdAt: now,
    updatedAt: now,
    items: [
      {
        exerciseCode: "barbell_bench_press",
        exerciseName: "杠铃卧推",
        sets: 5,
        reps: "5-8",
        restSeconds: 120,
        notes: "主项重视稳定性，肩胛后缩下沉。",
      },
      {
        exerciseCode: "incline_db_press",
        exerciseName: "上斜哑铃卧推",
        sets: 4,
        reps: "8-10",
        restSeconds: 90,
        notes: "上斜角度不要过大，避免前三角代偿。",
      },
    ],
  },
];

let weeklyTrainingTemplates: WeeklyTrainingTemplate[] = [
  {
    id: "weekly_training_tpl_001",
    name: "五练两休进阶周模板",
    goalType: "bulk",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    status: "active",
    version: "v1.0.0",
    intensityLevel: "high",
    focusTags: ["胸肩三头", "背二头", "腿部", "五练两休"],
    notes: "按固定周节奏执行。系统默认按复合/孤立动作给休息时间，手动改动后不再自动覆盖。",
    createdAt: now,
    updatedAt: now,
    weekDays: [
      { weekday: "monday", dayType: "rest", title: "休息", notes: "休息日，安排步行和轻度拉伸恢复。", items: [] },
      {
        weekday: "tuesday",
        dayType: "training",
        title: "胸 / 肩 / 三头",
        notes: "主项先做卧推，再补胸部和三头。",
        items: [
          applyTrainingItemRule({ exerciseCode: "barbell_bench_press", exerciseName: "杠铃卧推", sets: 4, reps: "8 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "dip", exerciseName: "自重臂屈伸", sets: 3, reps: "8 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "下胸" }),
          applyTrainingItemRule({ exerciseCode: "machine_triceps_pressdown", exerciseName: "器械臂屈伸下压", sets: 3, reps: "10 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "下胸" }),
          applyTrainingItemRule({ exerciseCode: "rope_pushdown", exerciseName: "龙门架绳索下压", sets: 3, reps: "12 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "三头外侧" }),
          applyTrainingItemRule({ exerciseCode: "dumbbell_triceps_extension", exerciseName: "哑铃臂屈伸", sets: 3, reps: "10 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "三头长头" }),
          applyTrainingItemRule({ exerciseCode: "dumbbell_fly", exerciseName: "哑铃飞鸟", sets: 3, reps: "递减组", restSeconds: 150, movementPattern: "isolation", restRuleSource: "manual", notes: "递减组（10 / 7.5 / 5）" }),
        ],
      },
      {
        weekday: "wednesday",
        dayType: "training",
        title: "背 / 二头",
        notes: "先做引体和下拉，再补划船和二头。",
        items: [
          applyTrainingItemRule({ exerciseCode: "pull_up", exerciseName: "引体向上", sets: 4, reps: "8 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "lat_pulldown", exerciseName: "宽距高位下拉", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "seated_row", exerciseName: "坐姿划船", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "single_arm_row", exerciseName: "单臂坐姿划船", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "dumbbell_row", exerciseName: "俯身哑铃划船", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "biceps_superset", exerciseName: "二头超级组", sets: 3, reps: "按计划执行", restSeconds: 150, movementPattern: "isolation", restRuleSource: "manual", notes: "超级组放备注，不做结构化拆分" }),
        ],
      },
      {
        weekday: "thursday",
        dayType: "training",
        title: "腿",
        notes: "深蹲和罗马尼亚硬拉走主项节奏。",
        items: [
          applyTrainingItemRule({ exerciseCode: "back_squat", exerciseName: "杠铃深蹲", sets: 4, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "romanian_deadlift", exerciseName: "罗马尼亚硬拉", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "push_press", exerciseName: "推举", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "与腿弯曲组合" }),
          applyTrainingItemRule({ exerciseCode: "leg_curl", exerciseName: "腿弯曲", sets: 3, reps: "15 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "与推举组合" }),
          applyTrainingItemRule({ exerciseCode: "leg_extension", exerciseName: "腿屈伸", sets: 3, reps: "15 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "" }),
        ],
      },
      { weekday: "friday", dayType: "rest", title: "休息", notes: "休息日，做简单散步和活动度恢复。", items: [] },
      {
        weekday: "saturday",
        dayType: "training",
        title: "胸 / 肩 / 三头",
        notes: "周六走更偏力量和肩后束补充的版本。",
        items: [
          applyTrainingItemRule({ exerciseCode: "barbell_bench_press", exerciseName: "杠铃卧推", sets: 5, reps: "5 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "dumbbell_bench_press", exerciseName: "哑铃卧推", sets: 3, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "pec_deck_fly", exerciseName: "蝴蝶机夹胸", sets: 3, reps: "12 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "reverse_pec_deck", exerciseName: "蝴蝶机飞鸟", sets: 3, reps: "12 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "肩后束" }),
          applyTrainingItemRule({ exerciseCode: "cable_reverse_fly", exerciseName: "龙门架绳索侧飞鸟", sets: 3, reps: "12 次", restSeconds: 150, movementPattern: "isolation", restRuleSource: "system", notes: "肩后束" }),
          applyTrainingItemRule({ exerciseCode: "fly_drop_set", exerciseName: "飞鸟递减组", sets: 3, reps: "递减组", restSeconds: 150, movementPattern: "isolation", restRuleSource: "manual", notes: "递减组" }),
        ],
      },
      {
        weekday: "sunday",
        dayType: "training",
        title: "背 / 二头",
        notes: "周天拉背强度略高，保持动作完整。",
        items: [
          applyTrainingItemRule({ exerciseCode: "pull_up", exerciseName: "引体向上", sets: 4, reps: "8 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "neutral_grip_lat_pulldown", exerciseName: "对握宽距高位下拉", sets: 4, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "machine_single_arm_pulldown", exerciseName: "器械单臂下拉", sets: 4, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "machine_row", exerciseName: "器械俯身划船", sets: 4, reps: "10 次", restSeconds: 210, movementPattern: "compound", restRuleSource: "system", notes: "" }),
          applyTrainingItemRule({ exerciseCode: "biceps_superset", exerciseName: "二头超级组", sets: 3, reps: "按计划执行", restSeconds: 150, movementPattern: "isolation", restRuleSource: "manual", notes: "超级组放备注，不做结构化拆分" }),
        ],
      },
    ],
  },
];

let products: Product[] = [
  {
    id: "prod_001",
    categoryId: "cat_001",
    categoryName: "基础补剂",
    categorySlug: "supplement",
    name: "CampusFit 乳清蛋白 1kg",
    subtitle: "适合课后快速补充蛋白质的基础款",
    description: "乳清蛋白浓缩配方，适合训练后或早餐蛋白不足时补充，MVP 阶段强调辅助属性，不鼓励替代正餐。",
    targetTags: ["增肌", "减脂"],
    sceneTags: ["canteen", "dorm", "home"],
    priceCents: 15900,
    coverImageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
    detailImages: [
      "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=800&q=80",
    ],
    status: "active",
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "prod_002",
    categoryId: "cat_002",
    categoryName: "轻器械",
    categorySlug: "gear",
    name: "弹力带三件套",
    subtitle: "宿舍和居家训练的低门槛搭档",
    description: "适合宿舍和居家训练，配合上肢激活、臀腿训练和拉伸恢复使用。",
    targetTags: ["维持", "减脂"],
    sceneTags: ["dorm", "home"],
    priceCents: 4900,
    coverImageUrl: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80",
    detailImages: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    ],
    status: "draft",
    sortOrder: 20,
    createdAt: now,
    updatedAt: now,
  },
];

let feedbackList: UserFeedback[] = [
  {
    id: "feedback_001",
    userId: "user_101",
    userNickname: "阿哲",
    channel: "checkin",
    sentiment: "positive",
    rating: 5,
    sourcePage: "今日页 / 打卡",
    content: "饮食计划比我自己查资料简单很多，食堂替代项也比较实用。",
    status: "reviewed",
    createdAt: "2026-03-26T14:20:00.000Z",
  },
  {
    id: "feedback_002",
    userId: "user_203",
    userNickname: "Mia",
    channel: "ai",
    sentiment: "neutral",
    rating: 3,
    sourcePage: "AI 助手",
    content: "AI 回复速度还可以，但希望能更明确区分训练日和休息日建议。",
    status: "open",
    createdAt: "2026-03-27T03:12:00.000Z",
  },
  {
    id: "feedback_003",
    userId: "user_312",
    userNickname: "北木",
    channel: "product",
    sentiment: "negative",
    rating: 2,
    sourcePage: "商品列表",
    content: "商品信息太少，看不出是否适合减脂期。",
    status: "open",
    createdAt: "2026-03-27T05:48:00.000Z",
  },
];

function includesKeyword(keyword: string | undefined, values: string[]) {
  if (!keyword) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(keyword.toLowerCase()));
}

export function listDietTemplates(filters: TemplateFilters) {
  return dietTemplates.filter((item) => {
    return (
      includesKeyword(filters.keyword, [item.name, item.summary, item.tags.join(" ")]) &&
      (filters.status === undefined || filters.status === "all" || item.status === filters.status) &&
      (filters.scene === undefined || filters.scene === "all" || item.scene === filters.scene) &&
      (filters.goalType === undefined || filters.goalType === "all" || item.goalType === filters.goalType)
    );
  });
}

export function getDietTemplate(id: string) {
  return dietTemplates.find((item) => item.id === id) ?? null;
}

export function createDietTemplate(
  payload: Omit<DietTemplate, "id" | "createdAt" | "updatedAt">,
) {
  const item: DietTemplate = {
    ...payload,
    id: `diet_tpl_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dietTemplates = [item, ...dietTemplates];
  return item;
}

export function updateDietTemplate(id: string, payload: Partial<DietTemplate>) {
  const target = getDietTemplate(id);
  if (!target) {
    return null;
  }

  const nextItem = {
    ...target,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  dietTemplates = dietTemplates.map((item) => (item.id === id ? nextItem : item));
  return nextItem;
}

export function listTrainingTemplates(filters: TrainingFilters) {
  return trainingTemplates.filter((item) => {
    return (
      includesKeyword(filters.keyword, [item.name, item.notes, item.focusTags.join(" ")]) &&
      (filters.status === undefined || filters.status === "all" || item.status === filters.status) &&
      (filters.splitType === undefined || filters.splitType === "all" || item.splitType === filters.splitType) &&
      (filters.experienceLevel === undefined ||
        filters.experienceLevel === "all" ||
        item.experienceLevel === filters.experienceLevel)
    );
  });
}

export function getTrainingTemplate(id: string) {
  return trainingTemplates.find((item) => item.id === id) ?? null;
}

export function createTrainingTemplate(
  payload: Omit<TrainingTemplate, "id" | "createdAt" | "updatedAt">,
) {
  const item: TrainingTemplate = {
    ...payload,
    id: `training_tpl_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  trainingTemplates = [item, ...trainingTemplates];
  return item;
}

export function updateTrainingTemplate(id: string, payload: Partial<TrainingTemplate>) {
  const target = getTrainingTemplate(id);
  if (!target) {
    return null;
  }

  const nextItem = {
    ...target,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  trainingTemplates = trainingTemplates.map((item) => (item.id === id ? nextItem : item));
  return nextItem;
}

export function listWeeklyTrainingTemplates(filters: WeeklyTrainingFilters) {
  return weeklyTrainingTemplates.filter((item) => {
    return (
      includesKeyword(filters.keyword, [item.name, item.notes, item.focusTags.join(" ")]) &&
      (filters.status === undefined || filters.status === "all" || item.status === filters.status) &&
      (filters.goalType === undefined || filters.goalType === "all" || item.goalType === filters.goalType) &&
      (filters.experienceLevel === undefined ||
        filters.experienceLevel === "all" ||
        item.experienceLevel === filters.experienceLevel)
    );
  });
}

export function getWeeklyTrainingTemplate(id: string) {
  return weeklyTrainingTemplates.find((item) => item.id === id) ?? null;
}

export function createWeeklyTrainingTemplate(
  payload: Omit<WeeklyTrainingTemplate, "id" | "createdAt" | "updatedAt">,
) {
  const item: WeeklyTrainingTemplate = {
    ...payload,
    weekDays: payload.weekDays.map((day) => ({
      ...day,
      items: day.items.map((trainingItem) => applyTrainingItemRule(trainingItem)),
    })),
    id: `weekly_training_tpl_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  weeklyTrainingTemplates = [item, ...weeklyTrainingTemplates];
  return item;
}

export function updateWeeklyTrainingTemplate(id: string, payload: Partial<WeeklyTrainingTemplate>) {
  const target = getWeeklyTrainingTemplate(id);
  if (!target) {
    return null;
  }

  const nextItem: WeeklyTrainingTemplate = {
    ...target,
    ...payload,
    weekDays: (payload.weekDays ?? target.weekDays).map((day) => ({
      ...day,
      items: day.items.map((trainingItem) => applyTrainingItemRule(trainingItem)),
    })),
    updatedAt: new Date().toISOString(),
  };

  weeklyTrainingTemplates = weeklyTrainingTemplates.map((item) => (item.id === id ? nextItem : item));
  return nextItem;
}

export function listProducts(filters: ProductFilters) {
  return products.filter((item) => {
    return (
      includesKeyword(filters.keyword, [item.name, item.subtitle, item.description]) &&
      (filters.status === undefined || filters.status === "all" || item.status === filters.status) &&
      (filters.category === undefined || filters.category === "all" || item.categorySlug === filters.category) &&
      (filters.sceneTag === undefined || filters.sceneTag === "all" || item.sceneTags.includes(filters.sceneTag)) &&
      (filters.targetTag === undefined || filters.targetTag === "all" || item.targetTags.includes(filters.targetTag))
    );
  });
}

export function getProduct(id: string) {
  return products.find((item) => item.id === id) ?? null;
}

export function createProduct(payload: Omit<Product, "id" | "createdAt" | "updatedAt" | "categoryId">) {
  const item: Product = {
    ...payload,
    id: `prod_${Date.now()}`,
    categoryId: `cat_${toSlug(payload.categorySlug) || Date.now().toString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products = [item, ...products];
  return item;
}

export function updateProduct(id: string, payload: Partial<Product>) {
  const target = getProduct(id);
  if (!target) {
    return null;
  }

  const nextItem = {
    ...target,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  products = products.map((item) => (item.id === id ? nextItem : item));
  return nextItem;
}

export function listFeedback(filters: FeedbackFilters) {
  return feedbackList.filter((item) => {
    return (
      includesKeyword(filters.keyword, [item.userNickname, item.content, item.sourcePage]) &&
      (filters.status === undefined || filters.status === "all" || item.status === filters.status) &&
      (filters.channel === undefined || filters.channel === "all" || item.channel === filters.channel) &&
      (filters.sentiment === undefined || filters.sentiment === "all" || item.sentiment === filters.sentiment)
    );
  });
}

export function getFeedback(id: string) {
  return feedbackList.find((item) => item.id === id) ?? null;
}

export function getDashboardMetrics(): DashboardMetrics {
  return {
    totalUsers: 2840,
    onboardingCompletionRate: 72,
    planViewRate: 81,
    checkInRate: 46,
    weeklyReviewReachRate: 39,
    aiUsageRate: 27,
    productClickRate: 18,
    activeDietTemplates: dietTemplates.filter((item) => item.status === "active").length,
    activeTrainingTemplates: trainingTemplates.filter((item) => item.status === "active").length,
    activeProducts: products.filter((item) => item.status === "active").length,
    topDietTemplates: [
      { id: "diet_tpl_001", name: "食堂减脂基础版", usageCount: 842 },
      { id: "diet_tpl_002", name: "宿舍增肌简做版", usageCount: 276 },
    ],
    topTrainingTemplates: [
      { id: "training_tpl_001", name: "新手全身 A", usageCount: 790 },
      { id: "training_tpl_002", name: "中级 Push 日", usageCount: 323 },
    ],
    latestFeedback: feedbackList.slice(0, 3),
  };
}
