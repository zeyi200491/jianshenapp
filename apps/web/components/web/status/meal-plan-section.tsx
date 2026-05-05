import type { DietPlanMealView, TodayPayload, WeeklyDietDay, WeeklyDietMeal } from '@/lib/api';
import type { MealType } from '@/lib/use-diet-page-url-state';
import { buildDayLabel, formatNutritionLine } from '@/lib/diet-plan-view';
import {
  AccentBadge,
  DashboardCard,
  PanelTag,
  SectionEyebrow,
} from '@/components/web/dashboard-shell';

type MealPlanSectionProps = {
  payload: TodayPayload | null;
  mealTypeLabels: Record<MealType, string>;
  selectedDay: WeeklyDietDay | null;
  selectedMealType: MealType;
  selectedWeekMeal: WeeklyDietMeal | null;
  selectedTodayMeal: DietPlanMealView | null;
  mealAlternatives: string[];
  mealGuidance: string[];
  saving: boolean;
  onSelectDate: (date: string) => void;
  onSelectMealType: (mealType: MealType) => void;
  onRemoveActual: () => void;
};

export function MealPlanSection({
  payload,
  mealTypeLabels,
  selectedDay,
  selectedMealType,
  selectedWeekMeal,
  selectedTodayMeal,
  mealAlternatives,
  mealGuidance,
  saving,
  onSelectDate,
  onSelectMealType,
  onRemoveActual,
}: MealPlanSectionProps) {
  return (
    <DashboardCard className="bg-[#edf4fb]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <SectionEyebrow>Weekly Menu</SectionEyebrow>
          <h2 className="mt-3 text-[38px] font-semibold text-[#17324d]">当日三餐详情</h2>
          <p className="mt-3 text-lg text-[#5f768d]">先选日期，再选餐次；右侧会同步显示计划、替换方案与执行指导。</p>
        </div>
        <PanelTag tone="deep">{payload ? payload.weeklyDietPlan.goalType : '读取中'}</PanelTag>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        {payload?.weeklyDietPlan.days.map((day) => {
          const active = selectedDay?.date === day.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={`rounded-[26px] border px-4 py-4 text-left transition ${
                active ? 'border-[#9fd6ef] bg-white' : 'border-[#dbe7f0] bg-[#f8fbfe]'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[#6e8396]">
                {day.dayType === 'training' ? '训练日' : '休息日'}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#17324d]">{buildDayLabel(day)}</p>
              <p className="mt-2 text-sm text-[#6c8295]">
                {day.dailyTargets.calories} kcal / 蛋白 {day.dailyTargets.proteinG}g
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {(Object.keys(mealTypeLabels) as MealType[]).map((mealType) => {
          const active = mealType === selectedMealType;
          return (
            <button
              key={mealType}
              type="button"
              onClick={() => onSelectMealType(mealType)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                active ? 'bg-[#0f7ea5] text-white' : 'bg-white text-[#17324d]'
              }`}
            >
              {mealTypeLabels[mealType]}
            </button>
          );
        })}
      </div>

      {selectedWeekMeal ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-[30px] bg-white px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#6e8396]">目标餐次</p>
                <h3 className="mt-2 text-[32px] font-semibold text-[#17324d]">{selectedWeekMeal.title}</h3>
                <p className="mt-3 text-base leading-8 text-[#5f768d]">{selectedWeekMeal.description}</p>
              </div>
              <AccentBadge kind="meal" className="h-16 w-16 bg-[#e8f3fb] text-[#0f7ea5]" iconClassName="h-7 w-7" />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-[#f7fbfe] px-5 py-5">
                <p className="text-sm font-semibold text-[#17324d]">计划营养</p>
                <p className="mt-3 text-sm leading-7 text-[#5f768d]">
                  {formatNutritionLine(selectedWeekMeal.nutrition)}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#f7fbfe] px-5 py-5">
                <p className="text-sm font-semibold text-[#17324d]">当前生效版本</p>
                <p className="mt-3 text-sm leading-7 text-[#5f768d]">
                  {selectedTodayMeal
                    ? `${selectedTodayMeal.effective.title} · ${formatNutritionLine(selectedTodayMeal.effective.nutrition)}`
                    : '当前查看的是周菜单计划版本，尚未叠加今日实际摄入。'}
                </p>
              </div>
            </div>

            {selectedTodayMeal?.actual ? (
              <div className="mt-6 rounded-[24px] bg-[#eefbf3] px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1d6a49]">今日已记录实际摄入</p>
                    <p className="mt-2 text-lg font-semibold text-[#17324d]">{selectedTodayMeal.actual.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[#5f768d]">
                      {formatNutritionLine(selectedTodayMeal.actual.nutrition)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveActual}
                    disabled={saving}
                    className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#17324d] disabled:opacity-60"
                  >
                    {saving ? '处理中...' : '移除实际摄入'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr_1fr]">
            <DashboardCard>
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-semibold text-[#17324d]">替换方案</h3>
                <PanelTag tone="deep">{mealAlternatives.length} 条</PanelTag>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#5f768d]">
                {mealAlternatives.length > 0 ? (
                  mealAlternatives.map((item) => (
                    <li key={item} className="rounded-[20px] bg-[#f7fbfe] px-4 py-4">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="rounded-[20px] bg-[#f7fbfe] px-4 py-4">当前这餐还没有额外替换说明，优先按计划版本执行。</li>
                )}
              </ul>
            </DashboardCard>

            <DashboardCard>
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-semibold text-[#17324d]">执行指导</h3>
                <PanelTag>{selectedDay?.dayType === 'training' ? '训练日' : '休息日'}</PanelTag>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[#5f768d]">
                {mealGuidance.length > 0 ? (
                  mealGuidance.map((item) => (
                    <li key={item} className="rounded-[20px] bg-[#f7fbfe] px-4 py-4">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="rounded-[20px] bg-[#f7fbfe] px-4 py-4">当前这餐还没有单独指导语，先按计划营养目标执行。</li>
                )}
              </ul>
            </DashboardCard>
          </div>
        </div>
      ) : null}
    </DashboardCard>
  );
}
