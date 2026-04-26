'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  type IntensityLevel,
  type MovementPattern,
  type TrainingFocus,
} from '@/lib/api';
import { clearStoredSession } from '@/lib/auth';
import { getTodayDateString } from '@/lib/date';
import { buildEnergyInsight } from '@/lib/display-state';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { ProfileSettingsForm } from '@/components/web/today/profile-settings-form';
import { TodayCoachSection } from '@/components/web/today/today-coach-section';
import { TodayOverviewSection } from '@/components/web/today/today-overview-section';
import { TrainingPlanPanel } from '@/components/web/today/training-plan-panel';
import { buildProfileForm, type ProfileFormState, useTodayDashboard } from '@/lib/use-today-dashboard';
import {
  buildCheckInInsight,
  buildFocusOptions,
  buildHeroMetrics,
  buildMacroSummary,
  formatProfileList,
  formatTargetType,
} from '@/lib/today-dashboard-view';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';
import {
  DashboardShell,
  MetricPill,
} from '@/components/web/dashboard-shell';

const trainingFocusLabels: Record<TrainingFocus, string> = {
  push: '推日',
  pull: '拉日',
  legs: '腿日',
};

const trainingFocusMeta: Record<TrainingFocus, { areas: string; description: string }> = {
  push: {
    areas: '胸 / 肩 / 三头',
    description: '适合今天从上肢推动作开练，系统会把今天作为新的推日。',
  },
  pull: {
    areas: '背 / 后束 / 二头',
    description: '适合休息后先找回背部发力感觉，并把循环继续接上。',
  },
  legs: {
    areas: '臀 / 腿 / 核心',
    description: '适合直接从腿日重启节奏，后续继续推拉腿循环。',
  },
};

const movementPatternLabelMap: Record<MovementPattern, string> = {
  compound: '复合',
  isolation: '孤立',
  recovery: '恢复',
};

const intensityLabelMap: Record<IntensityLevel, string> = {
  low: '低',
  medium: '中等',
  high: '中高',
};

function isSameProfileForm(left: ProfileFormState, right: ProfileFormState) {
  return (
    left.heightCm === right.heightCm &&
    left.currentWeightKg === right.currentWeightKg &&
    left.targetType === right.targetType &&
    left.activityLevel === right.activityLevel &&
    left.trainingExperience === right.trainingExperience &&
    left.trainingDaysPerWeek === right.trainingDaysPerWeek
  );
}

export default function TodayPage() {
  const router = useRouter();
  const date = getTodayDateString();
  const {
    payload,
    currentUser,
    profileForm,
    setProfileForm,
    selectedFocus,
    setSelectedFocus,
    loading,
    error,
    profileMessage,
    focusMessage,
    aiGuide,
    aiError,
    aiLoading,
    isPending,
    isCutTarget,
    isStrengthTarget,
    handleRegenerate,
    handleGenerateTodayTraining,
    handleProfileSubmit,
    generateAiGuide,
  } = useTodayDashboard({
    date,
    router,
    trainingFocusLabels,
  });
  const profileBaseline = useMemo(() => buildProfileForm(currentUser?.profile ?? null), [currentUser?.profile]);
  const hasUnsavedProfileChanges = useMemo(
    () => !isSameProfileForm(profileForm, profileBaseline),
    [profileBaseline, profileForm],
  );

  useUnsavedChangesWarning(
    hasUnsavedProfileChanges && !isPending,
    '基础信息修改还没有保存，离开后会丢失，确认继续吗？',
  );

  const heroMetrics = useMemo(() => buildHeroMetrics(payload), [payload]);
  const macroSummary = useMemo(() => buildMacroSummary(payload), [payload]);
  const checkInInsight = useMemo(() => buildCheckInInsight(payload), [payload]);

  function handleLogout() {
    clearStoredSession();
    router.replace('/login');
  }

  const energyInsight = buildEnergyInsight(payload);
  const isCardioPlan = isCutTarget || payload?.trainingPlan?.splitType === 'cardio';
  const focusOptions = useMemo(
    () => buildFocusOptions(trainingFocusLabels, trainingFocusMeta),
    [],
  );

  return (
    <DashboardShell
      currentPath="/today"
      sidebarHint="今天还没有开始？"
      primaryCta={{ label: '开始训练', href: '/check-in' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="h-16 w-1 rounded-full bg-[#0f7ea5]" />
            <h1 className="mt-4 text-[48px] font-semibold leading-none text-[#1b3042] sm:text-[64px]">指挥中心</h1>
            <p className="mt-3 max-w-2xl text-lg text-[#637a91]">欢迎回来，今天是优化节奏与执行状态的好日子。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <MetricPill label="当前日期" value={date} />
            <MetricPill label="目标" value={formatTargetType(currentUser?.profile?.targetType)} />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-[28px] bg-white px-5 py-4 text-sm font-semibold text-[#163550] shadow-[0_16px_28px_rgba(20,68,102,0.08)]"
            >
              退出登录
            </button>
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在加载今日执行台...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}

      {!loading && payload ? (
        <>
          <TodayOverviewSection
            energyInsight={energyInsight}
            heroMetrics={heroMetrics}
            checkInInsight={checkInInsight}
            hasCheckedIn={payload.checkInStatus.hasCheckedIn}
            dietCompletionRate={payload.checkInStatus.dietCompletionRate}
            trainingCompletionRate={payload.checkInStatus.trainingCompletionRate}
          />

          <section className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr]">
            <TodayCoachSection
              aiGuide={aiGuide}
              aiLoading={aiLoading}
              aiError={aiError}
              dietSummary={payload.dietPlan?.summary ?? ''}
              hasTrainingPlan={Boolean(payload.trainingPlan)}
              macroSummary={macroSummary}
              onRefreshAi={() => void generateAiGuide()}
            />

            <TrainingPlanPanel
              trainingPlan={payload.trainingPlan}
              isCardioPlan={isCardioPlan}
              isStrengthTarget={isStrengthTarget}
              selectedFocus={selectedFocus}
              focusOptions={focusOptions}
              onSelectFocus={setSelectedFocus}
              onGenerateTodayTraining={handleGenerateTodayTraining}
              onRegenerate={handleRegenerate}
              disabled={isPending || loading}
              focusMessage={focusMessage}
              intensityLabels={intensityLabelMap}
              movementPatternLabels={movementPatternLabelMap}
            />
          </section>

          <ProfileSettingsForm
            profileForm={profileForm}
            onChange={setProfileForm}
            onSubmit={handleProfileSubmit}
            message={profileMessage}
            disabled={isPending || loading || !currentUser?.profile}
            trainingStartLabel={isStrengthTarget && payload.trainingCycle.startFocus ? trainingFocusLabels[payload.trainingCycle.startFocus] : '不适用'}
            todayPlanLabel={isStrengthTarget && payload.trainingCycle.currentFocus ? trainingFocusLabels[payload.trainingCycle.currentFocus] : '不适用'}
            dietSummary={payload.dietPlan?.summary ?? '暂无'}
            dietPreferences={formatProfileList(currentUser?.profile?.dietPreferences, '未设置')}
            dietRestrictions={formatProfileList(currentUser?.profile?.dietRestrictions, '无')}
          />
        </>
      ) : null}
    </DashboardShell>
  );
}

