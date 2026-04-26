import Link from 'next/link';
import type { FormEventHandler } from 'react';
import type { MealFoodSearchResult, TodayPayload, WeeklyDietMeal } from '@/lib/api';
import {
  DashboardCard,
  MetricPill,
  PanelTag,
  ProgressBar,
  SectionEyebrow,
} from '@/components/web/dashboard-shell';
import { getStateLabel, type DataStateKind } from '@/lib/display-state';
import { formatNutritionLine } from '@/lib/diet-plan-view';

type StatusState = {
  kind: DataStateKind;
  detail: string;
  value: string;
};

type MealSearchSectionProps = {
  payload: TodayPayload | null;
  mealTypeLabels: Record<'breakfast' | 'lunch' | 'dinner', string>;
  mealState: StatusState;
  searchState: StatusState;
  searchQuery: string;
  searching: boolean;
  saving: boolean;
  searchResults: MealFoodSearchResult[];
  canSyncToday: boolean;
  selectedWeekMeal: WeeklyDietMeal | null;
  onSearchQueryChange: (value: string) => void;
  onSearch: FormEventHandler<HTMLFormElement>;
  onApplyFood: (item: MealFoodSearchResult) => void;
};

export function MealSearchSection({
  payload,
  mealTypeLabels,
  mealState,
  searchState,
  searchQuery,
  searching,
  saving,
  searchResults,
  canSyncToday,
  selectedWeekMeal,
  onSearchQueryChange,
  onSearch,
  onApplyFood,
}: MealSearchSectionProps) {
  return (
    <div className="grid content-start gap-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">餐次状态</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">{mealState.detail}</p>
            </div>
            <PanelTag tone={mealState.kind === 'actual' ? 'deep' : 'soft'}>
              {getStateLabel(mealState.kind)}
            </PanelTag>
          </div>
          <p className="mt-5 text-[34px] font-semibold text-[#17324d]">{mealState.value}</p>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">搜索状态</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">{searchState.detail}</p>
            </div>
            <PanelTag tone={searchState.kind === 'actual' ? 'deep' : 'soft'}>
              {getStateLabel(searchState.kind)}
            </PanelTag>
          </div>
          <p className="mt-5 text-[34px] font-semibold text-[#17324d]">{searchState.value}</p>
        </DashboardCard>
      </div>

      <DashboardCard className="bg-[#eef4f9]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <SectionEyebrow>Meal Search</SectionEyebrow>
            <h2 className="mt-3 text-[34px] font-semibold text-[#17324d]">从可用食物库搜索并替换今天这餐</h2>
          </div>
          <MetricPill
            label="今日总热量"
            value={payload ? `${payload.effectiveDailyTotals.calories} kcal` : '读取中'}
          />
        </div>

        <form onSubmit={onSearch} className="mt-6 grid gap-4">
          <input
            name="searchQuery"
            autoComplete="off"
            inputMode="search"
            spellCheck={false}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="rounded-[24px] border border-[#d8e5ee] bg-white px-5 py-4 text-sm text-[#17324d]"
            placeholder="例如：鸡胸肉、番茄炒蛋、牛肉盖饭"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={searching || saving}
              className="rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {searching ? '搜索中...' : '搜索候选餐食'}
            </button>
            <Link href="/today" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">
              返回今日页
            </Link>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {searchResults.map((item) => {
            const progressValue = Math.min(
              100,
              Math.round((item.nutritionPerMedium.proteinG / Math.max(selectedWeekMeal?.nutrition.proteinG ?? 1, 1)) * 100),
            );

            return (
              <article key={item.code} className="rounded-[24px] bg-white px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-[#17324d]">{item.name}</p>
                    <p className="mt-2 text-sm leading-7 text-[#5f768d]">{formatNutritionLine(item.nutritionPerMedium)}</p>
                    <p className="mt-2 text-xs text-[#6e8396]">
                      别名：{item.aliases.join(' / ') || '无'} / 推荐餐次：
                      {item.suggestedMealTypes.map((mealType) => mealTypeLabels[mealType]).join(' / ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyFood(item)}
                    disabled={!canSyncToday || saving}
                    className="rounded-full bg-[#eef5fb] px-4 py-3 text-sm font-semibold text-[#17324d] disabled:opacity-60"
                  >
                    {saving ? '处理中...' : canSyncToday ? '设为今天实际摄入' : '当前仅预览'}
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6e8396]">蛋白匹配度</p>
                  <ProgressBar value={progressValue} className="mt-3" />
                </div>
              </article>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}
