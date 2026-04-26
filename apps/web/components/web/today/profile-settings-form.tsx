'use client';

import type { OnboardingPayload } from '@/lib/api';
import { DashboardCard, MetricPill } from '@/components/web/dashboard-shell';

type ProfileFormState = {
  heightCm: string;
  currentWeightKg: string;
  targetType: OnboardingPayload['targetType'];
  activityLevel: OnboardingPayload['activityLevel'];
  trainingExperience: OnboardingPayload['trainingExperience'];
  trainingDaysPerWeek: string;
};

type ProfileSettingsFormProps = {
  profileForm: ProfileFormState;
  onChange: (next: ProfileFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  message: string;
  disabled: boolean;
  trainingStartLabel: string;
  todayPlanLabel: string;
  dietSummary: string;
  dietPreferences: string;
  dietRestrictions: string;
};

export function ProfileSettingsForm({
  profileForm,
  onChange,
  onSubmit,
  message,
  disabled,
  trainingStartLabel,
  todayPlanLabel,
  dietSummary,
  dietPreferences,
  dietRestrictions,
}: ProfileSettingsFormProps) {
  return (
    <DashboardCard>
      <details>
        <summary className="cursor-pointer list-none text-lg font-semibold text-[#183550]">
          调整基础信息与计划参数
        </summary>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-[#5b7287]">
                身高（cm）
                <input name="heightCm" autoComplete="off" inputMode="numeric" type="number" min="120" max="230" value={profileForm.heightCm} onChange={(event) => onChange({ ...profileForm, heightCm: event.target.value })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm text-[#5b7287]">
                当前体重（kg）
                <input name="currentWeightKg" autoComplete="off" inputMode="decimal" type="number" min="30" max="300" step="0.1" value={profileForm.currentWeightKg} onChange={(event) => onChange({ ...profileForm, currentWeightKg: event.target.value })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm text-[#5b7287]">
                目标类型
                <select name="targetType" value={profileForm.targetType} onChange={(event) => onChange({ ...profileForm, targetType: event.target.value as ProfileFormState['targetType'] })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3">
                  <option value="cut">减脂</option>
                  <option value="maintain">维持</option>
                  <option value="bulk">增肌</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[#5b7287]">
                活动水平
                <select name="activityLevel" value={profileForm.activityLevel} onChange={(event) => onChange({ ...profileForm, activityLevel: event.target.value as ProfileFormState['activityLevel'] })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3">
                  <option value="low">低</option>
                  <option value="light">轻</option>
                  <option value="moderate">中</option>
                  <option value="high">高</option>
                  <option value="athlete">运动员</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[#5b7287]">
                训练经验
                <select name="trainingExperience" value={profileForm.trainingExperience} onChange={(event) => onChange({ ...profileForm, trainingExperience: event.target.value as ProfileFormState['trainingExperience'] })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3">
                  <option value="beginner">新手</option>
                  <option value="intermediate">进阶</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[#5b7287]">
                每周训练天数
                <input name="trainingDaysPerWeek" autoComplete="off" inputMode="numeric" type="number" min="0" max="7" value={profileForm.trainingDaysPerWeek} onChange={(event) => onChange({ ...profileForm, trainingDaysPerWeek: event.target.value })} className="rounded-[20px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-3" />
              </label>
            </div>
            {message ? <p className="rounded-[18px] bg-[#ebf8ef] px-4 py-3 text-sm text-[#1d6a49]">{message}</p> : null}
            <button type="submit" disabled={disabled} className="w-fit rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              保存基础信息并重算计划
            </button>
          </form>
          <div className="rounded-[28px] bg-[#f4f8fc] p-5 text-sm leading-7 text-[#61778d]">
            <p className="font-semibold text-[#17324d]">当前同步状态</p>
            <div className="mt-4 grid gap-3">
              <MetricPill label="训练起点" value={trainingStartLabel} />
              <MetricPill label="今天计划" value={todayPlanLabel} />
              <MetricPill label="饮食摘要" value={dietSummary} />
              <MetricPill label="饮食偏好" value={dietPreferences} />
              <MetricPill label="饮食限制" value={dietRestrictions} />
            </div>
          </div>
        </div>
      </details>
    </DashboardCard>
  );
}
