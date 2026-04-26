import {
  calculateNutritionTargets,
  generateTrainingPlan,
  generateWeeklyDietPlan,
  type RuleProfileInput,
} from '@campusfit/rule-engine';

const profile: RuleProfileInput = {
  gender: 'male',
  birthYear: 1999,
  heightCm: 178,
  currentWeightKg: 75,
  targetType: 'cut',
  activityLevel: 'moderate',
  trainingExperience: 'intermediate',
  trainingDaysPerWeek: 5,
  dietScene: 'canteen',
  dietPreferences: [],
  dietRestrictions: [],
  supplementOptIn: true,
};

describe('rule-engine runtime package', () => {
  it('uses forcedFocus when generating a focused training plan', () => {
    const plan = generateTrainingPlan({ ...profile, targetType: 'maintain' }, new Date('2026-04-14T00:00:00.000Z'), {
      forcedFocus: 'push',
    });

    expect(plan.title).toBe('Push 日');
    expect(plan.items[0]?.exerciseCode).toBe('bench_press');
  });

  it('marks compound and isolation movements with default rest metadata', () => {
    const plan = generateTrainingPlan({ ...profile, targetType: 'maintain' }, new Date('2026-04-14T00:00:00.000Z'), {
      forcedFocus: 'push',
    });

    const benchPress = plan.items[0] as any;
    const cableFly = plan.items[3] as any;

    expect(benchPress.movementPattern).toBe('compound');
    expect(benchPress.restRuleSource).toBe('system');
    expect(benchPress.restSeconds).toBe(210);
    expect(benchPress.restHint).toContain('更长恢复');

    expect(cableFly.movementPattern).toBe('isolation');
    expect(cableFly.restRuleSource).toBe('system');
    expect(cableFly.restSeconds).toBe(150);
    expect(cableFly.restHint).toContain('恢复时间较短');
  });

  it('maps dorm and home scenes to the same cookable display scene in weekly diet output', () => {
    const nutrition = calculateNutritionTargets(profile, new Date('2026-04-14T00:00:00.000Z'));
    const dormPlan = generateWeeklyDietPlan(
      {
        ...profile,
        dietScene: 'dorm',
      },
      nutrition,
      new Date('2026-04-14T00:00:00.000Z'),
    );
    const homePlan = generateWeeklyDietPlan(
      {
        ...profile,
        dietScene: 'home',
      },
      nutrition,
      new Date('2026-04-14T00:00:00.000Z'),
    );

    expect(dormPlan.displayScene).toBe('cookable');
    expect(homePlan.displayScene).toBe('cookable');
  });
});
