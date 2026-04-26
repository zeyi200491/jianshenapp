const path = require('path');
const { ProfilesService } = require(path.join(__dirname, 'profiles.service.ts'));
const { AppException } = require(path.join(__dirname, '../../common/utils/app.exception.ts'));

describe('ProfilesService', () => {
  function createRepository(targetType = 'maintain') {
    return {
      findProfileByUserId: jest.fn().mockResolvedValue({
        userId: 'user-1',
        targetType,
        onboardingCompletedAt: new Date('2026-04-20T00:00:00.000Z'),
      }),
      upsertProfile: jest.fn(),
      createBodyMetric: jest.fn(),
      updateProfile: jest.fn(),
      setTrainingCycleStart: jest.fn().mockResolvedValue({
        userId: 'user-1',
        trainingCycleStartFocus: 'push',
        trainingCycleResetAt: new Date('2026-04-20T00:00:00.000Z'),
      }),
    };
  }

  it('rejects resetting the strength cycle for cut targets', async () => {
    const repository = createRepository('cut');
    const service = new ProfilesService(repository);

    await expect(service.resetTrainingCycle('user-1', 'push')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(repository.setTrainingCycleStart).not.toHaveBeenCalled();
  });

  it('still allows maintain targets to reset the strength cycle', async () => {
    const repository = createRepository('maintain');
    const service = new ProfilesService(repository);

    const result = await service.resetTrainingCycle('user-1', 'push');

    expect(repository.setTrainingCycleStart).toHaveBeenCalledWith('user-1', 'push', expect.any(Date));
    expect(result.trainingCycleStartFocus).toBe('push');
  });
});
