const path = require('path');
const { UsersService } = require(path.join(__dirname, 'users.service.ts'));

describe('UsersService', () => {
  function createService() {
    const usersRepository = {
      findCurrentUser: jest.fn(),
      createDeletionRequest: jest.fn(),
    };

    const service = new UsersService(usersRepository);
    return { service, usersRepository };
  }

  it('treats a missing current user as an invalid session', async () => {
    const { service, usersRepository } = createService();
    usersRepository.findCurrentUser.mockResolvedValue(null);

    await expect(service.getCurrentUser('missing-user')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('returns preferredTrainingSource from profile when fetching current user', async () => {
    const { service, usersRepository } = createService();
    usersRepository.findCurrentUser.mockResolvedValue({
      id: 'user-1',
      nickname: '测试用户',
      avatarUrl: null,
      status: 'active',
      profile: {
        gender: 'male',
        birthYear: 2000,
        heightCm: 180,
        currentWeightKg: 75,
        targetType: 'maintain',
        activityLevel: 'moderate',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: 4,
        dietScene: 'home',
        dietPreferences: ['high_protein'],
        dietRestrictions: [],
        supplementOptIn: true,
        onboardingCompletedAt: new Date('2026-05-01T08:00:00.000Z'),
        preferredTrainingSource: 'template',
      },
    });

    await expect(service.getCurrentUser('user-1')).resolves.toMatchObject({
      id: 'user-1',
      profile: {
        preferredTrainingSource: 'template',
      },
    });
  });

  it('creates a pending deletion request for the current user', async () => {
    const { service, usersRepository } = createService();
    usersRepository.createDeletionRequest.mockResolvedValue({
      id: 'request-1',
      userId: 'user-1',
      status: 'pending',
      reason: '毕业后不再使用',
      requestedAt: new Date('2026-04-25T08:00:00.000Z'),
    });

    await expect(service.requestDataDeletion('user-1', '毕业后不再使用')).resolves.toMatchObject({
      id: 'request-1',
      status: 'pending',
      reason: '毕业后不再使用',
    });
    expect(usersRepository.createDeletionRequest).toHaveBeenCalledWith('user-1', '毕业后不再使用');
  });
});
