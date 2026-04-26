const path = require('path');
const { PlansService } = require(path.join(__dirname, 'plans.service.ts'));

describe('PlansService', () => {
  function createProfile(overrides = {}) {
    return {
      gender: 'male',
      birthYear: 1999,
      heightCm: 178,
      currentWeightKg: 75,
      targetType: 'bulk',
      activityLevel: 'moderate',
      trainingExperience: 'intermediate',
      trainingDaysPerWeek: 4,
      dietScene: 'canteen',
      dietPreferences: [],
      dietRestrictions: [],
      supplementOptIn: true,
      onboardingCompletedAt: new Date('2026-04-01T00:00:00.000Z'),
      trainingCycleStartFocus: null,
      trainingCycleResetAt: null,
      ...overrides,
    };
  }

  function createRepository(profileOverrides = {}, latestCompletedTraining = null) {
    return {
      findProfileByUserId: jest.fn().mockResolvedValue(createProfile(profileOverrides)),
      findDailyPlanByUserAndDate: jest.fn().mockResolvedValue(null),
      findLatestCompletedTrainingForCycle: jest.fn().mockResolvedValue(latestCompletedTraining),
      saveGeneratedPlan: jest.fn().mockImplementation(async (params) => ({
        id: 'plan-1',
        generated: true,
        planDate: params.planDate,
        calorieTarget: params.nutrition.calorieTarget,
        proteinTargetG: params.nutrition.proteinTargetG,
        carbTargetG: params.nutrition.carbTargetG,
        fatTargetG: params.nutrition.fatTargetG,
        dietPlan: params.dietPlan,
        trainingPlan: params.trainingPlan,
      })),
    };
  }

  it('starts from the selected focus when the cycle has been configured but no workout is completed yet', async () => {
    const repository = createRepository({
      trainingCycleStartFocus: 'push',
      trainingCycleResetAt: new Date('2026-04-03T00:00:00.000Z'),
    });
    const service = new PlansService(repository);

    await service.generateForDate('user-1', new Date('2026-04-03T00:00:00.000Z'), true);

    const params = repository.saveGeneratedPlan.mock.calls[0][0];
    expect(params.trainingPlan.splitType).toBe('push_pull_legs');
    expect(params.trainingPlan.title).toBe('Push 日');
    expect(params.trainingPlan.items[0].exerciseName).toBeTruthy();
  });

  it('moves to the next focus after the previous workout has been completed', async () => {
    const repository = createRepository(
      {
        trainingCycleStartFocus: 'push',
        trainingCycleResetAt: new Date('2026-04-03T00:00:00.000Z'),
      },
      {
        focus: 'push',
        checkinDate: new Date('2026-04-04T00:00:00.000Z'),
      },
    );
    const service = new PlansService(repository);

    await service.generateForDate('user-1', new Date('2026-04-05T00:00:00.000Z'), true);

    const params = repository.saveGeneratedPlan.mock.calls[0][0];
    expect(params.trainingPlan.title).toBe('Pull 日');
  });

  it('requires the user to choose a start focus when the cycle has not been configured', async () => {
    const repository = createRepository();
    const service = new PlansService(repository);

    const result = await service.getTrainingCycleStatus('user-1', new Date('2026-04-03T00:00:00.000Z'));

    expect(result.requiresSelection).toBe(true);
    expect(result.currentFocus).toBeNull();
    expect(result.suggestedReset).toBe(false);
  });

  it('suggests resetting the cycle after a long inactivity gap', async () => {
    const repository = createRepository(
      {
        trainingCycleStartFocus: 'push',
        trainingCycleResetAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        focus: 'push',
        checkinDate: new Date('2026-04-03T00:00:00.000Z'),
      },
    );
    const service = new PlansService(repository);

    const result = await service.getTrainingCycleStatus('user-1', new Date('2026-04-11T00:00:00.000Z'));

    expect(result.requiresSelection).toBe(false);
    expect(result.currentFocus).toBe('pull');
    expect(result.suggestedReset).toBe(true);
    expect(result.inactivityDays).toBe(8);
  });

  it('does not require selecting push pull legs when the target is cut', async () => {
    const repository = createRepository({
      targetType: 'cut',
      trainingCycleStartFocus: 'push',
      trainingCycleResetAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    const service = new PlansService(repository);

    const result = await service.getTrainingCycleStatus('user-1', new Date('2026-04-11T00:00:00.000Z'));

    expect(result.requiresSelection).toBe(false);
    expect(result.currentFocus).toBeNull();
    expect(result.startFocus).toBeNull();
    expect(result.configured).toBe(false);
  });

  it('regenerates the daily plan when the saved training mode conflicts with the current target', async () => {
    const repository = createRepository({
      targetType: 'maintain',
      trainingCycleStartFocus: 'push',
      trainingCycleResetAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    repository.findDailyPlanByUserAndDate.mockResolvedValueOnce({
      id: 'daily-plan-1',
      planDate: new Date('2026-04-11T00:00:00.000Z'),
      calorieTarget: 2200,
      proteinTargetG: 150,
      carbTargetG: 240,
      fatTargetG: 65,
      dietPlan: null,
      mealIntakeOverrides: [],
      trainingPlan: {
        id: 'training-plan-1',
        splitType: 'cardio',
        title: '跑步机爬坡有氧',
        items: [],
      },
    });
    const service = new PlansService(repository);

    const result = await service.ensurePlanForDate('user-1', new Date('2026-04-11T00:00:00.000Z'));

    expect(repository.saveGeneratedPlan).toHaveBeenCalled();
    expect(result.generated).toBe(true);
    expect(result.trainingPlan.splitType).not.toBe('cardio');
  });
});

