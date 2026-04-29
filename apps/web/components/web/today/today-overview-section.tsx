import { DashboardCard, MetricPill, PanelTag } from '@/components/web/dashboard-shell';
import { getStateLabel, type DataStateKind } from '@/lib/display-state';

type TodayOverviewInsight = {
  title: string;
  value: string;
  detail: string;
  kind: DataStateKind;
  unit?: string | null;
};

type TodayOverviewMetric = {
  label: string;
  value: string;
  accent?: boolean;
};

type TodayOverviewSectionProps = {
  energyInsight: TodayOverviewInsight;
  heroMetrics: TodayOverviewMetric[];
  checkInInsight: TodayOverviewInsight;
  hasCheckedIn: boolean;
  dietCompletionRate: number | null;
  trainingCompletionRate: number | null;
};

export function TodayOverviewSection({
  energyInsight,
  heroMetrics,
  checkInInsight,
  hasCheckedIn,
  dietCompletionRate,
  trainingCompletionRate,
}: TodayOverviewSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.28fr_0.72fr]">
      <DashboardCard className="p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#5d7288]">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0f7ea5]" />
              <span className="text-sm font-semibold">{energyInsight.title}</span>
            </div>
            <div className="mt-6 flex items-end gap-3">
              <p className="text-[72px] font-semibold leading-none text-[#1f2f41]">{energyInsight.value}</p>
              {energyInsight.unit ? (
                <span className="pb-2 text-[28px] font-semibold text-[#566f84]">{energyInsight.unit}</span>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#587086]">{energyInsight.detail}</p>
          </div>
          <PanelTag tone={energyInsight.kind === 'actual' ? 'deep' : 'soft'}>
            {getStateLabel(energyInsight.kind)}
          </PanelTag>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {heroMetrics.map((item) => (
            <div key={item.label}>
              <p className="text-sm text-[#6e8396]">{item.label}</p>
              <p className={`mt-2 text-[22px] font-semibold ${item.accent ? 'text-[#0f7ea5]' : 'text-[#1a3247]'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard className="bg-[#edf3f8]">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-[#22374c]">{checkInInsight.title}</p>
          <PanelTag tone={checkInInsight.kind === 'actual' ? 'deep' : 'soft'}>
            {getStateLabel(checkInInsight.kind)}
          </PanelTag>
        </div>
        <div className="mt-5 rounded-[26px] bg-white px-5 py-5">
          <p className="text-[40px] font-semibold text-[#20364a]">{checkInInsight.value}</p>
          <p className="mt-3 text-sm leading-7 text-[#5d7288]">{checkInInsight.detail}</p>
        </div>
        {hasCheckedIn ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricPill label="饮食完成度" value={`${dietCompletionRate ?? '--'}%`} />
            <MetricPill label="训练完成度" value={`${trainingCompletionRate ?? '--'}%`} accent />
          </div>
        ) : null}
      </DashboardCard>
    </section>
  );
}
