'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingPayload } from '@/lib/api';
import { submitOnboarding } from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { APP_BRAND_NAME } from '@/lib/brand';
import { DashboardCard, MetricPill, PanelTag, ProgressBar, SectionEyebrow } from '@/components/web/dashboard-shell';
import { LiveStatusCard } from '@/components/web/live-status-card';
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from '@/lib/onboarding-draft';
import { describeUserFacingError } from '@/lib/user-facing-error';
import { useUnsavedChangesWarning } from '@/lib/use-unsaved-changes-warning';

const defaultPayload: OnboardingPayload = {
  gender: 'male',
  birthYear: 2003,
  heightCm: 178,
  currentWeightKg: 76,
  targetType: 'cut',
  activityLevel: 'moderate',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: 4,
  dietScene: 'canteen',
  dietPreferences: ['high_protein'],
  dietRestrictions: [],
  supplementOptIn: true,
};

type DietSceneOption = 'canteen' | 'cookable';

type DietChoiceOption = {
  value: string;
  label: string;
  description: string;
};

const onboardingSteps = [
  {
    label: '第 1 步',
    title: '基础信息',
    reason: '用来估算基础代谢、体型区间和训练恢复负荷。',
  },
  {
    label: '第 2 步',
    title: '目标与习惯',
    reason: '用来决定今天该练什么、每周练几次，以及计划节奏应该有多强。',
  },
  {
    label: '第 3 步',
    title: '饮食偏好',
    reason: '用来把建议变成你真能执行的餐单，而不是只给一套理想答案。',
  },
] as const;

const dietPreferenceOptions: DietChoiceOption[] = [
  { value: 'high_protein', label: '高蛋白', description: '优先保证蛋白质摄入' },
  { value: 'low_fat', label: '低脂', description: '减少油脂负担' },
  { value: 'low_carb', label: '低碳', description: '控制碳水比例' },
  { value: 'high_fiber', label: '高纤维', description: '增加饱腹感和肠道友好度' },
  { value: 'quick_meal', label: '省时快餐', description: '适合准备时间很少的场景' },
  { value: 'balanced', label: '均衡饮食', description: '更重视长期稳定执行' },
];

const dietRestrictionOptions: DietChoiceOption[] = [
  { value: 'no_beef', label: '不吃牛肉', description: '避免牛肉及相关餐食' },
  { value: 'no_pork', label: '不吃猪肉', description: '避免猪肉及相关餐食' },
  { value: 'no_seafood', label: '不吃海鲜', description: '避免鱼虾贝类食材' },
  { value: 'no_dairy', label: '不吃奶制品', description: '避免牛奶、奶酪等乳制品' },
  { value: 'no_egg', label: '不吃鸡蛋', description: '避免鸡蛋及含蛋餐食' },
  { value: 'vegetarian', label: '素食', description: '以植物性食物为主' },
];

function toDietSceneOption(value: OnboardingPayload['dietScene']): DietSceneOption {
  return value === 'canteen' ? 'canteen' : 'cookable';
}

function fromDietSceneOption(value: DietSceneOption): OnboardingPayload['dietScene'] {
  return value === 'canteen' ? 'canteen' : 'dorm';
}

function toggleStringArrayValue(current: string[], value: string) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function normalizeMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '建档还没有提交成功。',
    nextStep: '检查当前步骤信息后再试一次，必要时先保存草稿稍后继续。',
    dataStatus: '当前步骤内容已自动暂存到这台设备，重新进入仍可继续填写。',
  });
}

function formatSavedTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildDraftSummary(draft: OnboardingDraft | null) {
  if (!draft) {
    return '';
  }

  return `已在当前设备自动暂存，最后保存于 ${formatSavedTime(draft.savedAt)}。`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingPayload>(defaultPayload);
  const [dietSceneOption, setDietSceneOption] = useState<DietSceneOption>(toDietSceneOption(defaultPayload.dietScene));
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [draftNotice, setDraftNotice] = useState('');
  const [error, setError] = useState('');
  const [successHint, setSuccessHint] = useState('');
  const [isPending, startTransition] = useTransition();
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(defaultPayload),
    [form],
  );

  useUnsavedChangesWarning(
    hasUnsavedChanges && !isPending,
    '建档内容还没有保存，离开后会丢失，确认继续吗？',
  );

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    const existingDraft = readOnboardingDraft();
    if (existingDraft) {
      setDraft(existingDraft);
      setDraftNotice(buildDraftSummary(existingDraft));
    }
  }, [router]);

  useEffect(() => {
    if (!hasUnsavedChanges && currentStep === 0) {
      return;
    }

    const nextDraft: OnboardingDraft = {
      form,
      currentStep,
      savedAt: new Date().toISOString(),
    };
    saveOnboardingDraft(nextDraft);
    setDraft(nextDraft);
    setDraftNotice(`已自动暂存到当前设备，离开后回来也能从${onboardingSteps[currentStep].label}继续。`);
  }, [currentStep, form, hasUnsavedChanges]);

  function updateField<Key extends keyof OnboardingPayload>(key: Key, value: OnboardingPayload[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDietSceneOption(value: DietSceneOption) {
    setDietSceneOption(value);
    updateField('dietScene', fromDietSceneOption(value));
  }

  function restoreDraft() {
    const existingDraft = readOnboardingDraft();
    if (!existingDraft) {
      return;
    }

    setForm(existingDraft.form);
    setCurrentStep(existingDraft.currentStep);
    setDietSceneOption(toDietSceneOption(existingDraft.form.dietScene));
    setDraft(existingDraft);
    setDraftNotice(`已恢复上次草稿，将从${onboardingSteps[existingDraft.currentStep].label}继续。`);
  }

  function resetDraft() {
    clearOnboardingDraft();
    setDraft(null);
    setDraftNotice('已清除本地草稿。');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setError('');
    setSuccessHint('');

    startTransition(async () => {
      try {
        const result = await submitOnboarding(session.accessToken, form);
        clearOnboardingDraft();
        setStoredSessionOnboardingStatus(true);
        setSuccessHint(`建档完成，已生成 ${result.generatedPlanDate} 的计划。即将跳转到今日执行...`);
        setTimeout(() => {
          router.replace('/today');
        }, 2000);
      } catch (submitError) {
        setError(normalizeMessage(submitError));
      }
    });
  }

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const currentStepConfig = onboardingSteps[currentStep];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[0.88fr_1.12fr]">
        <DashboardCard className="bg-[linear-gradient(155deg,#0e3d62,#0f7ea5_58%,#63b9ec)] p-8 text-white shadow-[0_30px_80px_rgba(15,126,165,0.24)] sm:p-10">
          <SectionEyebrow>Onboarding</SectionEyebrow>
          <h1 className="mt-4 text-[48px] font-semibold leading-[0.95] sm:text-[64px]">建立你的训练档案</h1>
          <p className="mt-6 max-w-xl text-lg leading-9 text-white/84">
            {APP_BRAND_NAME}会把你的基础信息、目标和生活场景转换成第一版训练与饮食计划。整个流程预计 2 分钟，支持自动暂存。
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <MetricPill label="预计耗时" value="预计 2 分钟" accent />
            <MetricPill label="当前进度" value={`${currentStep + 1} / ${onboardingSteps.length}`} />
            <MetricPill label="完成后得到" value="今日计划 + 饮食建议" />
            <MetricPill label="草稿机制" value="自动暂存到当前设备" />
          </div>
          <div className="mt-8 rounded-[28px] bg-white/12 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/72">进度</p>
              <p className="text-sm text-white/82">{currentStepConfig.label}</p>
            </div>
            <ProgressBar value={progress} max={100} tone="soft" className="mt-4" />
            <p className="mt-4 text-lg font-semibold text-white">{currentStepConfig.title}</p>
            <p className="mt-2 text-sm leading-7 text-white/82">为什么要填这些信息：{currentStepConfig.reason}</p>
          </div>
        </DashboardCard>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          {draft ? (
            <LiveStatusCard tone="success">
              {draftNotice || buildDraftSummary(draft)}
            </LiveStatusCard>
          ) : null}
          {successHint ? <LiveStatusCard tone="success">{successHint}</LiveStatusCard> : null}
          {error ? <LiveStatusCard tone="error">{error}</LiveStatusCard> : null}

          <DashboardCard className="p-7 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <SectionEyebrow>{currentStepConfig.label}</SectionEyebrow>
                <h2 className="mt-3 text-[36px] font-semibold text-[#17324d]">{currentStepConfig.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#5d7288]">
                  为什么要填这些信息：{currentStepConfig.reason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {draft ? (
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="rounded-full border border-[#d3e3ee] bg-white px-4 py-3 text-sm font-semibold text-[#17324d]"
                  >
                    恢复上次草稿
                  </button>
                ) : null}
                {draft ? (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="rounded-full border border-[#d3e3ee] bg-white px-4 py-3 text-sm font-semibold text-[#17324d]"
                  >
                    清除草稿
                  </button>
                ) : null}
                <PanelTag tone="deep">{currentStepConfig.label}</PanelTag>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {onboardingSteps.map((step, index) => (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    index === currentStep
                      ? 'border-[#0f7ea5] bg-[#e7f6fd] text-[#0f6f96]'
                      : 'border-[#d8e5ee] bg-[#f8fbfe] text-[#17324d]'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]">{step.label}</p>
                  <p className="mt-2 text-base font-semibold">{step.title}</p>
                </button>
              ))}
            </div>

            {currentStep === 0 ? (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  性别
                  <select
                    name="gender"
                    autoComplete="sex"
                    className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4"
                    value={form.gender}
                    onChange={(event) => updateField('gender', event.target.value as OnboardingPayload['gender'])}
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  出生年份
                  <input
                    name="birthYear"
                    autoComplete="bday-year"
                    inputMode="numeric"
                    className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4"
                    type="number"
                    value={form.birthYear}
                    onChange={(event) => updateField('birthYear', Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  身高（cm）
                  <input
                    name="heightCm"
                    autoComplete="off"
                    inputMode="numeric"
                    className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4"
                    type="number"
                    value={form.heightCm}
                    onChange={(event) => updateField('heightCm', Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  当前体重（kg）
                  <input
                    name="currentWeightKg"
                    autoComplete="off"
                    inputMode="decimal"
                    className="rounded-[22px] border border-[#d8e5ee] bg-[#f8fbfe] px-4 py-4"
                    type="number"
                    value={form.currentWeightKg}
                    onChange={(event) => updateField('currentWeightKg', Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  目标类型
                  <select
                    name="targetType"
                    className="rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4"
                    value={form.targetType}
                    onChange={(event) => updateField('targetType', event.target.value as OnboardingPayload['targetType'])}
                  >
                    <option value="cut">减脂</option>
                    <option value="maintain">维持</option>
                    <option value="bulk">增肌</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  活动水平
                  <select
                    name="activityLevel"
                    className="rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4"
                    value={form.activityLevel}
                    onChange={(event) => updateField('activityLevel', event.target.value as OnboardingPayload['activityLevel'])}
                  >
                    <option value="low">低</option>
                    <option value="light">轻</option>
                    <option value="moderate">中</option>
                    <option value="high">高</option>
                    <option value="athlete">运动员</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  训练经验
                  <select
                    name="trainingExperience"
                    className="rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4"
                    value={form.trainingExperience}
                    onChange={(event) => updateField('trainingExperience', event.target.value as OnboardingPayload['trainingExperience'])}
                  >
                    <option value="beginner">新手</option>
                    <option value="intermediate">进阶</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288]">
                  每周训练天数
                  <input
                    name="trainingDaysPerWeek"
                    autoComplete="off"
                    inputMode="numeric"
                    className="rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4"
                    type="number"
                    min="0"
                    max="7"
                    value={form.trainingDaysPerWeek}
                    onChange={(event) => updateField('trainingDaysPerWeek', Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2 text-sm text-[#5d7288] md:col-span-2">
                  饮食场景
                  <select
                    name="dietScene"
                    className="rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4"
                    value={dietSceneOption}
                    onChange={(event) => updateDietSceneOption(event.target.value as DietSceneOption)}
                  >
                    <option value="canteen">食堂</option>
                    <option value="cookable">可做饭</option>
                  </select>
                </label>

                <label className="md:col-span-2 flex items-center gap-3 rounded-[22px] border border-[#d8e5ee] bg-white px-4 py-4 text-sm text-[#17324d]">
                  <input
                    name="supplementOptIn"
                    type="checkbox"
                    checked={form.supplementOptIn}
                    onChange={(event) => updateField('supplementOptIn', event.target.checked)}
                  />
                  允许系统给出基础补剂建议
                </label>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-[#d8e5ee] bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#17324d]">饮食偏好</h3>
                      <p className="mt-1 text-sm leading-6 text-[#5d7288]">选择你更愿意长期坚持的饮食方向。</p>
                    </div>
                    <PanelTag tone="deep">{form.dietPreferences.length} 项</PanelTag>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {dietPreferenceOptions.map((option) => {
                      const selected = form.dietPreferences.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('dietPreferences', toggleStringArrayValue(form.dietPreferences, option.value))}
                          className={`min-w-[132px] rounded-[18px] border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-[#0f7ea5] bg-[#e7f6fd] text-[#0f6f96] shadow-[0_8px_20px_rgba(15,126,165,0.12)]'
                              : 'border-[#d8e5ee] bg-[#f8fbfe] text-[#17324d] hover:border-[#9fcae2] hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold">{option.label}</div>
                          <div className="mt-1 text-xs leading-5 text-[#5d7288]">{option.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#d8e5ee] bg-white p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#17324d]">饮食限制</h3>
                      <p className="mt-1 text-sm leading-6 text-[#5d7288]">选择你不能吃、少吃或需要避开的食材。</p>
                    </div>
                    <PanelTag tone="deep">{form.dietRestrictions.length} 项</PanelTag>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {dietRestrictionOptions.map((option) => {
                      const selected = form.dietRestrictions.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => updateField('dietRestrictions', toggleStringArrayValue(form.dietRestrictions, option.value))}
                          className={`min-w-[132px] rounded-[18px] border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-[#b85a4f] bg-[#fff3f1] text-[#a34d47] shadow-[0_8px_20px_rgba(163,77,71,0.12)]'
                              : 'border-[#d8e5ee] bg-[#f8fbfe] text-[#17324d] hover:border-[#e1b4ad] hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold">{option.label}</div>
                          <div className="mt-1 text-xs leading-5 text-[#5d7288]">{option.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep((current) => Math.max(current - 1, 0))}
                disabled={currentStep === 0}
                className="rounded-full border border-[#d3e3ee] bg-white px-5 py-3 text-sm font-semibold text-[#17324d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                上一步
              </button>
              <div className="flex flex-wrap gap-3">
                {currentStep < onboardingSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((current) => Math.min(current + 1, onboardingSteps.length - 1))}
                    className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white"
                  >
                    下一步
                  </button>
                ) : null}
                {currentStep === onboardingSteps.length - 1 ? (
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-full bg-[#0f7ea5] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,126,165,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? '提交中...' : '完成建档并生成今日计划'}
                  </button>
                ) : null}
              </div>
            </div>
          </DashboardCard>
        </form>
      </section>
    </main>
  );
}
