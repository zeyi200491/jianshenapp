import Link from 'next/link';
import type { WeeklyReviewPayload } from '@/lib/api';
import { getStateLabel } from '@/lib/display-state';
import {
  AccentBadge,
  AccentGlyph,
  CircleGauge,
  DashboardCard,
  MetricPill,
  PanelTag,
  ProgressBar,
} from '@/components/web/dashboard-shell';

type ReviewOverviewSectionProps = {
  review: NonNullable<WeeklyReviewPayload['review']>;
  balanceValue: number;
  coverageValue: number;
  weightChangeLabel: string;
  narrativeSummary: string;
};

export function ReviewOverviewSection({
  review,
  balanceValue,
  coverageValue,
  weightChangeLabel,
  narrativeSummary,
}: ReviewOverviewSectionProps) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[0.82fr_0.78fr_0.7fr]">
        <DashboardCard className="bg-[#0f7ea5] text-white">
          <h2 className="text-[40px] font-semibold">本周亮点</h2>
          <div className="mt-8 space-y-6">
            {review.highlights.slice(0, 2).map((item) => (
              <div key={item} className="flex gap-4">
                <AccentBadge kind="highlight" className="h-12 w-12 bg-white/14 text-white" iconClassName="h-5 w-5" />
                <p className="flex-1 text-lg leading-8 text-white/92">{item}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="bg-[#edf3f8]">
          <div className="flex items-center justify-between">
            <h2 className="text-[34px] font-semibold text-[#17324d]">体重变化</h2>
            <PanelTag tone="deep">{getStateLabel('actual')}</PanelTag>
          </div>
          <div className="mt-8 rounded-[28px] bg-white px-6 py-6">
            <p className="text-[44px] font-semibold leading-none text-[#17324d]">{weightChangeLabel}</p>
            <p className="mt-4 text-lg leading-8 text-[#5f768d]">
              这里展示的是本周复盘真实生成后的周级结果。当前接口只返回整周变化，不再伪造逐日体重曲线。
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetricPill label="计划天数" value={`${review.planDays} 天`} />
            <MetricPill label="已打卡天数" value={`${review.checkedInDays} 天`} accent />
          </div>
        </DashboardCard>

        <DashboardCard className="bg-[#edf3f8]">
          <div className="flex items-center justify-between">
            <h2 className="text-[30px] font-semibold text-[#17324d]">执行平衡</h2>
            <AccentGlyph kind="balance" className="h-5 w-5 text-[#0b7a7c]" />
          </div>
          <div className="mt-8 flex justify-center">
            <CircleGauge value={balanceValue} label="均衡度" tone="teal" size={186} />
          </div>
          <div className="mt-7 space-y-4 text-lg text-[#17324d]">
            <div className="flex items-center justify-between">
              <span>饮食完成度</span>
              <span className="font-semibold">{review.avgDietCompletionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>训练完成度</span>
              <span className="font-semibold">{review.avgTrainingCompletionRate}%</span>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.24fr_0.76fr]">
        <DashboardCard className="bg-[#eef4f9]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[42px] font-semibold text-[#17324d]">完成度概览</h2>
              <p className="mt-2 text-lg text-[#6c8295]">这里展示真实周均完成度，不再绘制没有来源的伪日趋势图。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PanelTag tone="deep">{getStateLabel('actual')}</PanelTag>
              <PanelTag>{coverageValue}% 覆盖</PanelTag>
            </div>
          </div>
          <div className="mt-10 space-y-6">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#17324d]">饮食平均完成度</span>
                <span className="text-[#6c8295]">{review.avgDietCompletionRate}%</span>
              </div>
              <ProgressBar value={review.avgDietCompletionRate} className="mt-3" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#17324d]">训练平均完成度</span>
                <span className="text-[#6c8295]">{review.avgTrainingCompletionRate}%</span>
              </div>
              <ProgressBar value={review.avgTrainingCompletionRate} tone="teal" className="mt-3" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricPill label="打卡覆盖" value={`${coverageValue}%`} />
              <MetricPill label="已记录天数" value={`${review.checkedInDays}`} accent />
              <MetricPill label="体重变化" value={weightChangeLabel} />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[34px] font-semibold text-[#17324d]">AI 深度洞察</h2>
              <p className="mt-2 text-sm text-[#0f7ea5]">本周总结</p>
            </div>
            <AccentGlyph kind="insight" className="h-8 w-8 text-[#c5d5e0]" />
          </div>
          <div className="mt-6 rounded-[28px] bg-[#eaf5fd] px-5 py-5 text-base leading-8 text-[#51697e]">
            {narrativeSummary}
          </div>
          <div className="mt-8">
            <p className="text-[24px] font-semibold text-[#17324d]">优化建议</p>
            <ul className="mt-4 space-y-4 text-base leading-8 text-[#536a7e]">
              {review.recommendations.slice(0, 3).map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#0f7ea5]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/assistant" className="mt-8 inline-flex rounded-full bg-[#eef5fb] px-5 py-3 text-sm font-semibold text-[#0f7ea5]">
            带着复盘去问 AI
          </Link>
        </DashboardCard>
      </section>
    </>
  );
}
