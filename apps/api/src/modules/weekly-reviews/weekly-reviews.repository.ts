import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeeklyReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLatest(userId: string) {
    return this.prisma.weeklyReview.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' },
    });
  }

  findByWeekStartDate(userId: string, weekStartDate: Date) {
    return this.prisma.weeklyReview.findUnique({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate,
        },
      },
    });
  }

  findActionItemsByWeekStartDate(userId: string, weekStartDate: Date) {
    return this.prisma.weeklyReviewActionItem.findMany({
      where: {
        userId,
        weekStartDate,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findWeekSourceData(userId: string, weekStartDate: Date, weekEndDate: Date) {
    return Promise.all([
      this.prisma.dailyPlan.findMany({
        where: {
          userId,
          planDate: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
        },
        orderBy: { planDate: 'asc' },
      }),
      this.prisma.checkIn.findMany({
        where: {
          userId,
          checkinDate: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
        },
        orderBy: { checkinDate: 'asc' },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId },
      }),
    ]);
  }

  upsertWeeklyReview(userId: string, weekStartDate: Date, weekEndDate: Date, payload: {
    planDays: number;
    checkedInDays: number;
    avgDietCompletionRate: number;
    avgTrainingCompletionRate: number;
    weightChangeKg: number;
    highlights: string[];
    risks: string[];
    recommendations: string[];
    narrativeText: string;
  }) {
    return this.prisma.weeklyReview.upsert({
      where: {
        userId_weekStartDate: {
          userId,
          weekStartDate,
        },
      },
      create: {
        userId,
        weekStartDate,
        weekEndDate,
        generationVersion: 'review-v1',
        generatedAt: new Date(),
        ...payload,
      },
      update: {
        weekEndDate,
        generationVersion: 'review-v1',
        generatedAt: new Date(),
        ...payload,
      },
    });
  }

  async replaceSystemActionItems(userId: string, weeklyReviewId: string, weekStartDate: Date, titles: string[]) {
    const existingItems = await this.prisma.weeklyReviewActionItem.findMany({
      where: {
        userId,
        weekStartDate,
        source: 'system_generated',
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const completedItems = existingItems.filter((item: { status: string }) => item.status === 'completed');
    const completedTitles = new Set(completedItems.map((item: { title: string }) => item.title));
    const nextSortOrder =
      completedItems.reduce((max: number, item: { sortOrder: number }) => Math.max(max, item.sortOrder), -1) + 1;

    await this.prisma.weeklyReviewActionItem.deleteMany({
      where: {
        userId,
        weekStartDate,
        source: 'system_generated',
        status: 'pending',
      },
    });

    const pendingTitles = titles.filter((title) => !completedTitles.has(title));

    if (pendingTitles.length > 0) {
      await this.prisma.weeklyReviewActionItem.createMany({
        data: pendingTitles.map((title, index) => ({
          userId,
          weeklyReviewId,
          weekStartDate,
          title,
          source: 'system_generated',
          status: 'pending',
          sortOrder: nextSortOrder + index,
        })),
      });
    }

    return this.findActionItemsByWeekStartDate(userId, weekStartDate);
  }

  async updateActionItem(userId: string, actionItemId: string, status: 'pending' | 'completed') {
    const actionItems = await this.prisma.weeklyReviewActionItem.findMany({
      where: {
        userId,
      },
    });
    const target = actionItems.find((item: { id: string }) => item.id === actionItemId);
    if (!target) {
      return null;
    }

    return this.prisma.weeklyReviewActionItem.update({
      where: { id: actionItemId },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
    });
  }
}
