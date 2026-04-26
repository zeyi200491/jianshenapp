import type { CheckInFormState } from './use-check-in-editor';

type ExistingRecordLike = {
  dietCompletionRate: number;
  trainingCompletionRate: number;
};

type TodayLike = {
  trainingPlan?: {
    title: string;
  } | null;
} | null;

const DAILY_ENCOURAGEMENTS = [
  '你今天的每一次选择，都在帮明天的自己省力。',
  '练得不必完美，先把今天完成。',
  '吃对一餐、动完一次，身体就会记住你的认真。',
  '别和别人比，今天比昨天稳一点就够了。',
  '你现在的坚持，正在悄悄改变状态。',
  '先完成，再优化，这就是进步的样子。',
  '今天多走一步，多稳一分。',
  '把计划做完，信心自然会回来。',
];

export function toOptionalNumber(value: string) {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatHeadlineDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function buildCompletionSummary(dietCompletionValue: number | null, trainingCompletionValue: number | null) {
  if (dietCompletionValue === null || trainingCompletionValue === null) {
    return null;
  }

  return Math.round((dietCompletionValue + trainingCompletionValue) / 2);
}

export function buildDailyEncouragement(date: string) {
  const normalized = date.replaceAll('-', '');

  if (!/^\d{8}$/.test(normalized)) {
    return DAILY_ENCOURAGEMENTS[0];
  }

  const index = Number(normalized) % DAILY_ENCOURAGEMENTS.length;
  return DAILY_ENCOURAGEMENTS[index];
}

export function buildReadinessState(
  existingRecord: ExistingRecordLike | null,
  energyLevelValue: number | null,
  satietyLevelValue: number | null,
  fatigueLevelValue: number | null,
) {
  if (existingRecord) {
    return {
      value: '已同步',
      detail: `当前展示的是已提交的真实打卡记录：饮食完成度 ${existingRecord.dietCompletionRate}%，训练完成度 ${existingRecord.trainingCompletionRate}%。`,
      kind: 'actual' as const,
    };
  }

  if (energyLevelValue === null || satietyLevelValue === null || fatigueLevelValue === null) {
    return {
      value: '待填写',
      detail: '还没有真实打卡记录，也还没填完核心体感字段，因此这里不显示合成就绪分数。',
      kind: 'placeholder' as const,
    };
  }

  return {
    value: '填写中',
    detail: '当前只是你正在编辑的打卡表单状态。只有提交后，数据才会变成真实记录并同步到今日页与周复盘。',
    kind: 'explained' as const,
  };
}

export function buildCoachTip(form: Pick<CheckInFormState, 'energyLevel' | 'fatigueLevel' | 'waterIntakeMl' | 'trainingCompletionRate'>, today: TodayLike) {
  const energy = toOptionalNumber(form.energyLevel);
  const fatigue = toOptionalNumber(form.fatigueLevel);
  const water = toOptionalNumber(form.waterIntakeMl);
  const trainingRate = toOptionalNumber(form.trainingCompletionRate);

  if (energy === null || fatigue === null || trainingRate === null) {
    return '还没有形成真实打卡记录，先把饮食、训练和体感字段填完整；提交后这里再基于真实数据给建议。';
  }

  if (water !== null && water < 2400) {
    return '今天你在水分摄入方面还可以再推进一点。先补足 600ml 水，再完成剩余记录，恢复状态会更平稳。';
  }

  if (energy >= 4 && fatigue <= 2 && trainingRate < 100) {
    return `就绪状态处于峰值，建议把 ${today?.trainingPlan?.title ?? '今日训练'} 的最后一组高质量完成，再提交打卡。`;
  }

  if (fatigue >= 4) {
    return '疲劳感偏高，建议在备注里写明原因，方便周复盘时识别恢复问题。';
  }

  return '你的整体状态不错，优先完成饮食与训练完成度记录，这会直接影响后续 AI 建议质量。';
}
