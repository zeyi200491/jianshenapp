'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  fetchLatestWeeklyReview,
  generateWeeklyReview,
  updateWeeklyReviewActionItem,
  type WeeklyReviewActionItem,
  type WeeklyReviewPayload,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { getWeekStartDateString } from '@/lib/date';
import { buildReviewHeaderState } from '@/lib/display-state';
import { DashboardShell, MetricPill, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { ReviewActionItemsSection } from '@/components/web/review/review-action-items-section';
import { ReviewOverviewSection } from '@/components/web/review/review-overview-section';
import { describeUserFacingError } from '@/lib/user-facing-error';

function normalizeMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '周复盘暂时没有加载成功。',
    nextStep: '稍后重试，或先完成今天打卡后再回来查看。',
    dataStatus: '已经生成的复盘和行动项不会丢失。',
  });
}

function validateWeekStartDate(value: string) {
  if (!value) {
    return '请选择周起始日。';
  }

  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  if (day !== 1) {
    return '周复盘默认按周一开始，请选择周一日期。';
  }

  return null;
}

function summarizeNarrative(narrative: string) {
  const firstSentence = narrative.split(/[。！？]/).map((item) => item.trim()).find(Boolean);
  return firstSentence ? `${firstSentence}。` : '本周整体表现稳定，趋势反馈可用于下周微调。';
}

function formatWeightChange(weightChangeKg: number) {
  if (weightChangeKg > 0) return `+${weightChangeKg} kg`;
  if (weightChangeKg < 0) return `${weightChangeKg} kg`;
  return '0 kg';
}

const REVIEW_PAGE_TITLE = '数据复盘';

export default function ReviewPage() {
  const router = useRouter();
  const [weekStartDate] = useState(getWeekStartDateString());
  const [payload, setPayload] = useState<WeeklyReviewPayload | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingActionItemId, setUpdatingActionItemId] = useState('');
  const [isPending, startTransition] = useTransition();

  async function load(targetWeekStartDate?: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    const validationError = validateWeekStartDate(targetWeekStartDate || '');
    if (validationError) {
      setPayload(null);
      setLoading(false);
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await fetchLatestWeeklyReview(session.accessToken, targetWeekStartDate);
      setPayload(result);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return;
      }

      if (loadError instanceof ApiError && loadError.code === 'CONFLICT') {
        setStoredSessionOnboardingStatus(false);
        router.replace('/onboarding');
        return;
      }

      setError(describeUserFacingError(loadError, {
        whatHappened: '周复盘暂时没有加载成功。',
        nextStep: '稍后重试，或先完成今天打卡后再回来查看。',
        dataStatus: '已经生成的复盘和行动项不会丢失。',
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(weekStartDate);
  }, [weekStartDate]);

  function handleGenerate() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    const validationError = validateWeekStartDate(weekStartDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');

    startTransition(async () => {
      try {
        const review = await generateWeeklyReview(session.accessToken, weekStartDate);
        const { actionItems, ...reviewData } = review;
        setPayload({ review: reviewData, actionItems, emptyReason: null });
        setSuccess('本周复盘已生成，趋势与建议已刷新。');
      } catch (generateError) {
        if (generateError instanceof ApiError && generateError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }

        setError(describeUserFacingError(generateError, {
          whatHappened: '这次下周计划预览没有生成成功。',
          nextStep: '稍后再试一次，或先确认本周打卡是否完整。',
          dataStatus: '之前已经生成的复盘内容不会丢失。',
        }));
      }
    });
  }

  function handleToggleActionItem(item: WeeklyReviewActionItem) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    if (!payload?.review) {
      return;
    }

    const nextStatus: WeeklyReviewActionItem['status'] = item.status === 'completed' ? 'pending' : 'completed';
    const previousActionItems = payload.actionItems;

    setError('');
    setSuccess('');
    setUpdatingActionItemId(item.id);
    setPayload((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        actionItems: current.actionItems.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: nextStatus,
                completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
              }
            : currentItem,
        ),
      };
    });

    void updateWeeklyReviewActionItem(session.accessToken, item.id, { status: nextStatus })
      .then((updatedItem) => {
        setPayload((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            actionItems: current.actionItems.map((currentItem) =>
              currentItem.id === updatedItem.id ? updatedItem : currentItem,
            ),
          };
        });
        setSuccess('下周行动清单已更新。');
      })
      .catch((updateError) => {
        if (updateError instanceof ApiError && updateError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }

        setPayload((current) => (current ? { ...current, actionItems: previousActionItems } : current));
        setError(describeUserFacingError(updateError, {
          whatHappened: '行动项状态还没有更新成功。',
          nextStep: '稍后重试一次，或刷新页面后继续操作。',
          dataStatus: '当前复盘内容仍然保留。',
        }));
      })
      .finally(() => {
        setUpdatingActionItemId('');
      });
  }

  const review = payload?.review ?? null;
  const actionItems = payload?.actionItems ?? [];
  const balanceValue = review ? Math.round((review.avgDietCompletionRate + review.avgTrainingCompletionRate) / 2) : 0;
  const coverageValue = review && review.planDays > 0 ? Math.round((review.checkedInDays / review.planDays) * 100) : 0;
  const headerState = useMemo(() => buildReviewHeaderState(review, weekStartDate), [review, weekStartDate]);
  const weightChangeLabel = review ? formatWeightChange(review.weightChangeKg) : '0 kg';
  const narrativeSummary = review ? summarizeNarrative(review.narrativeText) : '';

  return (
    <DashboardShell
      currentPath="/review"
      sidebarHint="今天还没有开始？"
      primaryCta={{ label: '查看今日任务', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Progress Report · {REVIEW_PAGE_TITLE}</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">{headerState.title}</h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">{headerState.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MetricPill label="周起始日" value={weekStartDate} />
            <button type="button" onClick={handleGenerate} disabled={isPending || loading} className="rounded-full bg-[#4fb3ea] px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(79,179,234,0.3)] disabled:opacity-60">
              {isPending ? '生成中...' : '下周计划预览'}
            </button>
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在读取周复盘...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {success ? <LiveStatusCard tone="success">{success}</LiveStatusCard> : null}
      {!loading && !review && payload?.emptyReason ? <LiveStatusCard tone="loading">{payload.emptyReason}</LiveStatusCard> : null}

      {review ? (
        <>
          <ReviewOverviewSection
            review={review}
            balanceValue={balanceValue}
            coverageValue={coverageValue}
            weightChangeLabel={weightChangeLabel}
            narrativeSummary={narrativeSummary}
          />
          <ReviewActionItemsSection
            actionItems={actionItems}
            updatingActionItemId={updatingActionItemId}
            onToggleActionItem={handleToggleActionItem}
          />
        </>
      ) : null}
    </DashboardShell>
  );
}
