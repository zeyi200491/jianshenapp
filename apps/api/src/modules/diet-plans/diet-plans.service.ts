import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { toDateOnlyString } from '../../common/utils/date.util';
import { serializeValue } from '../../common/utils/serialize.util';
import { PlansRepository } from '../plans/plans.repository';

function buildMealTarget(item: {
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}) {
  return `${item.targetCalories} kcal / P${item.proteinG} C${item.carbsG} F${item.fatG}`;
}

@Injectable()
export class DietPlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  async getDetail(userId: string, id: string) {
    const plan = await this.plansRepository.findDietPlanByIdAndUser(id, userId);
    if (!plan) {
      throw new AppException('NOT_FOUND', '饮食计划不存在', 404);
    }

    return serializeValue({
      id: plan.id,
      scene: plan.scene,
      summary: plan.summary,
      planDate: toDateOnlyString(plan.dailyPlan.planDate),
      calorieTarget: plan.dailyPlan.calorieTarget,
      proteinTargetG: plan.dailyPlan.proteinTargetG,
      carbTargetG: plan.dailyPlan.carbTargetG,
      fatTargetG: plan.dailyPlan.fatTargetG,
      supplementSuggestions: plan.supplementNotes,
      meals: plan.items.map((item: {
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
    });
  }
}