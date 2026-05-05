const path = require('path');
const { TodayService } = require(path.join(__dirname, 'today.service.ts'));

describe('TodayService', () => {
  function createPlansService() {
    const profile = {
      gender: 'male',
      birthYear: 1999,
      heightCm: 178,
      currentWeightKg: 75,
      targetType: 'cut',
      activityLevel: 'moderate',
      trainingExperience: 'intermediate',
      trainingDaysPerWeek: 4,
      dietScene: 'dorm',
      dietPreferences: [],
      dietRestrictions: [],
      supplementOptIn: true,
      preferredTrainingSource: 'system',
    };

    return {
      ensurePlanForDate: jest.fn().mockResolvedValue({
        id: 'daily-plan-1',
        calorieTarget: 2100,
        proteinTargetG: 150,
        carbTargetG: 230,
        fatTargetG: 60,
        dietPlan: {
          id: 'diet-plan-1',
          scene: 'dorm',
          summary: 'Dorm cut plan',
          items: [
            {
              id: 'meal-1',
              mealType: 'breakfast',
              title: 'Breakfast',
              suggestionText: 'Breakfast plan',
              targetCalories: 450,
              proteinG: 25,
              carbsG: 50,
              fatG: 12,
              alternatives: ['Alt breakfast'],
            },
            {
              id: 'meal-2',
              mealType: 'lunch',
              title: 'Lunch',
              suggestionText: 'Lunch plan',
              targetCalories: 720,
              proteinG: 48,
              carbsG: 78,
              fatG: 18,
              alternatives: ['Alt lunch'],
            },
            {
              id: 'meal-3',
              mealType: 'dinner',
              title: 'Dinner',
              suggestionText: 'Dinner plan',
              targetCalories: 630,
              proteinG: 32,
              carbsG: 66,
              fatG: 16,
              alternatives: ['Alt dinner'],
            },
          ],
        },
        trainingPlan: null,
        mealIntakeOverrides: [
          {
            mealType: 'lunch',
            foodCode: 'fried-rice',
            foodNameSnapshot: 'Fried Rice',
            portionSize: 'medium',
            calories: 680,
            proteinG: 18,
            carbG: 92,
            fatG: 24,
          },
        ],
      }),
      getTrainingCycleStatus: jest.fn().mockResolvedValue({
        configured: false,
        startFocus: null,
        currentFocus: null,
        requiresSelection: true,
        suggestedReset: false,
        inactivityDays: null,
        lastCompletedDate: null,
        resetAt: null,
      }),
      getRuleProfileInput: jest.fn().mockResolvedValue(profile),
    };
  }

  function createTrainingTemplatesService() {
    return {
      previewForTodaySource: jest.fn().mockResolvedValue(null),
    };
  }

  function createProfilesService() {
    return {
      setPreferredTrainingSource: jest.fn().mockResolvedValue({
        userId: 'user-1',
        preferredTrainingSource: 'system',
      }),
    };
  }

  function createTrainingOverridesRepository() {
    return {
      findActiveByDailyPlanIdAndUser: jest.fn().mockResolvedValue(null),
    };
  }

  function createTrainingPlan(overrides = {}) {
    return {
      id: 'training-plan-1',
      title: 'System Push Day',
      splitType: 'push_pull_legs',
      durationMinutes: 55,
      intensityLevel: 'medium',
      notes: 'system plan',
      items: [
        {
          id: 'training-item-1',
          exerciseCode: 'bench-press',
          exerciseName: 'Barbell Bench Press',
          sets: 4,
          reps: '8-10',
          restSeconds: 120,
          notes: 'system item',
        },
      ],
      ...overrides,
    };
  }

  it('returns effective meal data and cookable display scene when a meal has been overridden', async () => {
    const service = new TodayService(
      createPlansService(),
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
      createTrainingTemplatesService(),
      createProfilesService(),
      createTrainingOverridesRepository(),
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.weeklyDietPlan.displayScene).toBe('cookable');
    expect(result.dietPlan.sceneDisplay).toBe('可做饭');
    const lunch = result.dietPlan.meals.find((item) => item.mealType === 'lunch');
    expect(lunch.actual.foodName).toBe('Fried Rice');
    expect(lunch.effective.title).toBe('Fried Rice');
    expect(result.effectiveDailyTotals.calories).toBe(450 + 680 + 630);
  });

  it('exposes active training override alongside the system training plan', async () => {
    const plansService = createPlansService();
    plansService.ensurePlanForDate.mockResolvedValue({
      id: 'daily-plan-1',
      calorieTarget: 2100,
      proteinTargetG: 150,
      carbTargetG: 230,
      fatTargetG: 60,
      dietPlan: null,
      mealIntakeOverrides: [],
      trainingPlan: createTrainingPlan(),
      activeTrainingOverride: {
        id: 'training-override-1',
        status: 'active',
        sourceWeekday: 'thursday',
        sourceTemplateId: 'template-1',
        sourceTemplateDayId: 'template-day-1',
        title: 'Travel Full Body',
        splitType: 'travel_full_body',
        durationMinutes: 35,
        intensityLevel: 'medium',
        notes: 'user override',
        items: [
          {
            id: 'training-override-item-1',
            exerciseCode: 'free-text/dumbbell-goblet-squat',
            exerciseName: 'Dumbbell Goblet Squat',
            sets: 3,
            reps: '12',
            repText: '12+12+12',
            sourceType: 'free_text',
            rawInput: 'Dumbbell Goblet Squat 12+12+12 x3 @20kg',
            restSeconds: 75,
            notes: 'hotel gym first',
          },
        ],
      },
    });

    const service = new TodayService(
      plansService,
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
      createTrainingTemplatesService(),
      createProfilesService(),
      createTrainingOverridesRepository(),
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.activeTrainingSource).toBe('user_override');
    expect(result.systemTrainingPlan.title).toBe('System Push Day');
    expect(result.activeTrainingPlan.title).toBe('Travel Full Body');
    expect(result.activeTrainingPlan.splitType).toBe('travel_full_body');
    expect(result.activeTrainingPlan.items[0]).toMatchObject({
      name: 'Dumbbell Goblet Squat',
      restSeconds: 75,
      repText: '12+12+12',
      sourceType: 'free_text',
      rawInput: 'Dumbbell Goblet Squat 12+12+12 x3 @20kg',
    });
  });

  it('uses template as active source when preferredTrainingSource is template and an enabled template exists', async () => {
    const plansService = createPlansService();
    plansService.ensurePlanForDate.mockResolvedValue({
      id: 'daily-plan-1',
      calorieTarget: 2100,
      proteinTargetG: 150,
      carbTargetG: 230,
      fatTargetG: 60,
      dietPlan: null,
      mealIntakeOverrides: [],
      trainingPlan: createTrainingPlan(),
      activeTrainingOverride: null,
    });
    plansService.getRuleProfileInput.mockResolvedValue({
      ...(await plansService.getRuleProfileInput()),
      preferredTrainingSource: 'template',
    });

    const trainingTemplatesService = createTrainingTemplatesService();
    trainingTemplatesService.previewForTodaySource.mockResolvedValue({
      templateId: 'template-1',
      templateName: 'Template A',
      date: '2026-04-16',
      weekday: 'thursday',
      day: {
        id: 'template-day-1',
        weekday: 'thursday',
        dayType: 'training',
        title: 'Template Leg Day',
        splitType: 'legs',
        durationMinutes: 70,
        intensityLevel: 'high',
        notes: 'template day',
        items: [
          {
            id: 'template-item-1',
            exerciseCode: 'back-squat',
            exerciseName: 'Back Squat',
            sets: 5,
            reps: '5',
            repText: '5',
            restSeconds: 180,
            notes: 'template item',
          },
        ],
      },
    });

    const service = new TodayService(
      plansService,
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
      trainingTemplatesService,
      createProfilesService(),
      createTrainingOverridesRepository(),
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.activeTrainingSource).toBe('template');
    expect(result.trainingPlan.title).toBe('Template Leg Day');
    expect(result.trainingPlan.items[0].name).toBe('Back Squat');
    expect(result.systemTrainingPlan.title).toBe('System Push Day');
    expect(result.activeTrainingPlan.title).toBe('Template Leg Day');
  });

  it('keeps template as active source on template rest days without falling back to system', async () => {
    const plansService = createPlansService();
    plansService.ensurePlanForDate.mockResolvedValue({
      id: 'daily-plan-1',
      calorieTarget: 2100,
      proteinTargetG: 150,
      carbTargetG: 230,
      fatTargetG: 60,
      dietPlan: null,
      mealIntakeOverrides: [],
      trainingPlan: createTrainingPlan(),
      activeTrainingOverride: null,
    });
    plansService.getRuleProfileInput.mockResolvedValue({
      ...(await plansService.getRuleProfileInput()),
      preferredTrainingSource: 'template',
    });

    const trainingTemplatesService = createTrainingTemplatesService();
    trainingTemplatesService.previewForTodaySource.mockResolvedValue({
      templateId: 'template-1',
      templateName: 'Template A',
      date: '2026-04-16',
      weekday: 'thursday',
      day: {
        id: 'template-day-1',
        weekday: 'thursday',
        dayType: 'rest',
        title: 'Template Recovery Day',
        splitType: null,
        durationMinutes: null,
        intensityLevel: null,
        notes: 'rest day',
        items: [],
      },
    });

    const service = new TodayService(
      plansService,
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
      trainingTemplatesService,
      createProfilesService(),
      createTrainingOverridesRepository(),
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.activeTrainingSource).toBe('template');
    expect(result.trainingPlan.title).toBe('Template Recovery Day');
    expect(result.trainingPlan.items).toEqual([]);
    expect(result.systemTrainingPlan.title).toBe('System Push Day');
    expect(result.activeTrainingPlan.title).toBe('Template Recovery Day');
  });

  it('falls back to system and resets preferredTrainingSource when template is unavailable', async () => {
    const plansService = createPlansService();
    plansService.ensurePlanForDate.mockResolvedValue({
      id: 'daily-plan-1',
      calorieTarget: 2100,
      proteinTargetG: 150,
      carbTargetG: 230,
      fatTargetG: 60,
      dietPlan: null,
      mealIntakeOverrides: [],
      trainingPlan: createTrainingPlan(),
      activeTrainingOverride: null,
    });
    plansService.getRuleProfileInput.mockResolvedValue({
      ...(await plansService.getRuleProfileInput()),
      preferredTrainingSource: 'template',
    });

    const trainingTemplatesService = createTrainingTemplatesService();
    const profilesService = createProfilesService();
    const service = new TodayService(
      plansService,
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
      trainingTemplatesService,
      profilesService,
      createTrainingOverridesRepository(),
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.activeTrainingSource).toBe('system');
    expect(result.trainingPlan.title).toBe('System Push Day');
    expect(profilesService.setPreferredTrainingSource).toHaveBeenCalledWith('user-1', 'system');
  });
});
