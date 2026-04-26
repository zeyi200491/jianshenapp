import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import { ProfilesRepository } from './profiles.repository';
import type { OnboardingDto } from './dto/onboarding.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async saveOnboarding(userId: string, dto: OnboardingDto) {
    const measuredAt = new Date();
    const profile = await this.profilesRepository.upsertProfile(userId, dto, true);
    await this.profilesRepository.createBodyMetric(userId, dto.currentWeightKg, 'onboarding', measuredAt);

    return serializeValue(profile);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.profilesRepository.findProfileByUserId(userId);
    if (!existing) {
      throw new AppException('CONFLICT', '用户尚未完成建档', 409);
    }

    const profile = await this.profilesRepository.updateProfile(userId, dto);
    if (dto.currentWeightKg !== undefined) {
      await this.profilesRepository.createBodyMetric(userId, dto.currentWeightKg, 'manual', new Date());
    }

    return serializeValue(profile);
  }

  async resetTrainingCycle(userId: string, startFocus: string) {
    const existing = await this.profilesRepository.findProfileByUserId(userId);
    if (!existing?.onboardingCompletedAt) {
      throw new AppException('CONFLICT', '用户尚未完成建档', 409);
    }

    if (existing.targetType === 'cut') {
      throw new AppException('VALIDATION_ERROR', '减脂目标不支持设置力量训练循环', 400);
    }

    const profile = await this.profilesRepository.setTrainingCycleStart(userId, startFocus, new Date());
    return serializeValue(profile);
  }
}
