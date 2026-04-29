'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getTodayDateString, shiftDateString } from '@/lib/date';
import {
  buildCoachTip,
  buildCompletionSummary,
  buildDailyEncouragement,
  buildReadinessState,
  formatHeadlineDate,
  toOptionalNumber,
} from '@/lib/check-in-view';
import { getStateLabel } from '@/lib/display-state';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { CheckInDetailSection } from '@/components/web/check-in/check-in-detail-section';
import { CheckInOverviewSection } from '@/components/web/check-in/check-in-overview-section';
import { useCheckInEditor } from '@/lib/use-check-in-editor';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import { useCheckInUrlState } from '@/lib/use-check-in-url-state';
import {
  DashboardCard,
  DashboardShell,
  MetricPill,
  PanelTag,
  SectionEyebrow,
} from '@/components/web/dashboard-shell';

export default function CheckInPage() {
  const router = useRouter();
  const { date, setDate, mode, setMode } = useCheckInUrlState(getTodayDateString());
  const {
    today,
    existingRecord,
    form,
    loading,
    error,
    success,
    isPending,
    hasUnsavedChanges,
    updateField,
    handleSubmit,
  } = useCheckInEditor({
    router,
    date,
  });

  const dietCompletionValue = toOptionalNumber(form.dietCompletionRate);
  const trainingCompletionValue = toOptionalNumber(form.trainingCompletionRate);
  const waterIntakeValue = toOptionalNumber(form.waterIntakeMl);
  const stepCountValue = toOptionalNumber(form.stepCount);
  const energyLevelValue = toOptionalNumber(form.energyLevel);
  const satietyLevelValue = toOptionalNumber(form.satietyLevel);
  const fatigueLevelValue = toOptionalNumber(form.fatigueLevel);

  const completionSummary = useMemo(
    () => buildCompletionSummary(dietCompletionValue, trainingCompletionValue),
    [dietCompletionValue, trainingCompletionValue],
  );
  const dailyEncouragement = useMemo(() => buildDailyEncouragement(date), [date]);
  const readinessState = useMemo(
    () => buildReadinessState(existingRecord, energyLevelValue, satietyLevelValue, fatigueLevelValue),
    [energyLevelValue, existingRecord, fatigueLevelValue, satietyLevelValue],
  );
  const coachTip = useMemo(() => buildCoachTip(form, today), [form, today]);

  useUnsavedChangesWarning(
    hasUnsavedChanges && !isPending,
    '当前有未保存的打卡内容，离开后会丢失，确认继续吗？',
  );

  function requestDateChange(nextDate: string) {
    if (hasUnsavedChanges && !window.confirm('当前有未保存的打卡内容，切换日期后会丢失，确认继续吗？')) {
      return;
    }

    setDate(nextDate);
  }

  return (
    <DashboardShell
      currentPath="/check-in"
      sidebarHint="今天还没开始？"
      primaryCta={{ label: '完成今日打卡', href: '/check-in' }}
      header={
        <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr] xl:grid-cols-[1fr_0.42fr] xl:items-start">
          <div>
            <SectionEyebrow>Daily Checklist</SectionEyebrow>
            <h1 className="mt-3 text-[52px] font-semibold leading-none text-[#1b3042] sm:text-[64px]">每日打卡</h1>
            <p className="mt-4 text-[34px] font-semibold text-[#1b3042]">{formatHeadlineDate(date)}</p>
            <p className="mt-5 max-w-3xl text-2xl leading-10 text-[#5f768d]">{dailyEncouragement}</p>
          </div>
          <DashboardCard className="bg-[#edf3f8]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-[#20364a]">打卡同步状态</p>
              <PanelTag tone={readinessState.kind === 'actual' ? 'deep' : 'soft'}>{getStateLabel(readinessState.kind)}</PanelTag>
            </div>
            <div className="mt-5 rounded-[26px] bg-white px-5 py-5">
              <p className="text-[40px] font-semibold text-[#20364a]">{readinessState.value}</p>
              <p className="mt-3 text-sm leading-7 text-[#5d7288]">{readinessState.detail}</p>
            </div>
            {existingRecord ? (
              <div className="mt-4 grid gap-3">
                <MetricPill label="饮食完成度" value={`${existingRecord.dietCompletionRate}%`} />
                <MetricPill label="训练完成度" value={`${existingRecord.trainingCompletionRate}%`} accent />
              </div>
            ) : null}
          </DashboardCard>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在加载每日打卡上下文...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {success ? <LiveStatusCard tone="success">{success}</LiveStatusCard> : null}

      <form onSubmit={(event) => handleSubmit(event, mode)} className="space-y-6">
        <CheckInOverviewSection
          mode={mode}
          date={date}
          today={today}
          dietCompletionValue={dietCompletionValue}
          trainingCompletionValue={trainingCompletionValue}
          completionSummary={completionSummary}
          coachTip={coachTip}
          onSetMode={setMode}
          onRequestDateChange={requestDateChange}
          onDietCompletionChange={(value) => updateField('dietCompletionRate', value)}
          onTrainingCompletionChange={(value) => updateField('trainingCompletionRate', value)}
          getTodayDateString={getTodayDateString}
          shiftDateString={shiftDateString}
        />

        <CheckInDetailSection
          mode={mode}
          form={form}
          waterIntakeValue={waterIntakeValue}
          stepCountValue={stepCountValue}
          onSetMode={setMode}
          onUpdateField={updateField}
        />

        <DashboardCard className="bg-transparent p-0 shadow-none">
          <div className="mx-auto max-w-[760px] rounded-[44px] bg-[linear-gradient(90deg,#0f7ea5,#63b9ec)] px-8 py-8 text-center text-white shadow-[0_28px_70px_rgba(57,156,214,0.28)]">
            <p className="text-[44px] font-semibold">完成今日打卡 →</p>
            <p className="mt-4 text-lg text-white/84">打卡结果会同步进入你的每周复盘报告。</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="submit"
                disabled={loading || isPending || !today}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0f6f96] disabled:opacity-60"
              >
                {isPending ? '提交中...' : '提交今日打卡'}
              </button>
              <MetricPill label="记录状态" value={existingRecord ? '已有记录，可继续更新' : '首次提交'} />
              <MetricPill label="综合完成度" value={completionSummary === null ? '待填写' : `${completionSummary}%`} />
              <Link href="/review" className="rounded-full bg-white/12 px-5 py-3 text-sm font-semibold text-white">
                去看周复盘
              </Link>
            </div>
          </div>
        </DashboardCard>
      </form>
    </DashboardShell>
  );
}
