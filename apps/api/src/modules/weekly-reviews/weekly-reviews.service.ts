import { generateWeeklyReview } from '@campusfit/rule-engine';
import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { getWeekEndDate, getWeekStartDate, parseDateOnly, toDateOnlyString } from '../../common/utils/date.util';
import { serializeValue } from '../../common/utils/serialize.util';
import { WeeklyReviewsRepository } from './weekly-reviews.repository';

const DEFAULT_ACTION_TITLES = [
  '本周至少完成 3 次训练',
  '晚餐优先补足蛋白质',
  '疲劳感高于 4 时主动减量或拉伸恢复',
];

@Injectable()
export class WeeklyReviewsService {
  constructor(private readonly weeklyReviewsRepository: WeeklyReviewsRepository) {}

  async getLatest(userId: string, weekStartDate?: string) {
    const review = weekStartDate
      ? await this.weeklyReviewsRepository.findByWeekStartDate(userId, parseDateOnly(weekStartDate))
      : await this.weeklyReviewsRepository.findLatest(userId);

    if (!review) {
      return {
        review: null,
        emptyReason: '暂无可用周复盘，请先完成本周计划与打卡。',
      };
    }

    const actionItems = await this.weeklyReviewsRepository.findActionItemsByWeekStartDate(userId, review.weekStartDate);

    return {
      review: serializeValue({
        ...review,
        weekStartDate: toDateOnlyString(review.weekStartDate),
        weekEndDate: toDateOnlyString(review.weekEndDate),
      }),
      actionItems: serializeValue(actionItems),
      emptyReason: null,
    };
  }

  async generate(userId: string, weekStartDateInput: string) {
    const weekStartDate = getWeekStartDate(parseDateOnly(weekStartDateInput));
    const weekEndDate = getWeekEndDate(weekStartDate);
    const [plans, checkIns, profile] = await this.weeklyReviewsRepository.findWeekSourceData(userId, weekStartDate, weekEndDate);

    if (!profile) {
      throw new AppException('CONFLICT', '用户尚未完成建档', 409);
    }

    const reviewPayload = generateWeeklyReview({
      targetType: profile.targetType as 'cut' | 'maintain' | 'bulk',
      planDates: (plans as Array<{ planDate: Date }>).map((plan) => toDateOnlyString(plan.planDate)),
      checkIns: (checkIns as Array<{
        checkinDate: Date;
        dietCompletionRate: number;
        trainingCompletionRate: number;
        weightKg: number | null;
        energyLevel: number | null;
        satietyLevel: number | null;
        fatigueLevel: number | null;
      }>).map((item) => ({
        checkinDate: toDateOnlyString(item.checkinDate),
        dietCompletionRate: item.dietCompletionRate,
        trainingCompletionRate: item.trainingCompletionRate,
        weightKg: item.weightKg ? Number(item.weightKg) : null,
        energyLevel: item.energyLevel ?? null,
        satietyLevel: item.satietyLevel ?? null,
        fatigueLevel: item.fatigueLevel ?? null,
      })),
    });

    const review = await this.weeklyReviewsRepository.upsertWeeklyReview(userId, weekStartDate, weekEndDate, reviewPayload);
    const actionItems = await this.weeklyReviewsRepository.replaceSystemActionItems(
      userId,
      review.id,
      weekStartDate,
      this.buildActionItems(reviewPayload.recommendations as string[]),
    );

    return serializeValue({
      ...review,
      weekStartDate: toDateOnlyString(review.weekStartDate),
      weekEndDate: toDateOnlyString(review.weekEndDate),
      actionItems,
    });
  }

  async updateActionItem(userId: string, actionItemId: string, status: 'pending' | 'completed') {
    const actionItem = await this.weeklyReviewsRepository.updateActionItem(userId, actionItemId, status);
    if (!actionItem) {
      throw new AppException('NOT_FOUND', '周行动清单不存在', 404);
    }

    return serializeValue(actionItem);
  }

  private buildActionItems(recommendations: string[]) {
    const items = recommendations.filter(Boolean).slice(0, 3);

    if (items.length === 3) {
      return items;
    }

    for (const fallback of DEFAULT_ACTION_TITLES) {
      if (items.length >= 3) {
        break;
      }
      if (!items.includes(fallback)) {
        items.push(fallback);
      }
    }

    return items;
  }
}
