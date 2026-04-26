const path = require('path');
const { CheckInsService } = require(path.join(__dirname, 'check-ins.service.ts'));

describe('CheckInsService', () => {
  function createRepository() {
    return {
      findDailyPlanByIdAndUser: jest.fn().mockResolvedValue({
        id: 'daily-plan-1',
        userId: 'user-1',
        planDate: new Date('2026-04-19T00:00:00.000Z'),
      }),
      upsertCheckIn: jest.fn().mockImplementation(async (_userId, payload) => ({
        id: 'check-in-1',
        userId: 'user-1',
        createdAt: new Date('2026-04-19T12:00:00.000Z'),
        updatedAt: new Date('2026-04-19T12:00:00.000Z'),
        dailyPlan: {
          id: payload.dailyPlanId,
        },
        ...payload,
      })),
      createBodyMetric: jest.fn(),
      findByDate: jest.fn(),
    };
  }

  it('allows quick check-in to omit signal fields', async () => {
    const repository = createRepository();
    const service = new CheckInsService(repository);

    const result = await service.create('user-1', {
      dailyPlanId: 'daily-plan-1',
      checkinDate: '2026-04-19',
      dietCompletionRate: 75,
      trainingCompletionRate: 80,
      waterIntakeMl: 1800,
      stepCount: 8600,
      note: '快打卡',
    });

    expect(repository.upsertCheckIn).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        dailyPlanId: 'daily-plan-1',
        dietCompletionRate: 75,
        trainingCompletionRate: 80,
        energyLevel: undefined,
        satietyLevel: undefined,
        fatigueLevel: undefined,
      }),
    );
    expect(result.record.energyLevel).toBeUndefined();
    expect(result.record.satietyLevel).toBeUndefined();
    expect(result.record.fatigueLevel).toBeUndefined();
    expect(repository.createBodyMetric).not.toHaveBeenCalled();
  });
});
