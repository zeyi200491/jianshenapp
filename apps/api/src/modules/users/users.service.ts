import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getCurrentUser(userId: string) {
    const user = await this.usersRepository.findCurrentUser(userId);
    if (!user) {
      throw new AppException('UNAUTHORIZED', '登录会话已失效，请重新登录', 401);
    }

    return serializeValue({
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      status: user.status,
      hasCompletedOnboarding: Boolean(user.profile?.onboardingCompletedAt),
      profile: user.profile
        ? {
            gender: user.profile.gender,
            birthYear: user.profile.birthYear,
            heightCm: user.profile.heightCm,
            currentWeightKg: user.profile.currentWeightKg,
            targetType: user.profile.targetType,
            activityLevel: user.profile.activityLevel,
            trainingExperience: user.profile.trainingExperience,
            trainingDaysPerWeek: user.profile.trainingDaysPerWeek,
            dietScene: user.profile.dietScene,
            dietPreferences: user.profile.dietPreferences,
            dietRestrictions: user.profile.dietRestrictions,
            supplementOptIn: user.profile.supplementOptIn,
            onboardingCompletedAt: user.profile.onboardingCompletedAt,
          }
        : null,
    });
  }

  async requestDataDeletion(userId: string, reason?: string) {
    const request = await this.usersRepository.createDeletionRequest(userId, reason?.trim() || null);

    return serializeValue({
      id: request.id,
      status: request.status,
      reason: request.reason,
      requestedAt: request.requestedAt,
    });
  }
}
