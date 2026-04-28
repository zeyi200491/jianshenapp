'use client';

import type {
  IntensityLevel,
  TrainingTemplateDayPayload,
  TrainingTemplateItemPayload,
  TrainingTemplatePayload,
  TrainingTemplateWeekday,
} from '@/lib/api';
import { DashboardCard, PanelTag } from '@/components/web/dashboard-shell';

export type TrainingTemplateDraft = TrainingTemplatePayload & {
  id?: string;
};

type TrainingTemplateEditorProps = {
  draft: TrainingTemplateDraft | null;
  onChange: (draft: TrainingTemplateDraft) => void;
  onSave: () => void;
  disabled?: boolean;
};

const weekdayLabels: Record<TrainingTemplateWeekday, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
};

const intensityLabels: Record<IntensityLevel, string> = {
  low: '低强度',
  medium: '中等强度',
  high: '高强度',
};

const intensityOptions: IntensityLevel[] = ['low', 'medium', 'high'];

function updateDay(
  draft: TrainingTemplateDraft,
  index: number,
  updater: (day: TrainingTemplateDayPayload) => TrainingTemplateDayPayload,
) {
  const days = draft.days.map((day, currentIndex) => (currentIndex === index ? updater(day) : day));
  return { ...draft, days };
}

function updateItem(
  draft: TrainingTemplateDraft,
  dayIndex: number,
  itemIndex: number,
  updater: (item: TrainingTemplateItemPayload) => TrainingTemplateItemPayload,
) {
  return updateDay(draft, dayIndex, (day) => ({
    ...day,
    items: day.items.map((item, currentIndex) => (currentIndex === itemIndex ? updater(item) : item)),
  }));
}

export function TrainingTemplateEditor({
  draft,
  onChange,
  onSave,
  disabled = false,
}: TrainingTemplateEditorProps) {
  if (!draft) {
    return (
      <DashboardCard>
        <p className="text-lg font-semibold text-[#17324d]">周模板编辑器</p>
        <p className="mt-3 text-sm leading-7 text-[#5f768d]">
          先从左侧选择一套模板，或者新建一套周模板，再在这里维护周一到周日的训练内容。
        </p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[#17324d]">周模板编辑器</p>
          <p className="mt-1 text-sm text-[#5f768d]">训练日维护动作清单，休息日保留恢复说明即可。</p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="rounded-full bg-[#0f7ea5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          保存模板
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            placeholder="模板名称"
            className="rounded-[20px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
          />
          <select
            value={draft.status}
            onChange={(event) => onChange({ ...draft, status: event.target.value as TrainingTemplateDraft['status'] })}
            className="rounded-[20px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
          >
            <option value="active">启用可用</option>
            <option value="archived">归档停用</option>
          </select>
          <input
            value={draft.notes ?? ''}
            onChange={(event) => onChange({ ...draft, notes: event.target.value })}
            placeholder="模板备注"
            className="rounded-[20px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
          />
        </div>

        {draft.days.map((day, dayIndex) => (
          <div key={day.weekday} className="rounded-[28px] bg-[#f8fbfe] px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[#17324d]">{weekdayLabels[day.weekday]}</p>
                <p className="mt-1 text-sm text-[#5f768d]">
                  {day.dayType === 'rest' ? '休息 / 恢复日' : '训练日'}
                </p>
              </div>
              <PanelTag>{day.dayType === 'rest' ? '恢复' : '执行'}</PanelTag>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1.2fr_0.8fr_0.8fr]">
              <select
                value={day.dayType}
                onChange={(event) =>
                  onChange(
                    updateDay(draft, dayIndex, (current) => ({
                      ...current,
                      dayType: event.target.value as TrainingTemplateDayPayload['dayType'],
                      splitType: event.target.value === 'rest' ? null : current.splitType ?? 'push_pull_legs',
                      durationMinutes: event.target.value === 'rest' ? null : current.durationMinutes ?? 45,
                      intensityLevel: event.target.value === 'rest' ? null : current.intensityLevel ?? 'medium',
                      items:
                        event.target.value === 'rest'
                          ? []
                          : current.items.length > 0
                            ? current.items
                            : [
                                {
                                  exerciseCode: '',
                                  exerciseName: '',
                                  sets: 3,
                                  reps: '10-12',
                                  restSeconds: 90,
                                  notes: '',
                                },
                              ],
                    })),
                  )
                }
                className="rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
              >
                <option value="training">训练日</option>
                <option value="rest">休息日</option>
              </select>
              <input
                value={day.title}
                onChange={(event) => onChange(updateDay(draft, dayIndex, (current) => ({ ...current, title: event.target.value })))}
                placeholder="当天标题"
                className="rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
              />
              <input
                value={day.splitType ?? ''}
                onChange={(event) =>
                  onChange(updateDay(draft, dayIndex, (current) => ({ ...current, splitType: event.target.value || null })))
                }
                placeholder="splitType"
                disabled={day.dayType === 'rest'}
                className="rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none disabled:bg-[#eef3f7]"
              />
              <input
                value={day.durationMinutes ?? ''}
                onChange={(event) =>
                  onChange(
                    updateDay(draft, dayIndex, (current) => ({
                      ...current,
                      durationMinutes: event.target.value ? Number(event.target.value) : null,
                    })),
                  )
                }
                placeholder="时长（分钟）"
                disabled={day.dayType === 'rest'}
                className="rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none disabled:bg-[#eef3f7]"
              />
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.8fr]">
              <textarea
                value={day.notes ?? ''}
                onChange={(event) => onChange(updateDay(draft, dayIndex, (current) => ({ ...current, notes: event.target.value })))}
                placeholder="当天备注"
                className="min-h-[84px] rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none"
              />
              <select
                value={day.intensityLevel ?? ''}
                onChange={(event) =>
                  onChange(
                    updateDay(draft, dayIndex, (current) => ({
                      ...current,
                      intensityLevel: (event.target.value || null) as TrainingTemplateDayPayload['intensityLevel'],
                    })),
                  )
                }
                disabled={day.dayType === 'rest'}
                className="rounded-[18px] border border-[#d7e3ec] bg-white px-4 py-3 text-sm text-[#17324d] outline-none disabled:bg-[#eef3f7]"
              >
                <option value="">选择强度</option>
                {intensityOptions.map((option) => (
                  <option key={option} value={option}>
                    {intensityLabels[option]}
                  </option>
                ))}
              </select>
            </div>

            {day.dayType === 'training' ? (
              <div className="mt-4 space-y-3">
                {day.items.map((item, itemIndex) => (
                  <div key={`${day.weekday}-${itemIndex}`} className="rounded-[20px] bg-white px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.7fr_0.7fr_0.7fr]">
                      <input
                        value={item.exerciseName}
                        onChange={(event) =>
                          onChange(updateItem(draft, dayIndex, itemIndex, (current) => ({ ...current, exerciseName: event.target.value })))
                        }
                        placeholder="动作名称"
                        className="rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                      <input
                        value={item.exerciseCode}
                        onChange={(event) =>
                          onChange(updateItem(draft, dayIndex, itemIndex, (current) => ({ ...current, exerciseCode: event.target.value })))
                        }
                        placeholder="动作 code"
                        className="rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                      <input
                        value={item.sets}
                        onChange={(event) =>
                          onChange(updateItem(draft, dayIndex, itemIndex, (current) => ({ ...current, sets: Number(event.target.value) || 0 })))
                        }
                        placeholder="组数"
                        className="rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                      <input
                        value={item.reps}
                        onChange={(event) =>
                          onChange(updateItem(draft, dayIndex, itemIndex, (current) => ({ ...current, reps: event.target.value })))
                        }
                        placeholder="次数"
                        className="rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                      <input
                        value={item.restSeconds}
                        onChange={(event) =>
                          onChange(
                            updateItem(draft, dayIndex, itemIndex, (current) => ({
                              ...current,
                              restSeconds: Number(event.target.value) || 0,
                            })),
                          )
                        }
                        placeholder="休息秒数"
                        className="rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <input
                        value={item.notes ?? ''}
                        onChange={(event) =>
                          onChange(updateItem(draft, dayIndex, itemIndex, (current) => ({ ...current, notes: event.target.value })))
                        }
                        placeholder="动作备注"
                        className="min-w-[240px] flex-1 rounded-[16px] border border-[#d7e3ec] bg-white px-3 py-2 text-sm text-[#17324d] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            updateDay(draft, dayIndex, (current) => ({
                              ...current,
                              items: current.items.filter((_, currentIndex) => currentIndex !== itemIndex),
                            })),
                          )
                        }
                        className="rounded-full bg-[#f4e4df] px-3 py-2 text-xs font-semibold text-[#8a3d2a]"
                      >
                        删除动作
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      updateDay(draft, dayIndex, (current) => ({
                        ...current,
                        items: [
                          ...current.items,
                          {
                            exerciseCode: '',
                            exerciseName: '',
                            sets: 3,
                            reps: '10-12',
                            restSeconds: 90,
                            notes: '',
                          },
                        ],
                      })),
                    )
                  }
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17324d]"
                >
                  新增动作
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
