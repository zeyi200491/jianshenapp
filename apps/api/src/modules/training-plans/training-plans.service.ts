import { resolveTrainingItemMetadata } from '@campusfit/rule-engine';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { toDateOnlyString } from '../../common/utils/date.util';
import { serializeValue } from '../../common/utils/serialize.util';
import { PlansRepository } from '../plans/plans.repository';

@Injectable()
export class TrainingPlansService {
  constructor(private readonly plansRepository: PlansRepository) {}

  async getDetail(userId: string, id: string) {
    const plan = await this.plansRepository.findTrainingPlanByIdAndUser(id, userId);
    if (!plan) {
      throw new AppException('NOT_FOUND', '训练计划不存在', 404);
    }

    return serializeValue({
      id: plan.id,
      title: plan.title,
      splitType: plan.splitType,
      planDate: toDateOnlyString(plan.dailyPlan.planDate),
      summary: plan.notes,
      attentionNotes: plan.notes ? [plan.notes] : [],
      items: plan.items.map((item: {
        id: string;
        exerciseCode: string;
        exerciseName: string;
        sets: number;
        reps: string;
        restSeconds: number;
        notes: string;
      }) => {
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
    });
  }
}
