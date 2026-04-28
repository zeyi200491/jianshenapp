'use client';

import type { TrainingTemplateDetail } from '@/lib/api';
import { DashboardCard, PanelTag } from '@/components/web/dashboard-shell';

type TrainingTemplateListProps = {
  templates: TrainingTemplateDetail[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onEnableTemplate: (templateId: string) => void;
  onSetDefaultTemplate: (templateId: string) => void;
  disabled?: boolean;
};

export function TrainingTemplateList({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onEnableTemplate,
  onSetDefaultTemplate,
  disabled = false,
}: TrainingTemplateListProps) {
  return (
    <DashboardCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[#17324d]">我的模板</p>
          <p className="mt-1 text-sm text-[#5f768d]">先维护长期周模板，再按需要应用到今天。</p>
        </div>
        <button
          type="button"
          onClick={onCreateTemplate}
          disabled={disabled}
          className="rounded-full bg-[#17324d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          新建模板
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {templates.map((template) => {
          const active = template.id === selectedTemplateId;
          const canActivate = template.status === 'active';

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={`rounded-[24px] border px-4 py-4 text-left ${
                active ? 'border-[#9fd6ef] bg-[#eff8fe]' : 'border-[#dde8f0] bg-[#f8fbfe]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#17324d]">{template.name}</p>
                  <p className="mt-1 text-sm text-[#5f768d]">
                    {template.days.length} 天配置 · {canActivate ? '可参与 today 页替换' : '已归档暂不启用'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.isEnabled ? <PanelTag tone="deep">已启用</PanelTag> : null}
                  {template.isDefault ? <PanelTag>默认</PanelTag> : null}
                  {!canActivate ? <PanelTag>已归档</PanelTag> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17324d]">
                  {template.notes || '还没有备注'}
                </span>
                {canActivate && !template.isEnabled ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEnableTemplate(template.id);
                    }}
                    className="rounded-full bg-[#17324d] px-3 py-2 text-xs font-semibold text-white"
                  >
                    设为 today 默认来源
                  </button>
                ) : null}
                {canActivate && !template.isDefault ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetDefaultTemplate(template.id);
                    }}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17324d]"
                  >
                    设为长期默认
                  </button>
                ) : null}
              </div>
            </button>
          );
        })}

        {templates.length === 0 ? (
          <div className="rounded-[24px] bg-[#f8fbfe] px-4 py-5 text-sm leading-7 text-[#5f768d]">
            还没有个人训练模板。先新建一套周模板，后面才能在 today 页一键替换今天的训练方案。
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
