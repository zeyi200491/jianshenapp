const path = require('path');
const { AppException } = require(path.join(__dirname, '../../common/utils/app.exception.ts'));
const { TrainingOverridesService } = require(path.join(__dirname, 'training-overrides.service.ts'));

describe('TrainingOverridesService', () => {
  function createDailyPlan() {
    return {
      id: 'daily-plan-1',
      userId: 'user-1',
      trainingPlan: {
        id: 'system-plan-1',
        title: 'System Push Day',
        splitType: 'push_pull_legs',
        durationMinutes: 55,
        intensityLevel: 'medium',
        notes: 'System generated plan',
        items: [
          {
            id: 'system-item-1',
            exerciseCode: 'bench_press',
            exerciseName: 'Bench Press',
            sets: 4,
            reps: '8-10',
            restSeconds: 120,
            notes: 'Main lift',
          },
        ],
      },
    };
  }

  function createTemplate() {
    return {
      id: 'template-1',
      days: [
        {
          id: 'day-1',
          weekday: 'thursday',
          dayType: 'training',
          title: 'Travel Full Body',
          splitType: 'travel_full_body',
          durationMinutes: 35,
          intensityLevel: 'medium',
          notes: 'Hotel gym version',
          items: [
            {
              id: 'template-item-1',
              exerciseCode: 'free-text/dumbbell-fly',
              exerciseName: 'Dumbbell Fly',
              sets: 3,
              reps: '8-10',
              repText: '8+10+15',
              sourceType: 'free_text',
              rawInput: 'Dumbbell Fly 8+10+15 x3',
              restSeconds: 75,
              notes: 'Descending weight set',
            },
          ],
        },
      ],
    };
  }

  function createRepository() {
    return {
      findDailyPlanByIdAndUser: jest.fn(),
      findTemplateByIdAndUser: jest.fn(),
      applyOverride: jest.fn(),
      removeActiveOverride: jest.fn(),
    };
  }

  function createProfilesService() {
    return {
      setPreferredTrainingSource: jest.fn(),
    };
  }

  it('applies a template day as today override', async () => {
    const repository = createRepository();
    const profilesService = createProfilesService();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.findTemplateByIdAndUser.mockResolvedValue(createTemplate());
    repository.applyOverride.mockResolvedValue({
      id: 'override-1',
      title: 'Travel Full Body',
      splitType: 'travel_full_body',
      durationMinutes: 35,
      intensityLevel: 'medium',
      notes: 'Hotel gym version',
      items: [
        {
          id: 'override-item-1',
          exerciseCode: 'free-text/dumbbell-fly',
          exerciseName: 'Dumbbell Fly',
          sets: 3,
          reps: '8-10',
          repText: '8+10+15',
          sourceType: 'free_text',
          rawInput: 'Dumbbell Fly 8+10+15 x3',
          restSeconds: 75,
          notes: 'Descending weight set',
        },
      ],
    });
    const service = new TrainingOverridesService(repository, profilesService);

    const result = await service.apply('user-1', 'daily-plan-1', {
      templateId: 'template-1',
      weekday: 'thursday',
    });

    expect(repository.applyOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        dailyPlanId: 'daily-plan-1',
        sourceWeekday: 'thursday',
        items: [
          expect.objectContaining({
            sourceTemplateItemId: 'template-item-1',
            repText: '8+10+15',
            sourceType: 'free_text',
            rawInput: 'Dumbbell Fly 8+10+15 x3',
          }),
        ],
      }),
    );
    expect(result.activeTrainingSource).toBe('user_override');
    expect(result.activeTrainingPlan.title).toBe('Travel Full Body');
    expect(result.activeTrainingPlan.items[0]).toMatchObject({
      repText: '8+10+15',
      sourceType: 'free_text',
      rawInput: 'Dumbbell Fly 8+10+15 x3',
    });
  });

  it('removes the active override and persists preferred training source as system', async () => {
    const repository = createRepository();
    const profilesService = createProfilesService();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.removeActiveOverride.mockResolvedValue(undefined);
    profilesService.setPreferredTrainingSource.mockResolvedValue({
      userId: 'user-1',
      preferredTrainingSource: 'system',
    });
    const service = new TrainingOverridesService(repository, profilesService);

    const result = await service.remove('user-1', 'daily-plan-1');

    expect(repository.removeActiveOverride).toHaveBeenCalledWith('daily-plan-1', 'user-1');
    expect(profilesService.setPreferredTrainingSource).toHaveBeenCalledWith('user-1', 'system');
    expect(result.activeTrainingSource).toBe('system');
    expect(result.activeTrainingPlan.title).toBe('System Push Day');
  });

  it('rejects apply when the requested weekday does not exist in template', async () => {
    const repository = createRepository();
    const profilesService = createProfilesService();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.findTemplateByIdAndUser.mockResolvedValue(createTemplate());
    const service = new TrainingOverridesService(repository, profilesService);

    await expect(
      service.apply('user-1', 'daily-plan-1', {
        templateId: 'template-1',
        weekday: 'monday',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
