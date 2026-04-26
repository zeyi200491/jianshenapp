import Link from 'next/link';
import { DashboardCard, ProgressBar, SectionEyebrow } from '@/components/web/dashboard-shell';
import { AccentBadge } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';

type MacroSummaryItem = {
  label: string;
  value: string;
  percent: number;
};

type TodayCoachSectionProps = {
  aiGuide: string;
  aiLoading: boolean;
  aiError: string;
  dietSummary: string;
  hasTrainingPlan: boolean;
  macroSummary: MacroSummaryItem[];
  onRefreshAi: () => void;
};

export function TodayCoachSection({
  aiGuide,
  aiLoading,
  aiError,
  dietSummary,
  hasTrainingPlan,
  macroSummary,
  onRefreshAi,
}: TodayCoachSectionProps) {
  const guideSummary = aiGuide
    ? aiGuide.split('\n').filter(Boolean).slice(0, 3).join(' ')
    : hasTrainingPlan
      ? '今天的 AI 教练摘要还没生成出来。你可以先按下方训练清单执行，或手动点击“刷新 AI”获取解释。'
      : '今天的训练计划还没生成，先确定训练焦点或重新生成今日计划。';

  return (
    <div className="grid content-start gap-6">
      <DashboardCard className="bg-[#edf4fb]">
        <div className="flex items-center gap-3">
          <AccentBadge kind="spark" className="h-12 w-12 bg-[#73c4f0] text-white" iconClassName="h-5 w-5" />
          <div>
            <SectionEyebrow>AI 教练洞察</SectionEyebrow>
            <p className="mt-2 text-[30px] font-semibold text-[#1a3247]">今天应该如何推进</p>
          </div>
        </div>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#4d647a]">
          <div className="rounded-[26px] bg-white px-5 py-5">{guideSummary}</div>
          <div className="rounded-[26px] bg-white px-5 py-5">
            {dietSummary || '今日饮食计划已同步，优先保证高蛋白与训练前后补给。'}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <Link href="/assistant" className="text-sm font-semibold text-[#0f7ea5]">
            查看完整建议
          </Link>
          <button
            type="button"
            onClick={onRefreshAi}
            disabled={!hasTrainingPlan || aiLoading}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17324d]"
          >
            {aiLoading ? '生成中...' : '刷新 AI'}
          </button>
        </div>
        {aiError ? <LiveStatusCard tone="error" className="mt-4">{aiError}</LiveStatusCard> : null}
      </DashboardCard>

      <DashboardCard>
        <p className="text-xl font-semibold text-[#2a4256]">宏量营养素目标</p>
        <div className="mt-6 space-y-5">
          {macroSummary.map((item, index) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#19324a]">{item.label}</span>
                <span className="text-[#667d92]">{item.value} · {item.percent}% 占比</span>
              </div>
              <ProgressBar value={item.percent} tone={index === 1 ? 'soft' : 'blue'} className="mt-3" />
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
