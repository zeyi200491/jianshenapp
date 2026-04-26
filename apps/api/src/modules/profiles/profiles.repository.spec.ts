const path = require('path');
const { ProfilesRepository } = require(path.join(__dirname, 'profiles.repository.ts'));

describe('ProfilesRepository', () => {
  it('updates an existing profile with partial fields without constructing onboarding-only create data', async () => {
    const prisma = {
      userProfile: {
        update: jest.fn().mockResolvedValue({
          id: 'profile-1',
          userId: 'user-1',
          targetType: 'cut',
          activityLevel: 'high',
          trainingExperience: 'intermediate',
          trainingDaysPerWeek: 5,
          heightCm: 186,
          currentWeightKg: 73,
        }),
      },
    };
    const repository = new ProfilesRepository(prisma);

    const result = await repository.updateProfile('user-1', {
      targetType: 'cut',
      activityLevel: 'high',
      trainingExperience: 'intermediate',
      trainingDaysPerWeek: 5,
      heightCm: 186,
      currentWeightKg: 73,
    });

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        targetType: 'cut',
        activityLevel: 'high',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: 5,
        heightCm: 186,
        currentWeightKg: 73,
      },
    });
    expect(result.targetType).toBe('cut');
  });
});
