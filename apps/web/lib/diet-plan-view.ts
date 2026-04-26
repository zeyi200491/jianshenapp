import type { DietPlanMealView, MealFoodSearchResult, TodayPayload, WeeklyDietDay } from "./api";

export type ViewStateKind = "actual" | "placeholder" | "explained";

export type ViewState = {
  value: string;
  detail: string;
  kind: ViewStateKind;
};

export function buildDayLabel(day: Pick<WeeklyDietDay, "weekday" | "date">) {
  return `${day.weekday} ${day.date.slice(5)}`;
}

export function formatNutritionLine(nutrition: {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}) {
  return `${nutrition.calories} kcal / 蛋白 ${nutrition.proteinG}g / 碳水 ${nutrition.carbG}g / 脂肪 ${nutrition.fatG}g`;
}

export function buildMealState(
  payload: Pick<TodayPayload, "date"> | null,
  selectedDay: Pick<WeeklyDietDay, "date"> | null,
  todayMealView: Pick<DietPlanMealView, "actual"> | null,
): ViewState {
  if (!payload || !selectedDay) {
    return {
      value: "待选择",
      detail: "先选择日期和餐次，右侧才会出现真实餐次详情。",
      kind: "placeholder",
    };
  }

  if (selectedDay.date !== payload.date) {
    return {
      value: "计划态",
      detail: "当前查看的是周菜单中的计划餐次，还没有今日实际摄入覆盖。",
      kind: "explained",
    };
  }

  if (todayMealView?.actual) {
    return {
      value: "已记录",
      detail: `当前餐次已经记录真实摄入：${todayMealView.actual.title}。`,
      kind: "actual",
    };
  }

  return {
    value: "待替换",
    detail: "今天这餐还没有记录实际摄入，目前显示的是后端生成的计划版本。",
    kind: "explained",
  };
}

export function buildSearchState(
  query: string,
  searching: boolean,
  searchError: string,
  results: Pick<MealFoodSearchResult, "code">[],
  canSyncToday: boolean,
): ViewState {
  if (!canSyncToday) {
    return {
      value: "仅预览",
      detail: "你现在查看的不是今天，因此这里仅做替换预览，不会回写实际摄入。",
      kind: "placeholder",
    };
  }

  if (searching) {
    return {
      value: "搜索中",
      detail: "正在从可用食物库中匹配更贴近当前场景的替换项。",
      kind: "explained",
    };
  }

  if (searchError) {
    return {
      value: "需处理",
      detail: searchError,
      kind: "explained",
    };
  }

  if (!query.trim()) {
    return {
      value: "待搜索",
      detail: "输入 2 个字以上的食物关键词后，这里会给出真实搜索状态。",
      kind: "placeholder",
    };
  }

  if (results.length > 0) {
    return {
      value: "有结果",
      detail: `已命中 ${results.length} 条候选，可直接替换今天这餐的实际摄入。`,
      kind: "actual",
    };
  }

  return {
    value: "无匹配",
    detail: "当前场景下没有匹配项，建议尝试更通用的食物名，或让后台补充可用食物库。",
    kind: "explained",
  };
}

export function mergeUnique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}
