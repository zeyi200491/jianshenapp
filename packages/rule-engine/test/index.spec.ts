/// <reference types="jest" />

import {
  calculateNutritionTargets,
  generateTrainingPlan,
  generateWeeklyDietPlan,
  generateWeeklyReview,
  type RuleProfileInput,
} from '../src';

const profile: RuleProfileInput = {
  gender: 'male',
  birthYear: 2004,
  heightCm: 175,
  currentWeightKg: 72,
  targetType: 'cut',
  activityLevel: 'moderate',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: 3,
  dietScene: 'canteen',
  dietPreferences: ['high_protein'],
  dietRestrictions: ['peanut'],
  supplementOptIn: true,
};

describe('rule-engine', () => {
  it('calculates nutrition targets', () => {
    const targets = calculateNutritionTargets(profile, new Date('2026-03-27T00:00:00.000Z'));

    expect(targets.calorieTarget).toBe(2100);
    expect(targets.proteinTargetG).toBe(144);
    expect(targets.fatTargetG).toBe(58);
    expect(targets.carbTargetG).toBeGreaterThan(200);
  });

  it('returns rest plan on rest day', () => {
    const plan = generateTrainingPlan(
      {
        ...profile,
        targetType: 'maintain',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: 3,
      },
      new Date('2026-03-28T00:00:00.000Z'),
    );

    expect(plan.splitType).toBe('rest');
    expect(plan.items[0]?.exerciseCode).toBe('walk');
  });

  it('keeps cut target on cardio even on a non-training weekday slot', () => {
    const plan = generateTrainingPlan(profile, new Date('2026-03-28T00:00:00.000Z'));

    expect(plan.splitType).toBe('cardio');
    expect(plan.items[0]?.exerciseCode).toBe('cardio_warmup');
  });

  it('generates treadmill incline cardio for cut target on training day', () => {
    const plan = generateTrainingPlan(profile, new Date('2026-03-27T00:00:00.000Z'));

    expect(plan.splitType).toBe('cardio');
    expect(plan.title).toContain('爬坡');
    expect(plan.durationMinutes).toBeGreaterThanOrEqual(25);
    expect(plan.durationMinutes).toBeLessThanOrEqual(45);
    expect(plan.items[0]?.exerciseCode).toBe('cardio_warmup');
    expect(plan.items[1]?.exerciseCode).toBe('treadmill_incline_walk');
  });

  it('keeps maintain target on strength training instead of switching to cardio', () => {
    const maintainPlan = generateTrainingPlan(
      {
        ...profile,
        targetType: 'maintain',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: 4,
      },
      new Date('2026-03-24T00:00:00.000Z'),
    );

    expect(maintainPlan.splitType).not.toBe('cardio');
    expect(maintainPlan.items.length).toBeGreaterThan(0);
    expect(maintainPlan.items[0]?.exerciseCode).not.toBe('treadmill_incline_walk');
  });

  it('generates weekly review with risk summary', () => {
    const review = generateWeeklyReview({
      targetType: 'cut',
      planDates: ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27'],
      checkIns: [
        {
          checkinDate: '2026-03-23',
          dietCompletionRate: 60,
          trainingCompletionRate: 80,
          weightKg: 72,
          energyLevel: 2,
          satietyLevel: 3,
          fatigueLevel: 4,
        },
        {
          checkinDate: '2026-03-25',
          dietCompletionRate: 65,
          trainingCompletionRate: 40,
          weightKg: 72.3,
          energyLevel: 2,
          satietyLevel: 2,
          fatigueLevel: 4,
        },
      ],
    });

    expect(review.risks.length).toBeGreaterThan(0);
    expect(review.recommendations.length).toBeGreaterThan(0);
    expect(review.weightChangeKg).toBe(0.3);
  });

  it('generates a weekly diet plan with 7 days and breakfast/lunch/dinner details', () => {
    const targets = calculateNutritionTargets(profile, new Date('2026-03-27T00:00:00.000Z'));
    const weeklyPlan = generateWeeklyDietPlan(profile, targets, new Date('2026-03-23T00:00:00.000Z'));

    expect(weeklyPlan.days).toHaveLength(7);
    expect(weeklyPlan.days[0]?.meals.breakfast.ingredients.length).toBeGreaterThan(0);
    expect(weeklyPlan.days[0]?.meals.lunch.alternatives.length).toBeGreaterThan(0);
    expect(weeklyPlan.days[0]?.meals.dinner.guidance.length).toBeGreaterThan(0);
    expect(weeklyPlan.days[0]?.meals.breakfast.title).not.toBe(weeklyPlan.days[1]?.meals.breakfast.title);
  });
});
