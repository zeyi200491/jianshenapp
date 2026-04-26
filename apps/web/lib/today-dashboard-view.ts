import type { OnboardingPayload, TodayPayload, TrainingFocus } from './api';

export type HeroMetric = {
  label: string;
  value: string;
  accent?: boolean;
};

export type MacroMetric = {
  label: string;
  value: string;
  percent: number;
};

export type CheckInInsight = {
  title: string;
  value: string;
  detail: string;
  kind: 'actual' | 'placeholder';
};

export type FocusMeta = {
  areas: string;
  description: string;
};

export type FocusOption = FocusMeta & {
  focus: TrainingFocus;
  label: string;
};

export function formatTargetType(value?: OnboardingPayload['targetType']) {
  if (value === 'cut') return '减脂';
  if (value === 'bulk') return '增肌';
  return '维持';
}

export function formatProfileList(values: string[] | undefined, emptyLabel: string) {
  if (!values || values.length === 0) {
    return emptyLabel;
  }

  return values.join(' / ');
}

export function buildHeroMetrics(
  payload: Pick<TodayPayload, 'summary' | 'checkInStatus'> | null,
): HeroMetric[] {
  if (!payload) {
    return [];
  }

  return [
    { label: '热量目标', value: `${payload.summary.calorieTarget} kcal` },
    { label: '蛋白目标', value: `${payload.summary.proteinTargetG} g` },
    { label: '今日状态', value: payload.checkInStatus.hasCheckedIn ? '已打卡' : '待打卡', accent: true },
  ];
}

export function buildMacroSummary(
  payload: Pick<TodayPayload, 'summary'> | null,
): MacroMetric[] {
  if (!payload) {
    return [];
  }

  const totalMacroCalories =
    payload.summary.proteinTargetG * 4 + payload.summary.carbTargetG * 4 + payload.summary.fatTargetG * 9;
  const toPercent = (macroCalories: number) =>
    totalMacroCalories === 0 ? 0 : Math.min(100, Math.round((macroCalories / totalMacroCalories) * 100));

  return [
    { label: '蛋白质', value: `${payload.summary.proteinTargetG} g`, percent: toPercent(payload.summary.proteinTargetG * 4) },
    { label: '碳水化合物', value: `${payload.summary.carbTargetG} g`, percent: toPercent(payload.summary.carbTargetG * 4) },
    { label: '脂肪', value: `${payload.summary.fatTargetG} g`, percent: toPercent(payload.summary.fatTargetG * 9) },
  ];
}

export function buildCheckInInsight(
  payload: Pick<TodayPayload, 'checkInStatus'> | null,
): CheckInInsight {
  if (!payload) {
    return {
      title: '打卡同步状态',
      value: '读取中',
      detail: '正在读取今天的真实打卡状态。',
      kind: 'placeholder',
    };
  }

  if (!payload.checkInStatus.hasCheckedIn) {
    return {
      title: '打卡同步状态',
      value: '待打卡',
      detail: '今天还没有真实打卡记录，因此这里不展示合成就绪分数，只保留状态说明。',
      kind: 'placeholder',
    };
  }

  return {
    title: '打卡同步状态',
    value: '已打卡',
    detail: `已同步真实打卡结果：饮食完成度 ${payload.checkInStatus.dietCompletionRate ?? '--'}%，训练完成度 ${payload.checkInStatus.trainingCompletionRate ?? '--'}%。`,
    kind: 'actual',
  };
}

export function buildFocusOptions(
  trainingFocusLabels: Record<TrainingFocus, string>,
  trainingFocusMeta: Record<TrainingFocus, FocusMeta>,
): FocusOption[] {
  return (Object.keys(trainingFocusLabels) as TrainingFocus[]).map((focus) => ({
    focus,
    label: trainingFocusLabels[focus],
    areas: trainingFocusMeta[focus].areas,
    description: trainingFocusMeta[focus].description,
  }));
}
