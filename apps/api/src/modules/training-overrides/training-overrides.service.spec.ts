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
        title: '推训练日',
        splitType: 'push_pull_legs',
        durationMinutes: 55,
        intensityLevel: 'medium',
        notes: '系统方案',
        items: [
          {
            id: 'system-item-1',
            exerciseCode: 'bench_press',
            exerciseName: '杠铃卧推',
            sets: 4,
            reps: '8-10',
            restSeconds: 120,
            notes: '主项动作',
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
          title: '出差全身',
          splitType: 'travel_full_body',
          durationMinutes: 35,
          intensityLevel: 'medium',
          notes: '酒店健身房版本',
          items: [
            {
              id: 'template-item-1',
              exerciseCode: 'free-text/dumbbell-fly',
              exerciseName: '哑铃飞鸟',
              sets: 3,
              reps: '8-10',
              repText: '8+10+15',
              sourceType: 'free_text',
              rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
              restSeconds: 75,
              notes: '先做轻重量递减组',
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

  it('applies a template day as today override', async () => {
    const repository = createRepository();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.findTemplateByIdAndUser.mockResolvedValue(createTemplate());
    repository.applyOverride.mockResolvedValue({
      id: 'override-1',
      title: '出差全身',
      splitType: 'travel_full_body',
      durationMinutes: 35,
      intensityLevel: 'medium',
      notes: '酒店健身房版本',
      items: [
        {
          id: 'override-item-1',
          exerciseCode: 'free-text/dumbbell-fly',
          exerciseName: '哑铃飞鸟',
          sets: 3,
          reps: '8-10',
          repText: '8+10+15',
          sourceType: 'free_text',
          rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
          restSeconds: 75,
          notes: '先做轻重量递减组',
        },
      ],
    });
    const service = new TrainingOverridesService(repository);

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
            rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
          }),
        ],
      }),
    );
    expect(result.activeTrainingSource).toBe('user_override');
    expect(result.activeTrainingPlan.title).toBe('出差全身');
    expect(result.activeTrainingPlan.items[0]).toMatchObject({
      repText: '8+10+15',
      sourceType: 'free_text',
      rawInput: '哑铃飞鸟 8+10+15×3（10kg+7.5kg+5kg）',
    });
  });

  it('removes the active override and falls back to system plan', async () => {
    const repository = createRepository();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.removeActiveOverride.mockResolvedValue(undefined);
    const service = new TrainingOverridesService(repository);

    const result = await service.remove('user-1', 'daily-plan-1');

    expect(repository.removeActiveOverride).toHaveBeenCalledWith('daily-plan-1', 'user-1');
    expect(result.activeTrainingSource).toBe('system');
    expect(result.activeTrainingPlan.title).toBe('推训练日');
  });

  it('rejects apply when the requested weekday does not exist in template', async () => {
    const repository = createRepository();
    repository.findDailyPlanByIdAndUser.mockResolvedValue(createDailyPlan());
    repository.findTemplateByIdAndUser.mockResolvedValue(createTemplate());
    const service = new TrainingOverridesService(repository);

    await expect(
      service.apply('user-1', 'daily-plan-1', {
        templateId: 'template-1',
        weekday: 'monday',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
