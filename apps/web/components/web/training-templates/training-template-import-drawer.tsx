'use client';

import type { TrainingTemplateImportPreview, TrainingTemplateWeekday } from '@/lib/api';

const weekdayLabels: Record<TrainingTemplateWeekday, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
};

const matchStatusLabels = {
  matched: '已匹配标准动作',
  free_text: '按自由文本保存',
  warning: '需要人工确认',
  invalid: '无法导入',
} as const;

type TrainingTemplateImportDrawerProps = {
  open: boolean;
  templateName: string;
  rawText: string;
  preview: TrainingTemplateImportPreview | null;
  parsing: boolean;
  applying: boolean;
  error: string;
  selectedWeekdays: TrainingTemplateWeekday[];
  onClose: () => void;
  onRawTextChange: (value: string) => void;
  onPreview: () => void;
  onToggleWeekday: (weekday: TrainingTemplateWeekday) => void;
  onApply: () => void;
  onUseExample: () => void;
};

export function TrainingTemplateImportDrawer({
  open,
  templateName,
  rawText,
  preview,
  parsing,
  applying,
  error,
  selectedWeekdays,
  onClose,
  onRawTextChange,
  onPreview,
  onToggleWeekday,
  onApply,
  onUseExample,
}: TrainingTemplateImportDrawerProps) {
  if (!open) {
    return null;
  }

  const previewSelectableDays =
    preview?.parsedDays.filter((day) => day.selectable).map((day) => day.weekday) ?? [];
  const hasSelectedWeekdays = selectedWeekdays.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102235]/35">
      <button
        type="button"
        aria-label="关闭文字导入"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <section className="flex h-full w-full max-w-[760px] flex-col bg-[#f7fbff] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#d7e3ec] px-6 py-5">
          <div>
            <p className="text-lg font-semibold text-[#17324d]">文字导入</p>
            <p className="mt-1 text-sm leading-6 text-[#5f768d]">
              把训练文本贴进来，先解析预览，确认后只覆盖你勾选的那些天。
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7ea5]">
              {templateName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#17324d]"
          >
            关闭
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-[24px] bg-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[#17324d]">导入文本</p>
                <p className="mt-1 text-sm text-[#5f768d]">
                  支持整周或部分天。识别不了的行会单独标出来，不会直接覆盖。
                </p>
              </div>
              <button
                type="button"
                onClick={onUseExample}
                className="rounded-full bg-[#eef6fb] px-3 py-2 text-xs font-semibold text-[#0f7ea5]"
              >
                示例格式
              </button>
            </div>
            <textarea
              value={rawText}
              onChange={(event) => onRawTextChange(event.target.value)}
              placeholder="例如：周二 胸肩三头"
              className="mt-4 min-h-[220px] w-full rounded-[20px] border border-[#d7e3ec] bg-[#f8fbfe] px-4 py-4 text-sm leading-7 text-[#17324d] outline-none"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPreview}
                disabled={parsing || applying || !rawText.trim()}
                className="rounded-full bg-[#0f7ea5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {parsing ? '解析中...' : '开始解析'}
              </button>
              <span className="text-xs leading-6 text-[#5f768d]">
                先解析，不落库；只有点“确认覆盖”之后才会真正改模板。
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-[24px] border border-[#f0c7be] bg-[#fff4f0] px-5 py-4 text-sm leading-7 text-[#8a3d2a]">
              {error}
            </div>
          ) : null}

          {preview ? (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="识别到的天数" value={`${preview.summary.detectedDays}`} />
                <StatCard label="成功动作行" value={`${preview.summary.successfulLines}`} />
                <StatCard label="警告行" value={`${preview.summary.warningLines}`} />
                <StatCard label="阻塞错误" value={`${preview.summary.blockingLines}`} />
              </div>

              {preview.errors.length > 0 ? (
                <div className="rounded-[24px] bg-white px-5 py-5">
                  <p className="text-base font-semibold text-[#17324d]">问题清单</p>
                  <div className="mt-4 space-y-3">
                    {preview.errors.map((errorItem, index) => (
                      <div
                        key={`${errorItem.lineNumber}-${index}`}
                        className="rounded-[18px] border border-[#f0d1c7] bg-[#fff6f2] px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-[#8a3d2a]">
                          第 {errorItem.lineNumber} 行
                          {errorItem.weekday ? ` · ${weekdayLabels[errorItem.weekday]}` : ''}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-[#8a3d2a]">{errorItem.rawLine}</p>
                        <p className="mt-1 text-xs leading-6 text-[#8a3d2a]">{errorItem.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {preview.parsedDays.map((day) => {
                  const selected = selectedWeekdays.includes(day.weekday);
                  const statusLabel =
                    day.dayType === 'rest'
                      ? '休息日'
                      : day.selectable
                        ? day.warnings.length > 0
                          ? '可导入，含警告'
                          : '可导入'
                        : '部分异常';

                  return (
                    <div key={day.weekday} className="rounded-[24px] bg-white px-5 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!day.selectable}
                            onChange={() => onToggleWeekday(day.weekday)}
                            className="mt-1 h-4 w-4 rounded border-[#c7d8e4] text-[#0f7ea5]"
                          />
                          <div>
                            <p className="text-base font-semibold text-[#17324d]">
                              {weekdayLabels[day.weekday]} · {day.title}
                            </p>
                            <p className="mt-1 text-sm text-[#5f768d]">{statusLabel}</p>
                          </div>
                        </label>
                        <span className="rounded-full bg-[#eef6fb] px-3 py-2 text-xs font-semibold text-[#0f7ea5]">
                          {day.dayType === 'rest' ? '休息 / 恢复' : `${day.items.length} 个动作`}
                        </span>
                      </div>

                      {day.warnings.length > 0 ? (
                        <div className="mt-4 rounded-[18px] bg-[#fff8ec] px-4 py-3 text-xs leading-6 text-[#8a6330]">
                          {day.warnings.join('；')}
                        </div>
                      ) : null}

                      {day.dayType === 'rest' ? (
                        <p className="mt-4 text-sm leading-7 text-[#5f768d]">
                          这个训练日会被覆盖成休息日，并清空原有动作。
                        </p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {day.items.map((item, itemIndex) => (
                            <div
                              key={`${day.weekday}-${itemIndex}`}
                              className="rounded-[18px] bg-[#f8fbfe] px-4 py-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-[#17324d]">
                                    {item.exerciseName}
                                  </p>
                                  <p className="mt-1 text-xs leading-6 text-[#5f768d]">
                                    {item.repText || item.reps || '自定义'} × {item.sets ?? '-'} 组
                                  </p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17324d]">
                                  {matchStatusLabels[item.matchStatus]}
                                </span>
                              </div>
                              <p className="mt-3 text-xs leading-6 text-[#5f768d]">
                                原文：{item.rawLine}
                              </p>
                              {item.notes ? (
                                <p className="mt-1 text-xs leading-6 text-[#5f768d]">
                                  备注：{item.notes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-[24px] bg-white px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[#17324d]">确认覆盖</p>
                    <p className="mt-1 text-sm text-[#5f768d]">
                      只会覆盖本次勾选的周几；没勾的天保持原样。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onApply}
                    disabled={applying || parsing || !hasSelectedWeekdays || previewSelectableDays.length === 0}
                    className="rounded-full bg-[#17324d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {applying ? '覆盖中...' : '确认覆盖'}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f768d]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#17324d]">{value}</p>
    </div>
  );
}
