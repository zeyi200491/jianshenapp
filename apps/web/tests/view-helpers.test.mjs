import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCheckInInsight,
  buildFocusOptions,
  buildHeroMetrics,
  buildMacroSummary,
} from '../lib/today-dashboard-view.ts';
import {
  buildDayLabel,
  buildMealState,
  buildSearchState,
  formatNutritionLine,
  mergeUnique,
} from '../lib/diet-plan-view.ts';
import {
  buildCoachTip,
  buildCompletionSummary,
  buildDailyEncouragement,
  buildReadinessState,
  formatHeadlineDate,
  toOptionalNumber,
} from '../lib/check-in-view.ts';

test('today dashboard helpers build hero metrics and macro percentages from payload', () => {
  const payload = {
    summary: {
      calorieTarget: 2200,
      proteinTargetG: 165,
      carbTargetG: 220,
      fatTargetG: 60,
    },
    checkInStatus: {
      hasCheckedIn: true,
    },
  };

  assert.deepEqual(buildHeroMetrics(payload), [
    { label: '热量目标', value: '2200 kcal' },
    { label: '蛋白目标', value: '165 g' },
    { label: '今日状态', value: '已打卡', accent: true },
  ]);

  assert.deepEqual(buildMacroSummary(payload), [
    { label: '蛋白质', value: '165 g', percent: 32 },
    { label: '碳水化合物', value: '220 g', percent: 42 },
    { label: '脂肪', value: '60 g', percent: 26 },
  ]);
});

test('today dashboard helpers expose placeholder and actual check-in insight states', () => {
  assert.deepEqual(buildCheckInInsight(null), {
    title: '打卡同步状态',
    value: '读取中',
    detail: '正在读取今天的真实打卡状态。',
    kind: 'placeholder',
  });

  assert.deepEqual(
    buildCheckInInsight({
      checkInStatus: {
        hasCheckedIn: true,
        dietCompletionRate: 92,
        trainingCompletionRate: 100,
      },
    }),
    {
      title: '打卡同步状态',
      value: '已打卡',
      detail: '已同步真实打卡结果：饮食完成度 92%，训练完成度 100%。',
      kind: 'actual',
    },
  );
});

test('today dashboard helpers map focus metadata into panel options', () => {
  assert.deepEqual(
    buildFocusOptions(
      { push: '推日', pull: '拉日', legs: '腿日' },
      {
        push: { areas: '胸 / 肩 / 三头', description: '推日说明' },
        pull: { areas: '背 / 后束 / 二头', description: '拉日说明' },
        legs: { areas: '臀 / 腿 / 核心', description: '腿日说明' },
      },
    ),
    [
      { focus: 'push', label: '推日', areas: '胸 / 肩 / 三头', description: '推日说明' },
      { focus: 'pull', label: '拉日', areas: '背 / 后束 / 二头', description: '拉日说明' },
      { focus: 'legs', label: '腿日', areas: '臀 / 腿 / 核心', description: '腿日说明' },
    ],
  );
});

test('diet plan helpers build labels, state cards and deduplicated guidance', () => {
  assert.equal(buildDayLabel({ weekday: '周二', date: '2026-04-21' }), '周二 04-21');
  assert.equal(
    formatNutritionLine({ calories: 520, proteinG: 35, carbG: 48, fatG: 16 }),
    '520 kcal / 蛋白 35g / 碳水 48g / 脂肪 16g',
  );

  assert.deepEqual(
    buildMealState(null, null, null),
    {
      value: '待选择',
      detail: '先选择日期和餐次，右侧才会出现真实餐次详情。',
      kind: 'placeholder',
    },
  );

  assert.deepEqual(
    buildSearchState('鸡胸肉', false, '', [{ code: 'A' }], true),
    {
      value: '有结果',
      detail: '已命中 1 条候选，可直接替换今天这餐的实际摄入。',
      kind: 'actual',
    },
  );

  assert.deepEqual(mergeUnique(['鸡胸肉', '', '鸡胸肉', '米饭']), ['鸡胸肉', '米饭']);
});

test('check-in view helpers normalize numeric fields and build coach states', () => {
  assert.equal(toOptionalNumber(''), null);
  assert.equal(toOptionalNumber('2400'), 2400);
  assert.equal(formatHeadlineDate('2026-04-21'), '2026年4月21日');
  assert.equal(buildCompletionSummary(80, 100), 90);
  assert.equal(buildCompletionSummary(null, 100), null);

  assert.deepEqual(
    buildReadinessState(null, null, null, null),
    {
      value: '待填写',
      detail: '还没有真实打卡记录，也还没填完核心体感字段，因此这里不显示合成就绪分数。',
      kind: 'placeholder',
    },
  );

  assert.deepEqual(
    buildReadinessState(
      {
        dietCompletionRate: 88,
        trainingCompletionRate: 95,
      },
      null,
      null,
      null,
    ),
    {
      value: '已同步',
      detail: '当前展示的是已提交的真实打卡记录：饮食完成度 88%，训练完成度 95%。',
      kind: 'actual',
    },
  );

  assert.equal(
    buildCoachTip(
      {
        energyLevel: '4',
        fatigueLevel: '2',
        waterIntakeMl: '1800',
        trainingCompletionRate: '80',
      },
      { trainingPlan: { title: '上肢力量' } },
    ),
    '今天你在水分摄入方面还可以再推进一点。先补足 600ml 水，再完成剩余记录，恢复状态会更平稳。',
  );
});

test('check-in view helper rotates encouragements by explicit date string', () => {
  assert.equal(
    buildDailyEncouragement('2026-04-25'),
    '练得不必完美，先把今天完成。',
  );
  assert.equal(
    buildDailyEncouragement('2026-04-25'),
    buildDailyEncouragement('2026-04-25'),
  );
  assert.notEqual(
    buildDailyEncouragement('2026-04-25'),
    buildDailyEncouragement('2026-04-26'),
  );
});

test('check-in view helper falls back to the first encouragement on malformed dates', () => {
  assert.equal(
    buildDailyEncouragement('bad-input'),
    '你今天的每一次选择，都在帮明天的自己省力。',
  );
});
