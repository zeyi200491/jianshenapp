const path = require('path');
const { TrainingPlansService } = require(path.join(__dirname, 'training-plans.service.ts'));

describe('TrainingPlansService', () => {
  it('returns movement metadata and rest hints in training plan details', async () => {
    const repository = {
      findTrainingPlanByIdAndUser: jest.fn().mockResolvedValue({
        id: 'training-plan-1',
        title: 'Push 日',
        splitType: 'push_pull_legs',
        notes: '主项优先，辅助动作控制节奏。',
        dailyPlan: {
          planDate: new Date('2026-04-15T00:00:00.000Z'),
        },
        items: [
          {
            id: 'item-1',
            exerciseName: '杠铃卧推',
            sets: 4,
            reps: '6-8 次',
            restSeconds: 210,
            movementPattern: 'compound',
            restRuleSource: 'system',
            restHint: '主项动作，建议更长恢复。',
            notes: '肩胛收紧，下放到胸部中下段。',
          },
        ],
      }),
    };
    const service = new TrainingPlansService(repository);

    const result = await service.getDetail('user-1', 'training-plan-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      name: '杠铃卧推',
      movementPattern: 'compound',
      restRuleSource: 'system',
      restHint: '主项动作，建议更长恢复。',
      restSeconds: 210,
    });
  });
});
