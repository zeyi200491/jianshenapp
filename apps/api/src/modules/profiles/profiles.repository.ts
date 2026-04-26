import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OnboardingDto } from './dto/onboarding.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProfileByUserId(userId: string) {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  private buildProfileData(dto: OnboardingDto | UpdateProfileDto, completeOnboarding: boolean) {
    return {
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.birthYear !== undefined ? { birthYear: dto.birthYear } : {}),
      ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
      ...(dto.currentWeightKg !== undefined ? { currentWeightKg: dto.currentWeightKg } : {}),
      ...(dto.targetType !== undefined ? { targetType: dto.targetType } : {}),
      ...(dto.activityLevel !== undefined ? { activityLevel: dto.activityLevel } : {}),
      ...(dto.trainingExperience !== undefined ? { trainingExperience: dto.trainingExperience } : {}),
      ...(dto.trainingDaysPerWeek !== undefined ? { trainingDaysPerWeek: dto.trainingDaysPerWeek } : {}),
      ...(dto.dietScene !== undefined ? { dietScene: dto.dietScene } : {}),
      ...(dto.dietPreferences !== undefined ? { dietPreferences: dto.dietPreferences } : {}),
      ...(dto.dietRestrictions !== undefined ? { dietRestrictions: dto.dietRestrictions } : {}),
      ...(dto.supplementOptIn !== undefined ? { supplementOptIn: dto.supplementOptIn } : {}),
      ...(completeOnboarding ? { onboardingCompletedAt: new Date() } : {}),
    };
  }

  upsertProfile(userId: string, dto: OnboardingDto | UpdateProfileDto, completeOnboarding: boolean) {
    const profileData = this.buildProfileData(dto, completeOnboarding);

    return this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        gender: (dto as OnboardingDto).gender,
        birthYear: (dto as OnboardingDto).birthYear,
        heightCm: (dto as OnboardingDto).heightCm,
        currentWeightKg: (dto as OnboardingDto).currentWeightKg,
        targetType: (dto as OnboardingDto).targetType,
        activityLevel: (dto as OnboardingDto).activityLevel,
        trainingExperience: (dto as OnboardingDto).trainingExperience,
        trainingDaysPerWeek: (dto as OnboardingDto).trainingDaysPerWeek,
        dietScene: (dto as OnboardingDto).dietScene,
        dietPreferences: (dto as OnboardingDto).dietPreferences ?? [],
        dietRestrictions: (dto as OnboardingDto).dietRestrictions ?? [],
        supplementOptIn: (dto as OnboardingDto).supplementOptIn,
        onboardingCompletedAt: completeOnboarding ? new Date() : null,
        trainingCycleStartFocus: null,
        trainingCycleResetAt: null,
      },
      update: profileData,
    });
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: this.buildProfileData(dto, false),
    });
  }

  setTrainingCycleStart(userId: string, startFocus: string, resetAt: Date) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        trainingCycleStartFocus: startFocus,
        trainingCycleResetAt: resetAt,
      },
    });
  }

  createBodyMetric(userId: string, weightKg: number, source: string, measuredAt: Date) {
    return this.prisma.bodyMetric.create({
      data: {
        userId,
        weightKg,
        source,
        measuredAt,
      },
    });
  }
}
