const path = require('path');
const { TodayService } = require(path.join(__dirname, 'today.service.ts'));

describe('TodayService', () => {
  function createPlansService() {
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
          summary: '宿舍减脂日方案',
          items: [
            {
              id: 'meal-1',
              mealType: 'breakfast',
              title: '燕麦鸡蛋酸奶碗',
              suggestionText: '早餐建议',
              targetCalories: 450,
              proteinG: 25,
              carbsG: 50,
              fatG: 12,
              alternatives: ['全麦面包 + 牛奶'],
            },
            {
              id: 'meal-2',
              mealType: 'lunch',
              title: '鸡胸肉饭盒',
              suggestionText: '午餐建议',
              targetCalories: 720,
              proteinG: 48,
              carbsG: 78,
              fatG: 18,
              alternatives: ['牛肉饭盒'],
            },
            {
              id: 'meal-3',
              mealType: 'dinner',
              title: '番茄鸡蛋面',
              suggestionText: '晚餐建议',
              targetCalories: 630,
              proteinG: 32,
              carbsG: 66,
              fatG: 16,
              alternatives: ['鸡蛋三明治'],
            },
          ],
        },
        trainingPlan: null,
        mealIntakeOverrides: [
          {
            mealType: 'lunch',
            foodCode: 'fried-rice',
            foodNameSnapshot: '炒饭',
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
      getRuleProfileInput: jest.fn().mockResolvedValue({
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
      }),
    };
  }

  it('returns effective meal data and cookable display scene when a meal has been overridden', async () => {
    const service = new TodayService(
      createPlansService(),
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.weeklyDietPlan.displayScene).toBe('cookable');
    expect(result.dietPlan.sceneDisplay).toBe('可做饭');
    const lunch = result.dietPlan.meals.find((item) => item.mealType === 'lunch');
    expect(lunch.actual.foodName).toBe('炒饭');
    expect(lunch.effective.title).toBe('炒饭');
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
      trainingPlan: {
        id: 'training-plan-1',
        title: 'Push 日',
        splitType: 'push_pull_legs',
        durationMinutes: 55,
        intensityLevel: 'medium',
        notes: '系统生成方案',
        items: [
          {
            id: 'training-item-1',
            exerciseCode: 'bench-press',
            exerciseName: '杠铃卧推',
            sets: 4,
            reps: '8-10',
            restSeconds: 120,
            notes: '基础动作',
          },
        ],
      },
      activeTrainingOverride: {
        id: 'training-override-1',
        status: 'active',
        sourceWeekday: 'thursday',
        sourceTemplateId: 'template-1',
        sourceTemplateDayId: 'template-day-1',
        title: '出差酒店替代训练',
        splitType: 'travel_full_body',
        durationMinutes: 35,
        intensityLevel: 'medium',
        notes: '用户覆盖版本',
        items: [
          {
            id: 'training-override-item-1',
            exerciseCode: 'dumbbell-goblet-squat',
            exerciseName: '哑铃高脚杯深蹲',
            sets: 3,
            reps: '12',
            restSeconds: 75,
            notes: '优先使用酒店器械',
          },
        ],
      },
    });

    const service = new TodayService(
      plansService,
      { findByDate: jest.fn().mockResolvedValue(null) },
      { findLatest: jest.fn().mockResolvedValue(null) },
    );

    const result = await service.getToday('user-1', '2026-04-16');

    expect(result.activeTrainingSource).toBe('user_override');
    expect(result.systemTrainingPlan.title).toBe('Push 日');
    expect(result.activeTrainingPlan.title).toBe('出差酒店替代训练');
    expect(result.activeTrainingPlan.splitType).toBe('travel_full_body');
    expect(result.activeTrainingPlan.items[0].name).toBe('哑铃高脚杯深蹲');
    expect(result.activeTrainingPlan.items[0].restSeconds).toBe(75);
  });
});
