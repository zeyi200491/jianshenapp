export const goalTypeOptions = [
  { label: "全部目标", value: "all" },
  { label: "减脂", value: "cut" },
  { label: "维持", value: "maintain" },
  { label: "增肌", value: "bulk" },
];

export const templateStatusOptions = [
  { label: "全部状态", value: "all" },
  { label: "草稿", value: "draft" },
  { label: "已启用", value: "active" },
  { label: "已停用", value: "inactive" },
];

export const templateStatusLabelMap = {
  draft: "草稿",
  active: "已启用",
  inactive: "已停用",
} as const;

export const dietSceneOptions = [
  { label: "全部场景", value: "all" },
  { label: "食堂", value: "canteen" },
  { label: "宿舍简做", value: "dorm" },
  { label: "家庭烹饪", value: "home" },
];

export const splitTypeOptions = [
  { label: "全部分化", value: "all" },
  { label: "全身", value: "full_body" },
  { label: "上下肢", value: "upper_lower" },
  { label: "推拉腿", value: "push_pull_legs" },
  { label: "休息", value: "rest" },
];

export const experienceOptions = [
  { label: "全部经验", value: "all" },
  { label: "新手", value: "beginner" },
  { label: "中级", value: "intermediate" },
];

export const intensityOptions = [
  { label: "低强度", value: "low" },
  { label: "中强度", value: "medium" },
  { label: "高强度", value: "high" },
];

export const productCategoryOptions = [
  { label: "全部分类", value: "all" },
  { label: "基础补剂", value: "supplement" },
  { label: "轻器械", value: "gear" },
  { label: "轻食代餐", value: "meal" },
];

export const foodLibraryStatusOptions = [
  { label: "全部状态", value: "all" },
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
];

export const foodLibraryStatusLabelMap = {
  active: "启用",
  inactive: "停用",
} as const;

export const foodLibraryStatusSelectionOptions = foodLibraryStatusOptions.filter((option) => option.value !== "all");

export const foodLibrarySceneOptions = [
  { label: "全部场景", value: "all" },
  { label: "食堂", value: "canteen" },
  { label: "可烹饪", value: "cookable" },
];

export const foodLibrarySceneLabelMap = {
  canteen: "食堂",
  cookable: "可烹饪",
} as const;

export const foodLibrarySceneSelectionOptions = foodLibrarySceneOptions.filter((option) => option.value !== "all");

export const foodLibraryMealTypeOptions = [
  { label: "全部餐次", value: "all" },
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
];

export const foodLibraryMealTypeLabelMap = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
} as const;

export const foodLibraryMealTypeSelectionOptions = foodLibraryMealTypeOptions.filter((option) => option.value !== "all");

export const productTargetTagOptions = [
  { label: "全部目标", value: "all" },
  { label: "减脂", value: "减脂" },
  { label: "维持", value: "维持" },
  { label: "增肌", value: "增肌" },
];

export const sceneTagOptions = [
  { label: "全部场景", value: "all" },
  { label: "食堂", value: "canteen" },
  { label: "宿舍", value: "dorm" },
  { label: "家庭", value: "home" },
];

export const feedbackStatusOptions = [
  { label: "全部状态", value: "all" },
  { label: "待处理", value: "open" },
  { label: "已查看", value: "reviewed" },
  { label: "已关闭", value: "closed" },
];

export const feedbackChannelOptions = [
  { label: "全部来源", value: "all" },
  { label: "打卡", value: "checkin" },
  { label: "AI 助手", value: "ai" },
  { label: "商品页", value: "product" },
  { label: "周复盘", value: "weekly_review" },
];

export const sentimentOptions = [
  { label: "全部情绪", value: "all" },
  { label: "正向", value: "positive" },
  { label: "中性", value: "neutral" },
  { label: "负向", value: "negative" },
];

export const mealTypeOptions = [
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
  { label: "加餐", value: "snack" },
];
