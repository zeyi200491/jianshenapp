'use client';

import Link from 'next/link';
import type {
  ActiveTrainingSource,
  TodayPayload,
  TrainingFocus,
  TrainingTemplatePreview,
  TrainingTemplateWeekday,
} from '@/lib/api';
import { AccentGlyph, DashboardCard, MetricPill, PanelTag } from '@/components/web/dashboard-shell';

type FocusOption = {
  focus: TrainingFocus;
  label: string;
  areas: string;
  description: string;
};

type TodayTrainingPlan = TodayPayload['trainingPlan'];

const weekdayLabels: Record<TrainingTemplateWeekday, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
};

type TrainingPlanPanelProps = {
  trainingPlan: TodayTrainingPlan | null;
  systemTrainingPlan: TodayTrainingPlan | null;
  activeTrainingSource: ActiveTrainingSource;
  templatePreview: TrainingTemplatePreview;
  selectedTemplateWeekday: TrainingTemplateWeekday | null;
  isCardioPlan: boolean;
  isStrengthTarget: boolean;
  selectedFocus: TrainingFocus;
  focusOptions: FocusOption[];
  onSelectFocus: (focus: TrainingFocus) => void;
  onSelectTemplateWeekday: (weekday: TrainingTemplateWeekday) => void;
  onApplyTemplateToToday: () => void;
  onRestoreSystemTraining: () => void;
  onGenerateTodayTraining: () => void;
  onRegenerate: () => void;
  disabled: boolean;
  focusMessage: string;
  intensityLabels: Record<string, string>;
  movementPatternLabels: Record<string, string>;
};

export function TrainingPlanPanel({
  trainingPlan,
  systemTrainingPlan,
  activeTrainingSource,
  templatePreview,
  selectedTemplateWeekday,
  isCardioPlan,
  isStrengthTarget,
  selectedFocus,
  focusOptions,
  onSelectFocus,
  onSelectTemplateWeekday,
  onApplyTemplateToToday,
  onRestoreSystemTraining,
  onGenerateTodayTraining,
  onRegenerate,
  disabled,
  focusMessage,
  intensityLabels,
  movementPatternLabels,
}: TrainingPlanPanelProps) {
  const activePreviewWeekday = selectedTemplateWeekday ?? templatePreview?.weekday ?? null;
  const isUserOverride = activeTrainingSource === 'user_override';

  return (
    <DashboardCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#5d7288]">
            <AccentGlyph kind="training" className="h-4 w-4 text-[#0f7ea5]" />
            <span className="text-sm font-semibold">训练方案</span>
          </div>
          <h2 className="mt-3 text-[34px] font-semibold text-[#193148]">
            {isCardioPlan ? '今日减脂有氧计划' : trainingPlan?.title ?? '先选择今天想练的部位'}
          </h2>
        </div>
        <PanelTag tone="deep">
          {isUserOverride ? '个人模板生效中' : isCardioPlan ? '有氧计划' : '系统方案'}
        </PanelTag>
      </div>

      <div className="mt-6 rounded-[28px] bg-[#eef6fb] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#17324d]">我的训练模板</p>
            <p className="mt-1 text-sm text-[#5f768d]">
              {templatePreview
                ? `当前预览：${weekdayLabels[templatePreview.weekday]} · ${templatePreview.day.title}`
                : '启用个人周模板后，这里可以预览并一键替换今天的训练方案。'}
            </p>
          </div>
          <Link
            href="/account/training-templates"
            className="rounded-full border border-[#cfe0ea] bg-white px-4 py-2 text-sm font-semibold text-[#17324d]"
          >
            管理我的模板
          </Link>
        </div>

        {templatePreview ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(weekdayLabels) as TrainingTemplateWeekday[]).map((weekday) => {
                const active = activePreviewWeekday === weekday;
                return (
                  <button
                    key={weekday}
                    type="button"
                    onClick={() => onSelectTemplateWeekday(weekday)}
                    disabled={disabled}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active ? 'bg-[#17324d] text-white' : 'bg-white text-[#17324d]'
                    }`}
                  >
                    {weekdayLabels[weekday]}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-[24px] bg-white px-4 py-4 text-sm text-[#5f768d]">
              <p className="font-semibold text-[#17324d]">{templatePreview.day.title}</p>
              <p className="mt-1">
                {templatePreview.day.dayType === 'rest'
                  ? '这一天是休息/恢复安排，应用后今天页会按你的个人节奏展示。'
                  : `预计 ${templatePreview.day.durationMinutes ?? '--'} 分钟，共 ${templatePreview.day.items.length} 个动作。`}
              </p>
            </div>
          </>
        ) : null}
      </div>

      {isCardioPlan ? (
        <>
          <p className="mt-4 text-lg leading-8 text-[#5f768d]">
            {trainingPlan?.title ?? '减脂有氧'}，把正式有氧主段控制在 25-45 分钟，优先稳定执行和恢复。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricPill label="计划类型" value="爬坡有氧" />
            <MetricPill label="建议时长" value={`${trainingPlan?.durationMinutes ?? '--'} 分钟`} accent />
            <MetricPill
              label="建议强度"
              value={trainingPlan ? `${intensityLabels[trainingPlan.intensityLevel]}强度` : '待生成'}
            />
          </div>
          <div className="mt-6 rounded-[28px] bg-[#eef6fb] px-5 py-5 text-sm leading-7 text-[#4d647a]">
            {trainingPlan?.notes}
          </div>
          <div className="mt-6 space-y-3">
            {(trainingPlan?.items ?? []).map((item, index) => (
              <div
                key={item.id}
                className={`rounded-[28px] px-5 py-5 ${index === 1 ? 'bg-[#eef5fb]' : 'bg-[#f8fbfe]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#17324d,#05080d)] text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-[#17324d]">{item.name}</p>
                      <p className="mt-1 text-sm font-semibold text-[#0f7ea5]">{item.reps}</p>
                      <p className="mt-2 text-sm leading-7 text-[#677f95]">
                        {item.notes[0] ?? '按中等强度稳定完成。'}
                      </p>
                    </div>
                  </div>
                  <PanelTag>{index === 1 ? '主段' : index === 0 ? '热身' : '执行中'}</PanelTag>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[28px] bg-[#f8fbfe] px-5 py-5 text-sm leading-7 text-[#61778d]">
            <p className="font-semibold text-[#17324d]">执行提醒</p>
            <ul className="mt-3 space-y-2">
              <li>主段强度以能完整说短句、但不想长聊为准，体感约 RPE 5-7。</li>
              <li>如果膝踝不适，先降坡度，再降速度，不要靠扶手借力。</li>
              <li>有氧结束后补水，并做 3-5 分钟下肢拉伸，优先保证第二天恢复。</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {focusOptions.map((option) => {
              const active = option.focus === selectedFocus;
              return (
                <button
                  key={option.focus}
                  type="button"
                  onClick={() => onSelectFocus(option.focus)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active ? 'border-[#9fd6ef] bg-[#eff8fe]' : 'border-[#dde8f0] bg-[#f7fbff]'
                  }`}
                >
                  <p className="text-xs tracking-[0.18em] text-[#6d8397]">{option.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#163550]">{option.areas}</p>
                  <p className="mt-2 text-xs leading-6 text-[#688097]">{option.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-6 space-y-3">
            {(trainingPlan?.items ?? []).slice(0, 4).map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-[28px] px-5 py-4 ${
                  index === 0 ? 'bg-[#eef5fb]' : 'bg-[#f8fbfe]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#17324d,#05080d)] text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-[#17324d]">{item.name}</p>
                    <p className="text-sm text-[#677f95]">
                      {item.sets} 组 · {item.reps} · {movementPatternLabels[item.movementPattern]} · 休息 {item.restSeconds} 秒
                    </p>
                    <p className="mt-1 text-xs text-[#6f8799]">{item.restHint}</p>
                  </div>
                </div>
                <PanelTag>{index === 0 ? '主项' : '待完成'}</PanelTag>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {templatePreview ? (
          <button
            type="button"
            onClick={onApplyTemplateToToday}
            disabled={disabled}
            className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            应用个人模板到今天
          </button>
        ) : null}
        {isUserOverride ? (
          <button
            type="button"
            onClick={onRestoreSystemTraining}
            disabled={disabled}
            className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d] disabled:opacity-60"
          >
            恢复系统方案
          </button>
        ) : null}
        {isStrengthTarget ? (
          <button
            type="button"
            onClick={onGenerateTodayTraining}
            disabled={disabled}
            className="rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,126,165,0.26)] disabled:opacity-60"
          >
            按 {focusOptions.find((item) => item.focus === selectedFocus)?.label ?? '推日'} 生成计划
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled}
          className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d] disabled:opacity-60"
        >
          重新生成今日计划
        </button>
        <Link
          href="/check-in"
          className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d]"
        >
          去每日打卡
        </Link>
      </div>

      {isUserOverride && systemTrainingPlan ? (
        <p className="mt-4 rounded-[20px] bg-[#f7fafc] px-4 py-3 text-sm text-[#5f768d]">
          系统原方案仍然保留：{systemTrainingPlan.title}
        </p>
      ) : null}
      {focusMessage ? (
        <p className="mt-4 rounded-[20px] bg-[#ebf8ef] px-4 py-3 text-sm text-[#1d6a49]">{focusMessage}</p>
      ) : null}
    </DashboardCard>
  );
}
