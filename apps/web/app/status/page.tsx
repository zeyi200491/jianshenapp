'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LiveStatusCard } from '@/components/web/live-status-card';
import { MealPlanSection } from '@/components/web/status/meal-plan-section';
import { MealSearchSection } from '@/components/web/status/meal-search-section';
import { DashboardShell, MetricPill, SectionEyebrow } from '@/components/web/dashboard-shell';
import { buildMealState, buildSearchState, mergeUnique } from '@/lib/diet-plan-view';
import { useDietPlanEditor } from '@/lib/use-diet-plan-editor';
import { useDietPageUrlState, type MealType } from '@/lib/use-diet-page-url-state';

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const sceneLabels: Record<string, string> = {
  canteen: '食堂优先',
  cookable: '宿舍可做',
  dorm: '宿舍场景',
  home: '家庭场景',
};

export default function StatusPage() {
  const router = useRouter();
  const { selectedDate, setSelectedDate, selectedMealType, setSelectedMealType } = useDietPageUrlState();
  const {
    payload,
    loading,
    error,
    actionMessage,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    searchError,
    saving,
    selectedDay,
    selectedWeekMeal,
    selectedTodayMeal,
    canSyncToday,
    handleSearch,
    handleApplyFood,
    handleRemoveActual,
  } = useDietPlanEditor({
    router,
    selectedDate,
    selectedMealType,
    setSelectedDate,
  });

  const mealState = buildMealState(payload, selectedDay, selectedTodayMeal);
  const searchState = buildSearchState(searchQuery, searching, searchError, searchResults, canSyncToday);
  const mealAlternatives = useMemo(
    () => mergeUnique([...(selectedWeekMeal?.alternatives ?? []), ...(selectedTodayMeal?.alternatives ?? [])]),
    [selectedTodayMeal, selectedWeekMeal],
  );
  const mealGuidance = useMemo(
    () =>
      mergeUnique([
        ...(selectedWeekMeal?.guidance ?? []),
        ...(selectedWeekMeal?.prepTips ?? []),
        ...(selectedTodayMeal?.notes ?? []),
      ]),
    [selectedTodayMeal, selectedWeekMeal],
  );

  return (
    <DashboardShell
      currentPath="/diet"
      sidebarHint="今天想把饮食执行也收口吗？"
      primaryCta={{ label: '去每日打卡', href: '/check-in' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Meal Planner</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">智能饮食计划</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill
              label="饮食场景"
              value={payload ? sceneLabels[payload.weeklyDietPlan.displayScene] ?? payload.weeklyDietPlan.displayScene : '读取中'}
            />
            <MetricPill label="当前日期" value={selectedDay?.date ?? '读取中'} />
            <MetricPill label="当前餐次" value={mealTypeLabels[selectedMealType]} accent />
          </div>
        </section>
      }
    >
      {loading ? <LiveStatusCard tone="loading">正在同步饮食计划...</LiveStatusCard> : null}
      {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}
      {actionMessage ? <LiveStatusCard tone="success">{actionMessage}</LiveStatusCard> : null}

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.18fr_0.82fr]">
        <MealPlanSection
          payload={payload}
          mealTypeLabels={mealTypeLabels}
          selectedDay={selectedDay}
          selectedMealType={selectedMealType}
          selectedWeekMeal={selectedWeekMeal}
          selectedTodayMeal={selectedTodayMeal}
          mealAlternatives={mealAlternatives}
          mealGuidance={mealGuidance}
          saving={saving}
          onSelectDate={setSelectedDate}
          onSelectMealType={setSelectedMealType}
          onRemoveActual={() => void handleRemoveActual()}
        />
        <MealSearchSection
          payload={payload}
          mealTypeLabels={mealTypeLabels}
          mealState={mealState}
          searchState={searchState}
          searchQuery={searchQuery}
          searching={searching}
          saving={saving}
          searchResults={searchResults}
          canSyncToday={canSyncToday}
          selectedWeekMeal={selectedWeekMeal}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          onApplyFood={(item) => void handleApplyFood(item)}
        />
      </section>
    </DashboardShell>
  );
}
