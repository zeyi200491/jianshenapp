import { calculateNutritionTargets, generateWeeklyDietPlan, getDisplayDietSceneLabel, resolveTrainingItemMetadata } from '@campusfit/rule-engine';
import { Injectable, Optional } from '@nestjs/common';
import { parseDateOnly, toDateOnlyString } from '../../common/utils/date.util';
import { serializeValue } from '../../common/utils/serialize.util';
import { CheckInsRepository } from '../check-ins/check-ins.repository';
import { buildDietPlanMeals, buildEffectiveDailyTotals } from '../meal-intakes/meal-intake-presenter';
import { PlansService } from '../plans/plans.service';
import { TrainingOverridesRepository } from '../training-overrides/training-overrides.repository';
import { WeeklyReviewsRepository } from '../weekly-reviews/weekly-reviews.repository';

function buildMealTarget(item: {
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}) {
  return `${item.targetCalories} kcal / P${item.proteinG} C${item.carbsG} F${item.fatG}`;
}

function mapTrainingPlan(plan: any) {
  if (!plan) {
    return null;
  }

  return {
    id: plan.id,
    title: plan.title,
    splitType: plan.splitType,
    durationMinutes: plan.durationMinutes,
    intensityLevel: plan.intensityLevel,
    notes: plan.notes,
    items: (plan.items ?? []).map((item: any) => {
      const metadata = resolveTrainingItemMetadata({
        exerciseCode: item.exerciseCode,
        exerciseName: item.exerciseName,
        restSeconds: item.restSeconds,
      });

      return {
        id: item.id,
        name: item.exerciseName,
        sets: item.sets,
        reps: item.reps,
        restSeconds: metadata.restSeconds,
        movementPattern: metadata.movementPattern,
        restRuleSource: metadata.restRuleSource,
        restHint: metadata.restHint,
        notes: item.notes ? [item.notes] : [],
      };
    }),
  };
}

@Injectable()
export class TodayService {
  constructor(
    private readonly plansService: PlansService,
    private readonly checkInsRepository: CheckInsRepository,
    private readonly weeklyReviewsRepository: WeeklyReviewsRepository,
    @Optional() private readonly trainingOverridesRepository?: TrainingOverridesRepository,
  ) {}

  async getToday(userId: string, date?: string) {
    const targetDate = parseDateOnly(date);
    const [plan, trainingCycle, checkIn, latestReview, profile] = await Promise.all([
      this.plansService.ensurePlanForDate(userId, targetDate),
      this.plansService.getTrainingCycleStatus(userId, targetDate),
      this.checkInsRepository.findByDate(userId, targetDate),
      this.weeklyReviewsRepository.findLatest(userId),
      this.plansService.getRuleProfileInput(userId),
    ]);
    const weeklyDietPlan = generateWeeklyDietPlan(profile, calculateNutritionTargets(profile, targetDate), targetDate);
    const dietPlanMeals = plan.dietPlan
      ? buildDietPlanMeals(plan.dietPlan.items, plan.mealIntakeOverrides ?? [])
      : [];
    const effectiveDailyTotals = plan.dietPlan
      ? buildEffectiveDailyTotals(plan.dietPlan.items, plan.mealIntakeOverrides ?? [])
      : {
          calories: plan.calorieTarget,
          proteinG: plan.proteinTargetG,
          carbG: plan.carbTargetG,
          fatG: plan.fatTargetG,
        };
    const activeOverride =
      plan.activeTrainingOverride ??
      (this.trainingOverridesRepository
        ? await this.trainingOverridesRepository.findActiveByDailyPlanIdAndUser(plan.id, userId)
        : null);
    const systemTrainingPlan = mapTrainingPlan(plan.trainingPlan);
    const activeTrainingPlan = mapTrainingPlan(activeOverride ?? plan.trainingPlan);
    const activeTrainingSource = activeOverride ? 'user_override' : 'system';

    return serializeValue({
      date: toDateOnlyString(targetDate),
      dailyPlanId: plan.id,
      summary: {
        calorieTarget: plan.calorieTarget,
        proteinTargetG: plan.proteinTargetG,
        carbTargetG: plan.carbTargetG,
        fatTargetG: plan.fatTargetG,
      },
      effectiveDailyTotals,
      dietPlan: plan.dietPlan
        ? {
            id: plan.dietPlan.id,
            scene: plan.dietPlan.scene,
            sceneDisplay: getDisplayDietSceneLabel(plan.dietPlan.scene),
            summary: plan.dietPlan.summary,
            meals: dietPlanMeals,
            legacyMeals: plan.dietPlan.items.map((item: {
              id: string;
              mealType: string;
              title: string;
              suggestionText: string;
              targetCalories: number;
              proteinG: number;
              carbsG: number;
              fatG: number;
              alternatives: string[];
            }) => ({
              id: item.id,
              mealType: item.mealType,
              title: item.title,
              description: item.suggestionText,
              target: buildMealTarget(item),
              foods: [],
              alternatives: item.alternatives,
              notes: [],
            })),
          }
        : null,
      weeklyDietPlan,
      trainingPlan: activeTrainingPlan,
      systemTrainingPlan,
      activeTrainingPlan,
      activeTrainingSource,
      trainingCycle,
      checkInStatus: {
        hasCheckedIn: Boolean(checkIn),
        dietCompletionRate: checkIn?.dietCompletionRate ?? null,
        trainingCompletionRate: checkIn?.trainingCompletionRate ?? null,
      },
      reviewHint: {
        hasWeeklyReview: Boolean(latestReview),
        latestWeekStartDate: latestReview ? toDateOnlyString(latestReview.weekStartDate) : null,
      },
      productEntry: {
        featuredCategory: 'supplement',
      },
    });
  }
}
