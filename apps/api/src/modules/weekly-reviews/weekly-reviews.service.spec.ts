const path = require('path');
const { WeeklyReviewsService } = require(path.join(__dirname, 'weekly-reviews.service.ts'));

describe('WeeklyReviewsService', () => {
  it('returns empty state when no review exists', async () => {
    const repository = {
      findByWeekStartDate: jest.fn(),
      findLatest: jest.fn().mockResolvedValue(null),
      findActionItemsByWeekStartDate: jest.fn(),
      findWeekSourceData: jest.fn(),
      upsertWeeklyReview: jest.fn(),
      replaceSystemActionItems: jest.fn(),
      updateActionItem: jest.fn(),
    };
    const service = new WeeklyReviewsService(repository);

    await expect(service.getLatest('user-1')).resolves.toEqual({
      review: null,
      emptyReason: '暂无可用周复盘，请先完成本周计划与打卡。',
    });
  });

  it('generates weekly review from plans and checkins', async () => {
    const repository = {
      findByWeekStartDate: jest.fn(),
      findLatest: jest.fn(),
      findActionItemsByWeekStartDate: jest.fn(),
      findWeekSourceData: jest.fn().mockResolvedValue([
        [{ planDate: new Date('2026-03-23T00:00:00.000Z') }, { planDate: new Date('2026-03-25T00:00:00.000Z') }],
        [
          {
            checkinDate: new Date('2026-03-23T00:00:00.000Z'),
            dietCompletionRate: 80,
            trainingCompletionRate: 90,
            weightKg: 72,
            energyLevel: 4,
            satietyLevel: 3,
            fatigueLevel: 2,
          },
          {
            checkinDate: new Date('2026-03-25T00:00:00.000Z'),
            dietCompletionRate: 70,
            trainingCompletionRate: 60,
            weightKg: 71.5,
            energyLevel: 3,
            satietyLevel: 3,
            fatigueLevel: 3,
          },
        ],
        { targetType: 'cut' },
      ]),
      upsertWeeklyReview: jest.fn().mockImplementation(async (_userId, weekStartDate, weekEndDate, payload) => ({
        id: 'review-1',
        weekStartDate,
        weekEndDate,
        ...payload,
      })),
      replaceSystemActionItems: jest.fn().mockResolvedValue([
        {
          id: 'action-1',
          userId: 'user-1',
          weeklyReviewId: 'review-1',
          weekStartDate: new Date('2026-03-23T00:00:00.000Z'),
          title: '本周至少完成 3 次训练',
          source: 'system_generated',
          status: 'pending',
          sortOrder: 0,
          completedAt: null,
          createdAt: new Date('2026-03-24T00:00:00.000Z'),
          updatedAt: new Date('2026-03-24T00:00:00.000Z'),
        },
      ]),
      updateActionItem: jest.fn(),
    };
    const service = new WeeklyReviewsService(repository);

    const result = await service.generate('user-1', '2026-03-23');

    expect(result.avgDietCompletionRate).toBe(75);
    expect(result.checkedInDays).toBe(2);
    expect(result.weekStartDate).toBe('2026-03-23');
    expect(result.actionItems).toEqual([
      expect.objectContaining({
        id: 'action-1',
        title: '本周至少完成 3 次训练',
        status: 'pending',
        source: 'system_generated',
      }),
    ]);
    expect(repository.upsertWeeklyReview).toHaveBeenCalled();
    expect(repository.replaceSystemActionItems).toHaveBeenCalledWith(
      'user-1',
      'review-1',
      new Date('2026-03-23T00:00:00.000Z'),
      expect.any(Array),
    );
  });

  it('ignores missing signal fields when generating weekly review', async () => {
    const repository = {
      findByWeekStartDate: jest.fn(),
      findLatest: jest.fn(),
      findActionItemsByWeekStartDate: jest.fn(),
      findWeekSourceData: jest.fn().mockResolvedValue([
        [{ planDate: new Date('2026-03-23T00:00:00.000Z') }, { planDate: new Date('2026-03-25T00:00:00.000Z') }],
        [
          {
            checkinDate: new Date('2026-03-23T00:00:00.000Z'),
            dietCompletionRate: 80,
            trainingCompletionRate: 90,
            weightKg: 72,
            energyLevel: null,
            satietyLevel: null,
            fatigueLevel: null,
          },
          {
            checkinDate: new Date('2026-03-25T00:00:00.000Z'),
            dietCompletionRate: 70,
            trainingCompletionRate: 60,
            weightKg: 71.5,
            energyLevel: 4,
            satietyLevel: null,
            fatigueLevel: 2,
          },
        ],
        { targetType: 'cut' },
      ]),
      upsertWeeklyReview: jest.fn().mockImplementation(async (_userId, weekStartDate, weekEndDate, payload) => ({
        id: 'review-2',
        weekStartDate,
        weekEndDate,
        ...payload,
      })),
      replaceSystemActionItems: jest.fn().mockResolvedValue([]),
      updateActionItem: jest.fn(),
    };
    const service = new WeeklyReviewsService(repository);

    const result = await service.generate('user-1', '2026-03-23');

    expect(result.risks).not.toContain('低精力反馈偏多，可能存在睡眠、恢复或热量安排不足。');
    expect(result.risks).not.toContain('疲劳感偏高，下周应优先控制训练总量和恢复质量。');
    expect(result.avgDietCompletionRate).toBe(75);
  });

  it('returns latest review with persisted action items', async () => {
    const repository = {
      findByWeekStartDate: jest.fn(),
      findLatest: jest.fn().mockResolvedValue({
        id: 'review-1',
        weekStartDate: new Date('2026-03-23T00:00:00.000Z'),
        weekEndDate: new Date('2026-03-29T00:00:00.000Z'),
        planDays: 4,
        checkedInDays: 3,
        avgDietCompletionRate: 78,
        avgTrainingCompletionRate: 82,
        weightChangeKg: -0.8,
        highlights: ['训练完成度稳定'],
        risks: ['补水不足'],
        recommendations: ['晚餐蛋白再补足一点'],
        narrativeText: '整体节奏稳定。',
        generationVersion: 'review-v1',
        generatedAt: new Date('2026-03-29T00:00:00.000Z'),
        createdAt: new Date('2026-03-29T00:00:00.000Z'),
      }),
      findActionItemsByWeekStartDate: jest.fn().mockResolvedValue([
        {
          id: 'action-1',
          userId: 'user-1',
          weeklyReviewId: 'review-1',
          weekStartDate: new Date('2026-03-23T00:00:00.000Z'),
          title: '晚餐优先补足蛋白质',
          source: 'system_generated',
          status: 'completed',
          sortOrder: 0,
          completedAt: new Date('2026-03-30T12:00:00.000Z'),
          createdAt: new Date('2026-03-29T00:00:00.000Z'),
          updatedAt: new Date('2026-03-30T12:00:00.000Z'),
        },
      ]),
      findWeekSourceData: jest.fn(),
      upsertWeeklyReview: jest.fn(),
      replaceSystemActionItems: jest.fn(),
      updateActionItem: jest.fn(),
    };
    const service = new WeeklyReviewsService(repository);

    const result = await service.getLatest('user-1');

    expect(result.actionItems).toEqual([
      expect.objectContaining({
        id: 'action-1',
        title: '晚餐优先补足蛋白质',
        status: 'completed',
      }),
    ]);
  });

  it('updates persisted action item status', async () => {
    const repository = {
      findByWeekStartDate: jest.fn(),
      findLatest: jest.fn(),
      findActionItemsByWeekStartDate: jest.fn(),
      findWeekSourceData: jest.fn(),
      upsertWeeklyReview: jest.fn(),
      replaceSystemActionItems: jest.fn(),
      updateActionItem: jest.fn().mockResolvedValue({
        id: 'action-1',
        userId: 'user-1',
        weeklyReviewId: 'review-1',
        weekStartDate: new Date('2026-03-23T00:00:00.000Z'),
        title: '本周至少完成 3 次训练',
        source: 'system_generated',
        status: 'completed',
        sortOrder: 0,
        completedAt: new Date('2026-03-30T10:00:00.000Z'),
        createdAt: new Date('2026-03-29T00:00:00.000Z'),
        updatedAt: new Date('2026-03-30T10:00:00.000Z'),
      }),
    };
    const service = new WeeklyReviewsService(repository);

    const result = await service.updateActionItem('user-1', 'action-1', 'completed');

    expect(repository.updateActionItem).toHaveBeenCalledWith('user-1', 'action-1', 'completed');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'action-1',
        status: 'completed',
        completedAt: '2026-03-30T10:00:00.000Z',
      }),
    );
  });
});
