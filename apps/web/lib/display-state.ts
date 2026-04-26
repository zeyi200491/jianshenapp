import type { TodayPayload, WeeklyReviewPayload } from '@/lib/api';

export type DataStateKind = 'actual' | 'placeholder' | 'explained';

export type OverviewState = {
  label: string;
  value: string;
  detail: string;
  kind: DataStateKind;
};

export type TodayInsightState = {
  title: string;
  value: string;
  unit?: string;
  detail: string;
  kind: DataStateKind;
};

export type ReviewHeaderState = {
  title: string;
  description: string;
  exportReady: boolean;
};

export function getStateLabel(kind: DataStateKind) {
  if (kind === 'actual') return '真实数据';
  if (kind === 'explained') return '解释态';
  return '占位态';
}

export function getOverviewStates(): OverviewState[] {
  return [
    {
      label: '计划完整度',
      value: '登录后显示',
      detail: '只有在登录并生成今日训练和饮食计划后，这里才会展示真实完成情况。',
      kind: 'placeholder',
    },
    {
      label: '打卡闭环',
      value: '打卡后同步',
      detail: '闭环状态依赖每日打卡和周复盘数据，不再预填演示百分比。',
      kind: 'explained',
    },
  ];
}

export function formatWeekRange(startDate: string, endDate?: string | null) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate ?? startDate}T00:00:00.000Z`);

  const startLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(start);
  const endLabel = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

export function buildEnergyInsight(payload: TodayPayload | null): TodayInsightState {
  if (!payload) {
    return {
      title: '今日计划总量',
      value: '--',
      unit: 'kcal',
      detail: '正在读取今日饮食计划和营养目标。',
      kind: 'placeholder',
    };
  }

  if (!payload.dietPlan) {
    return {
      title: '今日计划总量',
      value: '待生成',
      detail: '饮食计划还没有生成，当前无法展示真实的餐次汇总值。',
      kind: 'placeholder',
    };
  }

  const calorieDelta = payload.effectiveDailyTotals.calories - payload.summary.calorieTarget;
  const hasActualMeal = payload.dietPlan.meals.some((item) => Boolean(item.actual));
  const deltaLabel =
    calorieDelta === 0
      ? '与目标一致'
      : calorieDelta > 0
        ? `较目标 +${calorieDelta} kcal`
        : `较目标 ${calorieDelta} kcal`;

  return {
    title: '今日计划总量',
    value: String(payload.effectiveDailyTotals.calories),
    unit: 'kcal',
    detail: hasActualMeal
      ? `后端已按你记录的实际摄入重算今日总量，当前${deltaLabel}。`
      : `当前展示的是后端生成的真实计划总量，尚未记录实际进食；${deltaLabel}。`,
    kind: 'actual',
  };
}

export function buildBurnRateInsight(payload: TodayPayload | null): TodayInsightState {
  if (!payload?.trainingPlan) {
    return {
      title: '训练计划规模',
      value: '待生成',
      detail: '训练计划还没有生成，当前无法展示真实动作和组数。',
      kind: 'placeholder',
    };
  }

  const totalSets = payload.trainingPlan.items.reduce((sum, item) => sum + item.sets, 0);

  return {
    title: '训练计划规模',
    value: String(totalSets),
    unit: '组',
    detail: `当前真实计划包含 ${payload.trainingPlan.items.length} 个动作，组数与休息时间均来自后端生成的今日计划。`,
    kind: 'actual',
  };
}

export function buildReadinessDetail(payload: TodayPayload | null) {
  if (!payload) {
    return {
      tag: '占位态',
      detail: '正在读取今日训练安排。',
      kind: 'placeholder' as DataStateKind,
    };
  }

  if (payload.checkInStatus.hasCheckedIn) {
    return {
      tag: '解释态',
      detail: '基于最近一次打卡完成度和今日训练安排估算，不包含心率、HRV 或睡眠设备数据。',
      kind: 'explained' as DataStateKind,
    };
  }

  return {
    tag: '解释态',
    detail: '你今天还没打卡，目前只按训练计划和循环状态给出基础估算。',
    kind: 'explained' as DataStateKind,
  };
}

export function buildHydrationInsight(payload: TodayPayload | null): TodayInsightState {
  if (!payload) {
    return {
      title: '今日饮水',
      value: '待同步',
      detail: '今日页正在读取上下文。',
      kind: 'placeholder',
    };
  }

  return {
    title: '今日饮水',
    value: payload.checkInStatus.hasCheckedIn ? '已打卡' : '待记录',
    detail: '今日页暂不直接保存饮水毫升数。完成每日打卡后，这里只标记同步状态，不伪装成具体升数。',
    kind: payload.checkInStatus.hasCheckedIn ? 'explained' : 'placeholder',
  };
}

export function buildReviewHeaderState(
  review: WeeklyReviewPayload['review'] | null,
  weekStartDate: string,
): ReviewHeaderState {
  if (!review) {
    return {
      title: `${formatWeekRange(weekStartDate)} 数据复盘`,
      description: '这里只有在本周复盘真实生成后，才会出现趋势总结和下周建议。',
      exportReady: false,
    };
  }

  return {
    title: `${formatWeekRange(review.weekStartDate, review.weekEndDate)} 数据复盘`,
    description: `本周完成 ${review.checkedInDays}/${review.planDays} 天打卡，饮食平均 ${review.avgDietCompletionRate}%，训练平均 ${review.avgTrainingCompletionRate}%。`,
    exportReady: true,
  };
}
