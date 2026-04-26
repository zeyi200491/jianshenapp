const path = require('path');
const { MealIntakesService } = require(path.join(__dirname, 'meal-intakes.service.ts'));

describe('MealIntakesService', () => {
  function createRepository() {
    return {
      findDailyPlanByIdAndUser: jest.fn().mockResolvedValue({
        id: 'daily-plan-1',
        calorieTarget: 2100,
        proteinTargetG: 150,
        carbTargetG: 230,
        fatTargetG: 60,
        dietPlan: {
          items: [
            {
              mealType: 'breakfast',
              title: 'Breakfast plan',
              targetCalories: 450,
              proteinG: 25,
              carbsG: 50,
              fatG: 12,
            },
            {
              mealType: 'lunch',
              title: 'Lunch plan',
              targetCalories: 720,
              proteinG: 48,
              carbsG: 78,
              fatG: 18,
            },
            {
              mealType: 'dinner',
              title: 'Dinner plan',
              targetCalories: 630,
              proteinG: 32,
              carbsG: 66,
              fatG: 16,
            },
          ],
        },
        mealIntakeOverrides: [
          {
            mealType: 'breakfast',
            foodCode: 'oatmeal-yogurt-bowl',
            foodNameSnapshot: 'Oatmeal yogurt bowl',
            portionSize: 'medium',
            calories: 420,
            proteinG: 24,
            carbG: 48,
            fatG: 10,
          },
        ],
      }),
      upsertMealIntakeOverride: jest.fn().mockImplementation(async (_userId, payload) => ({
        id: 'override-1',
        ...payload,
      })),
      deleteMealIntakeOverride: jest.fn().mockResolvedValue(undefined),
    };
  }

  function createFoodLibraryRepository() {
    return {
      searchFoodLibrary: jest.fn().mockResolvedValue([
        {
          code: 'custom-grain-bowl',
          name: 'Custom grain bowl',
          aliases: ['grain bowl', 'whole grain bowl'],
          sceneTags: ['canteen'],
          suggestedMealTypes: ['breakfast'],
          nutritionPerMedium: { calories: 510, proteinG: 26, carbG: 58, fatG: 16 },
        },
      ]),
      findFoodByCode: jest.fn(),
    };
  }

  it('searches foods through repository data and keeps alias hits within scene filters', async () => {
    const repository = createRepository();
    const foodLibraryRepository = createFoodLibraryRepository();
    const service = new MealIntakesService(repository, foodLibraryRepository);

    const result = await service.searchFoods('grain bowl', 'canteen', 'breakfast');

    expect(foodLibraryRepository.searchFoodLibrary).toHaveBeenCalledWith('grain bowl', 'canteen', 'breakfast');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('custom-grain-bowl');
    expect(result[0].aliases).toContain('grain bowl');
    expect(result[0].sceneTags).toContain('canteen');
  });

  it('uses database food data to calculate actual meal nutrition and merges daily totals', async () => {
    const repository = createRepository();
    const foodLibraryRepository = createFoodLibraryRepository();
    foodLibraryRepository.findFoodByCode.mockResolvedValue({
      code: 'custom-grain-bowl',
      name: 'Custom grain bowl',
      aliases: ['grain bowl', 'whole grain bowl'],
      sceneTags: ['canteen'],
      suggestedMealTypes: ['lunch'],
      nutritionPerMedium: { calories: 500, proteinG: 30, carbG: 60, fatG: 12 },
    });
    const service = new MealIntakesService(repository, foodLibraryRepository);

    const result = await service.upsertMealIntake('user-1', 'daily-plan-1', 'lunch', {
      foodCode: 'custom-grain-bowl',
      portionSize: 'large',
    });

    expect(foodLibraryRepository.findFoodByCode).toHaveBeenCalledWith('custom-grain-bowl');
    expect(repository.upsertMealIntakeOverride).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        dailyPlanId: 'daily-plan-1',
        mealType: 'lunch',
        foodCode: 'custom-grain-bowl',
        foodNameSnapshot: 'Custom grain bowl',
        portionSize: 'large',
      }),
    );
    expect(result.actual.foodCode).toBe('custom-grain-bowl');
    expect(result.actual.calories).toBe(625);
    expect(result.actual.proteinG).toBe(38);
    expect(result.effectiveDailyTotals.calories).toBe(result.actual.calories + 420 + 630);
  });

  it('removes an override and recalculates totals without that meal', async () => {
    const repository = createRepository();
    repository.findDailyPlanByIdAndUser
      .mockResolvedValueOnce({
        id: 'daily-plan-1',
        calorieTarget: 2100,
        proteinTargetG: 150,
        carbTargetG: 230,
        fatTargetG: 60,
        dietPlan: {
          items: [
            {
              mealType: 'breakfast',
              title: 'Breakfast plan',
              targetCalories: 450,
              proteinG: 25,
              carbsG: 50,
              fatG: 12,
            },
            {
              mealType: 'lunch',
              title: 'Lunch plan',
              targetCalories: 720,
              proteinG: 48,
              carbsG: 78,
              fatG: 18,
            },
            {
              mealType: 'dinner',
              title: 'Dinner plan',
              targetCalories: 630,
              proteinG: 32,
              carbsG: 66,
              fatG: 16,
            },
          ],
        },
        mealIntakeOverrides: [
          {
            mealType: 'breakfast',
            foodCode: 'oatmeal-yogurt-bowl',
            foodNameSnapshot: 'Oatmeal yogurt bowl',
            portionSize: 'medium',
            calories: 420,
            proteinG: 24,
            carbG: 48,
            fatG: 10,
          },
          {
            mealType: 'lunch',
            foodCode: 'fried-rice',
            foodNameSnapshot: 'Fried rice',
            portionSize: 'large',
            calories: 820,
            proteinG: 22,
            carbG: 102,
            fatG: 30,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'daily-plan-1',
        calorieTarget: 2100,
        proteinTargetG: 150,
        carbTargetG: 230,
        fatTargetG: 60,
        dietPlan: {
          items: [
            {
              mealType: 'breakfast',
              title: 'Breakfast plan',
              targetCalories: 450,
              proteinG: 25,
              carbsG: 50,
              fatG: 12,
            },
            {
              mealType: 'lunch',
              title: 'Lunch plan',
              targetCalories: 720,
              proteinG: 48,
              carbsG: 78,
              fatG: 18,
            },
            {
              mealType: 'dinner',
              title: 'Dinner plan',
              targetCalories: 630,
              proteinG: 32,
              carbsG: 66,
              fatG: 16,
            },
          ],
        },
        mealIntakeOverrides: [
          {
            mealType: 'breakfast',
            foodCode: 'oatmeal-yogurt-bowl',
            foodNameSnapshot: 'Oatmeal yogurt bowl',
            portionSize: 'medium',
            calories: 420,
            proteinG: 24,
            carbG: 48,
            fatG: 10,
          },
        ],
      });
    const service = new MealIntakesService(repository);

    const result = await service.removeMealIntake('user-1', 'daily-plan-1', 'lunch');

    expect(repository.deleteMealIntakeOverride).toHaveBeenCalledWith('daily-plan-1', 'lunch');
    expect(result.effectiveDailyTotals.calories).toBe(420 + 720 + 630);
  });
});
