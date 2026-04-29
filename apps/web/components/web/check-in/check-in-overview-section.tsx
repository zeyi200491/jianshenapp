import type { TodayPayload } from '@/lib/api';
import {
  AccentBadge,
  DashboardCard,
  MetricPill,
  PanelTag,
} from '@/components/web/dashboard-shell';
import { CompletionRateControl } from '@/components/web/check-in/form-controls';

type CheckInOverviewSectionProps = {
  mode: 'quick' | 'detailed';
  date: string;
  today: TodayPayload | null;
  dietCompletionValue: number | null;
  trainingCompletionValue: number | null;
  completionSummary: number | null;
  coachTip: string;
  onSetMode: (mode: 'quick' | 'detailed') => void;
  onRequestDateChange: (date: string) => void;
  onDietCompletionChange: (value: string) => void;
  onTrainingCompletionChange: (value: string) => void;
  getTodayDateString: () => string;
  shiftDateString: (date: string, diff: number) => string;
};

export function CheckInOverviewSection({
  mode,
  date,
  today,
  dietCompletionValue,
  trainingCompletionValue,
  completionSummary,
  coachTip,
  onSetMode,
  onRequestDateChange,
  onDietCompletionChange,
  onTrainingCompletionChange,
  getTodayDateString,
  shiftDateString,
}: CheckInOverviewSectionProps) {
  return (
    <>
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">打卡方式</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">默认先用快打卡记录核心完成度，再按需补充详细数据。</p>
            </div>
            <PanelTag tone={mode === 'quick' ? 'deep' : 'soft'}>
              {mode === 'quick' ? '快打卡' : '详细模式'}
            </PanelTag>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSetMode('quick')}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                mode === 'quick' ? 'bg-[#0f7ea5] text-white' : 'bg-[#edf4fa] text-[#17324d]'
              }`}
            >
              快打卡
            </button>
            <button
              type="button"
              onClick={() => onSetMode('detailed')}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                mode === 'detailed' ? 'bg-[#17324d] text-white' : 'bg-[#edf4fa] text-[#17324d]'
              }`}
            >
              详细模式
            </button>
          </div>
          <div className="mt-6 rounded-[24px] bg-[#f7fbfe] px-5 py-5 text-sm leading-7 text-[#5f768d]">
            {mode === 'quick'
              ? '快打卡只要求填写饮食完成度和训练完成度。未补充的体感会先留空，后续可在详细模式继续完善。'
              : '详细模式会展开水分、步数、体感、体重和备注，适合训练结束后一次性补全。'}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">日期与记录状态</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">可以补录昨天，也可以回到今天继续更新。</p>
            </div>
            <MetricPill label="当前日期" value={date} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => onRequestDateChange(shiftDateString(date, -1))} className="rounded-full bg-[#edf4fa] px-4 py-3 font-semibold text-[#17324d]">前一天</button>
            <button type="button" onClick={() => onRequestDateChange(getTodayDateString())} className="rounded-full bg-[#edf4fa] px-4 py-3 font-semibold text-[#17324d]">回到今天</button>
            <button type="button" disabled={date >= getTodayDateString()} onClick={() => onRequestDateChange(shiftDateString(date, 1))} className="rounded-full bg-[#edf4fa] px-4 py-3 font-semibold text-[#17324d] disabled:opacity-50">后一天</button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricPill label="饮食完成度" value={dietCompletionValue === null ? '待填' : `${dietCompletionValue}%`} />
            <MetricPill label="训练完成度" value={trainingCompletionValue === null ? '待填' : `${trainingCompletionValue}%`} accent />
            <MetricPill label="综合完成度" value={completionSummary === null ? '待填写' : `${completionSummary}%`} />
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-3 xl:grid-cols-[1.02fr_1.02fr_0.96fr]">
        <DashboardCard>
          <div className="flex items-center justify-between">
            <AccentBadge kind="meal" className="h-16 w-16 bg-[#e8f3fb] text-[#0f7ea5]" iconClassName="h-7 w-7" />
            <PanelTag tone={dietCompletionValue === null ? 'soft' : 'deep'}>
              {dietCompletionValue === null ? '待填写' : `${dietCompletionValue}%`}
            </PanelTag>
          </div>
          <h2 className="mt-8 text-[36px] font-semibold text-[#17324d]">饮食完成度</h2>
          <p className="mt-3 text-lg text-[#5f768d]">今日摄入完成度会直接影响后续饮食替换建议。</p>
          <CompletionRateControl
            label="饮食完成度（%）"
            name="dietCompletionRate"
            value={dietCompletionValue}
            onChange={onDietCompletionChange}
          />
          <p className="mt-3 text-sm text-[#6d8397]">
            {dietCompletionValue === null ? '还没有填写前，这里不代表实际 0%，只是等待你输入今天的真实完成度。' : `目标餐单：${today?.dietPlan?.summary ?? '尚未同步'}`}
          </p>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between">
            <AccentBadge kind="training" className="h-16 w-16 bg-[#e8f3fb] text-[#0f7ea5]" iconClassName="h-7 w-7" />
            <PanelTag tone={trainingCompletionValue === null ? 'soft' : 'deep'}>
              {trainingCompletionValue === null ? '待填写' : `${trainingCompletionValue}%`}
            </PanelTag>
          </div>
          <h2 className="mt-8 text-[36px] font-semibold text-[#17324d]">训练任务</h2>
          <p className="mt-3 text-lg text-[#5f768d]">{today?.trainingPlan?.title ?? '等待今日训练计划同步'}</p>
          <CompletionRateControl
            label="训练完成度（%）"
            name="trainingCompletionRate"
            value={trainingCompletionValue}
            tone="training"
            onChange={onTrainingCompletionChange}
          />
          <p className="mt-3 text-sm text-[#6d8397]">
            {trainingCompletionValue === null
              ? '还没有填写前，这里不代表实际 0%，只是等待你输入今天的真实完成度。'
              : today?.trainingPlan
                ? `${today.trainingPlan.items.length} 个动作 · ${today.trainingPlan.items.reduce((sum, item) => sum + item.sets, 0)} 组`
                : '等待今日训练计划同步'}
          </p>
        </DashboardCard>

        <DashboardCard className="bg-[#0f6f96] text-white">
          <div className="flex items-center gap-4">
            <AccentBadge kind="spark" className="h-16 w-16 bg-white/12 text-white" iconClassName="h-7 w-7" />
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-[0.2em] text-white/70">AI 教练小贴士</p>
              <p className="mt-2 text-[20px] font-semibold">小健执行助手</p>
            </div>
          </div>
          <p className="mt-8 text-[20px] leading-10 text-white">“{coachTip}”</p>
          <div className="mt-8 rounded-[28px] bg-white/10 px-5 py-5 text-base leading-8 text-white/84">
            <p className="font-semibold">建议行动</p>
            <ul className="mt-3 space-y-2">
              <li>先补完水分摄入，再回填备注。</li>
              <li>如果体感异常，备注里写明原因，复盘会更准。</li>
            </ul>
          </div>
        </DashboardCard>
      </section>
    </>
  );
}
