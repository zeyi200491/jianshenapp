import { calculateNutritionTargets, generateDietPlan, generateTrainingPlan, type RuleProfileInput, type TrainingFocus } from '@campusfit/rule-engine';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { toDateOnlyString } from '../../common/utils/date.util';
import { PlansRepository } from './plans.repository';

const RESET_SUGGESTION_GAP_DAYS = 7;
const TRAINING_FOCUS_ORDER: TrainingFocus[] = ['push', 'pull', 'legs'];

type ProfileRow = Awaited<ReturnType<PlansRepository['findProfileByUserId']>>;
type DailyPlanRow = Awaited<ReturnType<PlansRepository['findDailyPlanByUserAndDate']>>;

function normalizeTrainingFocus(value: unknown): TrainingFocus | null {
  if (value === 'push' || value === 'pull' || value === 'legs') {
    return value;
  }

  return null;
}

function getNextTrainingFocus(focus: TrainingFocus): TrainingFocus {
  const currentIndex = TRAINING_FOCUS_ORDER.indexOf(focus);
  return TRAINING_FOCUS_ORDER[(currentIndex + 1) % TRAINING_FOCUS_ORDER.length];
}

function getDateDiffInDays(later: Date, earlier: Date) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / oneDayMs));
}

function doesTrainingPlanConflictWithTarget(
  targetType: RuleProfileInput['targetType'],
  plan: DailyPlanRow,
) {
  const splitType = plan?.trainingPlan?.splitType;
  if (!splitType) {
    return false;
  }

  if (targetType === 'cut') {
    return splitType !== 'cardio';
  }

  return splitType === 'cardio';
}

@Injectable()
export class PlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  private async getProfileOrThrow(userId: string) {
    const profile = await this.plansRepository.findProfileByUserId(userId);
    if (!profile?.onboardingCompletedAt) {
      throw new AppException('CONFLICT', '用户尚未完成建档', 409);
    }

    return profile as NonNullable<ProfileRow>;
  }

  private toRuleProfileInput(profile: NonNullable<ProfileRow>): RuleProfileInput {
    return {
      gender: profile.gender as RuleProfileInput['gender'],
      birthYear: profile.birthYear,
      heightCm: Number(profile.heightCm),
      currentWeightKg: Number(profile.currentWeightKg),
      targetType: profile.targetType as RuleProfileInput['targetType'],
      activityLevel: profile.activityLevel as RuleProfileInput['activityLevel'],
      trainingExperience: profile.trainingExperience as RuleProfileInput['trainingExperience'],
      trainingDaysPerWeek: profile.trainingDaysPerWeek,
      dietScene: profile.dietScene as RuleProfileInput['dietScene'],
      dietPreferences: profile.dietPreferences as string[],
      dietRestrictions: profile.dietRestrictions as string[],
      supplementOptIn: profile.supplementOptIn,
    };
  }

  private async buildTrainingCycleStatus(userId: string, profile: NonNullable<ProfileRow>, planDate: Date) {
    if (profile.targetType === 'cut') {
      return {
        configured: false,
        startFocus: null,
        currentFocus: null,
        requiresSelection: false,
        suggestedReset: false,
        inactivityDays: null,
        lastCompletedDate: null,
        resetAt: null,
      };
    }

    const startFocus = normalizeTrainingFocus((profile as Record<string, unknown>).trainingCycleStartFocus);
    const resetAtValue = (profile as Record<string, unknown>).trainingCycleResetAt;
    const resetAt = resetAtValue instanceof Date ? resetAtValue : resetAtValue ? new Date(String(resetAtValue)) : null;

    if (!startFocus || !resetAt) {
      return {
        configured: false,
        startFocus: null,
        currentFocus: null,
        requiresSelection: true,
        suggestedReset: false,
        inactivityDays: null,
        lastCompletedDate: null,
        resetAt: null,
      };
    }

    const latestCompletedTraining = await this.plansRepository.findLatestCompletedTrainingForCycle(userId, resetAt, planDate);
    const latestCompletedFocus = latestCompletedTraining ? normalizeTrainingFocus(latestCompletedTraining.focus) : null;
    const inactivityDays = latestCompletedTraining ? getDateDiffInDays(planDate, latestCompletedTraining.checkinDate) : null;

    return {
      configured: true,
      startFocus,
      currentFocus: latestCompletedFocus ? getNextTrainingFocus(latestCompletedFocus) : startFocus,
      requiresSelection: false,
      suggestedReset: Boolean(inactivityDays !== null && inactivityDays >= RESET_SUGGESTION_GAP_DAYS),
      inactivityDays,
      lastCompletedDate: latestCompletedTraining ? toDateOnlyString(latestCompletedTraining.checkinDate) : null,
      resetAt: toDateOnlyString(resetAt),
    };
  }

  async getTrainingCycleStatus(userId: string, planDate: Date) {
    const profile = await this.getProfileOrThrow(userId);
    return this.buildTrainingCycleStatus(userId, profile, planDate);
  }

  async getRuleProfileInput(userId: string) {
    const profile = await this.getProfileOrThrow(userId);
    return this.toRuleProfileInput(profile);
  }

  async generateForDate(userId: string, planDate: Date, force = false) {
    const profileRow = await this.getProfileOrThrow(userId);
    const profile = this.toRuleProfileInput(profileRow);
    const trainingCycle = await this.buildTrainingCycleStatus(userId, profileRow, planDate);
    const nutrition = calculateNutritionTargets(profile, planDate);
    const dietPlan = generateDietPlan(profile, nutrition);
    const trainingPlan = generateTrainingPlan(
      profile,
      planDate,
      trainingCycle.currentFocus ? { forcedFocus: trainingCycle.currentFocus } : undefined,
    );

    return this.plansRepository.saveGeneratedPlan({
      userId,
      planDate,
      nutrition,
      dietPlan,
      trainingPlan,
      regenerate: force,
    });
  }

  async ensurePlanForDate(userId: string, planDate: Date) {
    const existing = await this.plansRepository.findDailyPlanByUserAndDate(userId, planDate);
    if (existing) {
      const profile = await this.getProfileOrThrow(userId);
      if (!doesTrainingPlanConflictWithTarget(profile.targetType as RuleProfileInput['targetType'], existing)) {
        return { ...existing, generated: false };
      }
    }

    return this.generateForDate(userId, planDate, true);
  }
}

