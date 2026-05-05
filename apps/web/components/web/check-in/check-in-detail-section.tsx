import { DashboardCard, ProgressBar } from '@/components/web/dashboard-shell';
import { SignalButtons } from '@/components/web/check-in/form-controls';
import type { CheckInFormState } from '@/lib/use-check-in-editor';

type CheckInDetailSectionProps = {
  mode: 'quick' | 'detailed';
  form: CheckInFormState;
  waterIntakeValue: number | null;
  stepCountValue: number | null;
  onSetMode: (mode: 'quick' | 'detailed') => void;
  onUpdateField: (field: keyof CheckInFormState, value: string) => void;
};

export function CheckInDetailSection({
  mode,
  form,
  waterIntakeValue,
  stepCountValue,
  onSetMode,
  onUpdateField,
}: CheckInDetailSectionProps) {
  if (mode !== 'detailed') {
    return (
      <DashboardCard className="bg-[#f7fbfe]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[#17324d]">详细项已收起</p>
            <p className="mt-2 text-sm leading-7 text-[#5f768d]">先提交核心完成度，稍后再补水分、步数、体感、体重和备注。</p>
          </div>
          <button type="button" onClick={() => onSetMode('detailed')} className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white">
            去补详细模式
          </button>
        </div>
      </DashboardCard>
    );
  }

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1fr_1fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <p className="text-[42px] font-semibold text-[#0f7ea5]">{waterIntakeValue === null ? '待填' : (waterIntakeValue / 1000).toFixed(1)}</p>
              <p className="text-lg text-[#7a8f9f]">{waterIntakeValue === null ? '' : '/ 3L'}</p>
            </div>
          </div>
          <h2 className="mt-8 text-[36px] font-semibold text-[#17324d]">水分摄入</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <input
              name="waterIntakeMl"
              autoComplete="off"
              inputMode="numeric"
              type="number"
              min="0"
              value={form.waterIntakeMl}
              onChange={(event) => onUpdateField('waterIntakeMl', event.target.value)}
              className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3 text-lg"
            />
            <span className="text-sm text-[#6f8497]">ml</span>
          </div>
          <div className="mt-6 flex gap-2">
            {[1, 2, 3, 4].map((segment) => (
              <span
                key={segment}
                className={`h-3 flex-1 rounded-full ${
                  segment <= Math.round((waterIntakeValue ?? 0) / 750) ? 'bg-[#0f7ea5]' : 'bg-[#dce8f1]'
                }`}
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-[#6f8497]">
            {waterIntakeValue === null ? '水分还没有填写，提交前会按你的真实记录同步。' : `已完成 ${Math.min(100, Math.round((waterIntakeValue / 3000) * 100))}%`}
          </p>
        </DashboardCard>

        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <p className="text-[42px] font-semibold text-[#17324d]">{stepCountValue === null ? '待填' : stepCountValue.toLocaleString('zh-CN')}</p>
              <p className="text-lg text-[#7a8f9f]">{stepCountValue === null ? '记录真实步数' : '目标 10,000'}</p>
            </div>
          </div>
          <h2 className="mt-8 text-[36px] font-semibold text-[#17324d]">步数目标</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <input
              name="stepCount"
              autoComplete="off"
              inputMode="numeric"
              type="number"
              min="0"
              value={form.stepCount}
              onChange={(event) => onUpdateField('stepCount', event.target.value)}
              className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3 text-lg"
            />
            <span className="text-sm text-[#6f8497]">步</span>
          </div>
          <ProgressBar value={stepCountValue ?? 0} max={10000} className="mt-6" />
        </DashboardCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[0.78fr_1.22fr]">
        <DashboardCard>
          <div className="grid gap-5">
            <SignalButtons label="精力" value={form.energyLevel} onChange={(next) => onUpdateField('energyLevel', next)} />
            <SignalButtons label="饱腹感" value={form.satietyLevel} onChange={(next) => onUpdateField('satietyLevel', next)} />
            <SignalButtons label="疲劳感" value={form.fatigueLevel} onChange={(next) => onUpdateField('fatigueLevel', next)} />
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[#5c7287]">
              当前体重（kg）
              <input
                name="weightKg"
                autoComplete="off"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.1"
                value={form.weightKg}
                onChange={(event) => onUpdateField('weightKg', event.target.value)}
                className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3"
              />
            </label>
            <div className="rounded-[20px] bg-[#f7fbfe] px-4 py-4 text-sm leading-7 text-[#5c7287]">
              快打卡已完成时，这里可以补充备注和体重，周复盘会更完整。
            </div>
          </div>
          <label className="mt-5 grid gap-2 text-sm text-[#5c7287]">
            备注
            <textarea
              name="note"
              autoComplete="off"
              spellCheck={false}
              value={form.note}
              onChange={(event) => onUpdateField('note', event.target.value)}
              rows={5}
              className="rounded-[24px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4"
              placeholder="例如：午餐临时聚餐、训练中膝盖不适、晚上加班导致睡眠偏少。"
            />
          </label>
        </DashboardCard>
      </section>
    </>
  );
}
