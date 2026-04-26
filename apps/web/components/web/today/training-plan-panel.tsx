'use client';

import Link from 'next/link';
import type { TodayPayload, TrainingFocus } from '@/lib/api';
import { AccentGlyph, DashboardCard, MetricPill, PanelTag } from '@/components/web/dashboard-shell';

type FocusOption = {
  focus: TrainingFocus;
  label: string;
  areas: string;
  description: string;
};

type TodayTrainingPlan = TodayPayload['trainingPlan'];

type TrainingPlanPanelProps = {
  trainingPlan: TodayTrainingPlan | null;
  isCardioPlan: boolean;
  isStrengthTarget: boolean;
  selectedFocus: TrainingFocus;
  focusOptions: FocusOption[];
  onSelectFocus: (focus: TrainingFocus) => void;
  onGenerateTodayTraining: () => void;
  onRegenerate: () => void;
  disabled: boolean;
  focusMessage: string;
  intensityLabels: Record<string, string>;
  movementPatternLabels: Record<string, string>;
};

export function TrainingPlanPanel({
  trainingPlan,
  isCardioPlan,
  isStrengthTarget,
  selectedFocus,
  focusOptions,
  onSelectFocus,
  onGenerateTodayTraining,
  onRegenerate,
  disabled,
  focusMessage,
  intensityLabels,
  movementPatternLabels,
}: TrainingPlanPanelProps) {
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
        <PanelTag tone="deep">{isCardioPlan ? '爬坡有氧' : '进行中'}</PanelTag>
      </div>

      {isCardioPlan ? (
        <>
          <p className="mt-4 text-lg leading-8 text-[#5f768d]">
            {trainingPlan?.title ?? '爬坡有氧'}，把正式有氧主段控制在 25-45 分钟，优先稳定执行和恢复。
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
                      {item.sets} 组 · {item.reps} · {movementPatternLabels[item.movementPattern]} · 休息{' '}
                      {item.restSeconds} 秒
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
      {focusMessage ? (
        <p className="mt-4 rounded-[20px] bg-[#ebf8ef] px-4 py-3 text-sm text-[#1d6a49]">{focusMessage}</p>
      ) : null}
    </DashboardCard>
  );
}
