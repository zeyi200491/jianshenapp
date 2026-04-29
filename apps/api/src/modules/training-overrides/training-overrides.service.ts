import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import type { ApplyTrainingOverrideDto } from './dto/apply-training-override.dto';
import { TrainingOverridesRepository } from './training-overrides.repository';

function mapTrainingLike(plan: any) {
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
    items: (plan.items ?? []).map((item: any) => ({
      id: item.id,
      exerciseCode: item.exerciseCode,
      exerciseName: item.exerciseName,
      sets: item.sets,
      reps: item.reps,
      repText: item.repText ?? item.reps,
      sourceType: item.sourceType ?? 'standard',
      rawInput: item.rawInput ?? null,
      restSeconds: item.restSeconds,
      notes: item.notes,
    })),
  };
}

@Injectable()
export class TrainingOverridesService {
  constructor(private readonly repository: TrainingOverridesRepository) {}

  async apply(userId: string, dailyPlanId: string, dto: ApplyTrainingOverrideDto) {
    const dailyPlan = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
    if (!dailyPlan) {
      throw new AppException('NOT_FOUND', '今日计划不存在。', 404);
    }

    const template = await this.repository.findTemplateByIdAndUser(dto.templateId, userId);
    if (!template) {
      throw new AppException('NOT_FOUND', '训练模板不存在。', 404);
    }

    const templateDay = template.days.find((item: { weekday: string }) => item.weekday === dto.weekday);
    if (!templateDay) {
      throw new AppException('VALIDATION_ERROR', '模板中不存在该星期配置。', 400);
    }

    const activeOverride = await this.repository.applyOverride({
      userId,
      dailyPlanId,
      sourceTemplateId: template.id,
      sourceTemplateDayId: templateDay.id,
      sourceWeekday: dto.weekday,
      title: templateDay.title,
      splitType: templateDay.splitType ?? 'rest',
      durationMinutes: templateDay.durationMinutes ?? 0,
      intensityLevel: templateDay.intensityLevel ?? 'low',
      notes: templateDay.notes ?? '',
      items: (templateDay.items ?? []).map((item: any) => ({
        sourceTemplateItemId: item.id,
        exerciseCode: item.exerciseCode,
        exerciseName: item.exerciseName,
        sets: item.sets,
        reps: item.reps,
        repText: item.repText ?? item.reps,
        sourceType: item.sourceType ?? 'standard',
        rawInput: item.rawInput ?? null,
        restSeconds: item.restSeconds,
        notes: item.notes ?? '',
      })),
    });

    return serializeValue({
      dailyPlanId,
      activeTrainingSource: 'user_override',
      systemTrainingPlan: mapTrainingLike(dailyPlan.trainingPlan),
      activeTrainingPlan: mapTrainingLike(activeOverride),
    });
  }

  async remove(userId: string, dailyPlanId: string) {
    const dailyPlan = await this.repository.findDailyPlanByIdAndUser(dailyPlanId, userId);
    if (!dailyPlan) {
      throw new AppException('NOT_FOUND', '今日计划不存在。', 404);
    }

    await this.repository.removeActiveOverride(dailyPlanId, userId);

    return serializeValue({
      dailyPlanId,
      activeTrainingSource: 'system',
      systemTrainingPlan: mapTrainingLike(dailyPlan.trainingPlan),
      activeTrainingPlan: mapTrainingLike(dailyPlan.trainingPlan),
    });
  }
}
