import type { WeeklyReviewActionItem } from '@/lib/api';
import { DashboardCard, PanelTag } from '@/components/web/dashboard-shell';

type ReviewActionItemsSectionProps = {
  actionItems: WeeklyReviewActionItem[];
  updatingActionItemId: string;
  onToggleActionItem: (item: WeeklyReviewActionItem) => void;
};

export function ReviewActionItemsSection({
  actionItems,
  updatingActionItemId,
  onToggleActionItem,
}: ReviewActionItemsSectionProps) {
  return (
    <DashboardCard className="bg-[#f7fbfe]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[30px] font-semibold text-[#17324d]">下周行动清单</h2>
          <p className="mt-2 text-sm leading-7 text-[#5f768d]">把复盘建议变成可执行动作，勾选后会直接同步到账户。</p>
        </div>
        <PanelTag tone="deep">{actionItems.length} 项</PanelTag>
      </div>
      <div className="mt-6 space-y-3">
        {actionItems.map((item) => {
          const checked = item.status === 'completed';
          const isUpdating = updatingActionItemId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleActionItem(item)}
              disabled={isUpdating}
              className="flex w-full items-start gap-4 rounded-[24px] border border-[#d9e7f1] bg-white px-5 py-4 text-left transition hover:border-[#9fd6ef] disabled:opacity-60"
            >
              <span className={`mt-1 grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold ${checked ? 'border-[#0f7ea5] bg-[#0f7ea5] text-white' : 'border-[#c7d9e6] text-transparent'}`}>
                ✓
              </span>
              <span className="flex-1">
                <span className={`block text-base font-semibold ${checked ? 'text-[#5f768d] line-through' : 'text-[#17324d]'}`}>{item.title}</span>
                <span className="mt-2 block text-sm text-[#6f8396]">
                  {checked ? '已完成，系统会保留这条执行记录。' : '待执行，完成后点这里勾选。'}
                </span>
              </span>
              <PanelTag tone={checked ? 'deep' : 'soft'}>
                {isUpdating ? '同步中' : checked ? '已完成' : '待执行'}
              </PanelTag>
            </button>
          );
        })}
        {actionItems.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#d9e7f1] bg-white px-5 py-5 text-sm leading-7 text-[#5f768d]">
            先点击“下周计划预览”，系统会基于本周复盘自动生成 3 条默认行动项。
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
