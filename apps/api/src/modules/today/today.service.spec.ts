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
});
