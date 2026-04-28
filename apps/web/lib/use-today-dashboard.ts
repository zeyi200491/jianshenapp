'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  ApiError,
  applyTrainingOverride,
  createConversation,
  fetchCurrentUser,
  fetchToday,
  previewTrainingTemplate,
  regeneratePlan,
  removeTrainingOverride,
  resetTrainingCycle,
  sendConversationMessage,
  type ActiveTrainingSource,
  updateProfile,
  type CurrentUserPayload,
  type OnboardingPayload,
  type TodayPayload,
  type TrainingFocus,
  type TrainingTemplatePreview,
  type TrainingTemplateWeekday,
  type UpdateProfilePayload,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { describeUserFacingError } from '@/lib/user-facing-error';

type RouterLike = {
  replace: (href: string) => void;
};

export type ProfileFormState = {
  heightCm: string;
  currentWeightKg: string;
  targetType: OnboardingPayload['targetType'];
  activityLevel: OnboardingPayload['activityLevel'];
  trainingExperience: OnboardingPayload['trainingExperience'];
  trainingDaysPerWeek: string;
};

const defaultProfileForm: ProfileFormState = {
  heightCm: '175',
  currentWeightKg: '70',
  targetType: 'cut',
  activityLevel: 'moderate',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: '3',
};

export function normalizeTodayDashboardMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '今日页暂时没有完成同步。',
    nextStep: '稍后刷新页面再试，必要时重新进入今日页。',
    dataStatus: '你已经保存的资料和历史记录不会丢失。',
  });
}

export function buildProfileForm(profile: CurrentUserPayload['profile']): ProfileFormState {
  if (!profile) {
    return defaultProfileForm;
  }

  return {
    heightCm: String(profile.heightCm),
    currentWeightKg: String(profile.currentWeightKg),
    targetType: profile.targetType,
    activityLevel: profile.activityLevel,
    trainingExperience: profile.trainingExperience,
    trainingDaysPerWeek: String(profile.trainingDaysPerWeek),
  };
}

export function buildProfilePayload(form: ProfileFormState): UpdateProfilePayload {
  return {
    heightCm: Number(form.heightCm),
    currentWeightKg: Number(form.currentWeightKg),
    targetType: form.targetType,
    activityLevel: form.activityLevel,
    trainingExperience: form.trainingExperience,
    trainingDaysPerWeek: Number(form.trainingDaysPerWeek),
  };
}

export function buildConversationContext(payload: TodayPayload) {
  const trainingPlan = payload.activeTrainingPlan ?? payload.trainingPlan;
  return {
    dailyPlanId: payload.dailyPlanId,
    dietPlanId: payload.dietPlan?.id,
    trainingPlanId: trainingPlan?.id,
  };
}

export function buildAiPrompt(payload: TodayPayload, trainingFocusLabels: Record<TrainingFocus, string>) {
  if (payload.trainingPlan?.splitType === 'cardio') {
    return `用户今天执行的是减脂有氧计划：${payload.trainingPlan.title}。请基于当前计划输出一份可以直接照做的中文执行提示。要求：1. 先说明热身怎么做；2. 按阶段列出坡度、速度、时长与强度判断；3. 补充姿势与安全提醒；4. 给出结束后的恢复建议；5. 全程简洁分点。`;
  }

  const focusText = payload.trainingCycle.currentFocus
    ? trainingFocusLabels[payload.trainingCycle.currentFocus]
    : payload.trainingPlan?.title ?? '今天训练';

  return `用户今天主动选择了 ${focusText}。请基于当前训练计划，输出一份可以直接照做的 AI 训练提示。要求：1. 先给 5-8 分钟热身；2. 按顺序列出主训练动作；3. 每个动作补一句执行要点；4. 给出建议节奏、组间休息和训练后恢复建议；5. 全程使用简洁中文分点回答。`;
}

export function useTodayDashboard({
  date,
  router,
  trainingFocusLabels,
}: {
  date: string;
  router: RouterLike;
  trainingFocusLabels: Record<TrainingFocus, string>;
}) {
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserPayload | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(defaultProfileForm);
  const [selectedFocus, setSelectedFocus] = useState<TrainingFocus>('push');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [focusMessage, setFocusMessage] = useState('');
  const [aiGuide, setAiGuide] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiGuidePlanId, setAiGuidePlanId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<TrainingTemplatePreview>(null);
  const [selectedTemplateWeekday, setSelectedTemplateWeekday] = useState<TrainingTemplateWeekday | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadTrainingTemplatePreview(accessToken: string, targetDate: string, weekday?: TrainingTemplateWeekday) {
    try {
      const preview = await previewTrainingTemplate(accessToken, { date: targetDate, weekday });
      setTemplatePreview(preview);
      setSelectedTemplateWeekday(preview?.weekday ?? null);
      return preview;
    } catch (previewError) {
      setTemplatePreview(null);
      setSelectedTemplateWeekday(null);

      if (previewError instanceof ApiError && previewError.code === 'VALIDATION_ERROR') {
        setFocusMessage(previewError.message);
      }

      return null;
    }
  }

  async function load(targetDate: string): Promise<TodayPayload | null> {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return null;
    }

    setLoading(true);
    setError('');

    try {
      const [todayPayload, userPayload] = await Promise.all([
        fetchToday(session.accessToken, targetDate),
        fetchCurrentUser(session.accessToken),
      ]);

      setPayload(todayPayload);
      setCurrentUser(userPayload);
      setProfileForm(buildProfileForm(userPayload.profile));
      setSelectedFocus(todayPayload.trainingCycle.startFocus ?? todayPayload.trainingCycle.currentFocus ?? 'push');
      await loadTrainingTemplatePreview(session.accessToken, targetDate);

      if (todayPayload.trainingPlan?.id !== aiGuidePlanId) {
        setAiGuide('');
        setAiError('');
        setAiGuidePlanId('');
      }

      return todayPayload;
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return null;
      }
      if (loadError instanceof ApiError && loadError.code === 'CONFLICT') {
        setStoredSessionOnboardingStatus(false);
        router.replace('/onboarding');
        return null;
      }
      setError(normalizeTodayDashboardMessage(loadError));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function generateAiGuide(targetPayload?: TodayPayload | null) {
    const session = getStoredSession();
    const resolvedPayload = targetPayload ?? payload;

    if (!session || !resolvedPayload?.trainingPlan) {
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const conversation = await createConversation(session.accessToken, {
        title: `${resolvedPayload.trainingPlan.title} AI 训练提示`,
        context: buildConversationContext(resolvedPayload),
      });
      const result = await sendConversationMessage(session.accessToken, conversation.id, {
        content: buildAiPrompt(resolvedPayload, trainingFocusLabels),
        context: buildConversationContext(resolvedPayload),
      });
      setAiGuide(result.assistantMessage.content);
      setAiGuidePlanId(resolvedPayload.trainingPlan.id);
    } catch (requestError) {
      setAiError(describeUserFacingError(requestError, {
        whatHappened: 'AI 训练提示暂时没有生成成功。',
        nextStep: '稍后重试，或先调整计划后重新生成。',
        dataStatus: '当前页面数据和历史计划不会丢失。',
      }));
    } finally {
      setAiLoading(false);
    }
  }

  function handleSelectTemplateWeekday(weekday: TrainingTemplateWeekday) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    startTransition(async () => {
      setFocusMessage('');
      await loadTrainingTemplatePreview(session.accessToken, date, weekday);
    });
  }

  function handleApplyTemplateToToday() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!payload?.dailyPlanId || !templatePreview) {
      return;
    }

    setFocusMessage('');

    startTransition(async () => {
      try {
        await applyTrainingOverride(session.accessToken, payload.dailyPlanId, {
          templateId: templatePreview.templateId,
          weekday: (selectedTemplateWeekday ?? templatePreview.weekday) as TrainingTemplateWeekday,
        });
        const reloaded = await load(date);
        if (reloaded) {
          await generateAiGuide(reloaded);
        }
        setFocusMessage('已切换为你的个人训练模板。');
      } catch (requestError) {
        setError(describeUserFacingError(requestError, {
          whatHappened: '个人训练模板还没有成功应用到今天。',
          nextStep: '稍后重试，或先检查模板当天内容是否完整。',
          dataStatus: '系统原训练方案仍然保留，没有被删除。',
        }));
      }
    });
  }

  function handleRestoreSystemTraining() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!payload?.dailyPlanId) {
      return;
    }

    setFocusMessage('');

    startTransition(async () => {
      try {
        await removeTrainingOverride(session.accessToken, payload.dailyPlanId);
        const reloaded = await load(date);
        if (reloaded) {
          await generateAiGuide(reloaded);
        }
        setFocusMessage('已恢复系统生成的今日训练方案。');
      } catch (requestError) {
        setError(describeUserFacingError(requestError, {
          whatHappened: '系统训练方案还没有恢复成功。',
          nextStep: '稍后重试，或先刷新今日页再操作一次。',
          dataStatus: '你已有的训练记录不会因此丢失。',
        }));
      }
    });
  }

  function handleRegenerate() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setFocusMessage('');
    setProfileMessage('');

    startTransition(async () => {
      try {
        await regeneratePlan(session.accessToken, date);
        const reloaded = await load(date);
        if (reloaded) {
          await generateAiGuide(reloaded);
        }
        setFocusMessage('今日计划已重新生成。');
      } catch (requestError) {
        setError(describeUserFacingError(requestError, {
          whatHappened: '今日计划还没有重新生成成功。',
          nextStep: '稍后重试，或先回到今日页刷新一次。',
          dataStatus: '之前已经生成的计划仍然保留。',
        }));
      }
    });
  }

  function handleGenerateTodayTraining() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (currentUser?.profile?.targetType === 'cut') {
      setFocusMessage('减脂目标不支持力量训练循环切换。');
      return;
    }

    setFocusMessage('');
    setProfileMessage('');

    startTransition(async () => {
      try {
        await resetTrainingCycle(session.accessToken, selectedFocus);
        await regeneratePlan(session.accessToken, date);
        const reloaded = await load(date);
        if (reloaded) {
          await generateAiGuide(reloaded);
        }
        setFocusMessage(`已按 ${trainingFocusLabels[selectedFocus]} 生成今天的 AI 训练计划。`);
      } catch (requestError) {
        setError(describeUserFacingError(requestError, {
          whatHappened: '今日训练计划还没有切换成功。',
          nextStep: '检查目标设置后再试一次。',
          dataStatus: '当前已有计划不会因为这次失败丢失。',
        }));
      }
    });
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setProfileMessage('');
    setFocusMessage('');

    startTransition(async () => {
      try {
        await updateProfile(session.accessToken, buildProfilePayload(profileForm));
        await regeneratePlan(session.accessToken, date);
        const reloaded = await load(date);
        if (reloaded) {
          await generateAiGuide(reloaded);
        }
        setProfileMessage('基础信息已更新，并已按新数据重新生成今日计划。');
      } catch (requestError) {
        setError(describeUserFacingError(requestError, {
          whatHappened: '基础资料还没有更新成功。',
          nextStep: '检查当前输入内容后再试一次。',
          dataStatus: '你之前保存的资料不会丢失。',
        }));
      }
    });
  }

  useEffect(() => {
    void load(date);
  }, [date]);

  useEffect(() => {
    if (!payload?.trainingPlan) {
      return;
    }
    if (payload.trainingCycle.requiresSelection) {
      return;
    }
    if (aiLoading || aiGuidePlanId === payload.trainingPlan.id) {
      return;
    }

    void generateAiGuide(payload);
  }, [payload?.trainingPlan?.id, payload?.trainingCycle.requiresSelection]);

  return {
    payload,
    currentUser,
    profileForm,
    setProfileForm,
    selectedFocus,
    setSelectedFocus,
    loading,
    error,
    profileMessage,
    focusMessage,
    aiGuide,
    aiError,
    aiLoading,
    templatePreview,
    selectedTemplateWeekday,
    isPending,
    activeTrainingSource: (payload?.activeTrainingSource ?? 'system') as ActiveTrainingSource,
    systemTrainingPlan: payload?.systemTrainingPlan ?? null,
    isCutTarget: currentUser?.profile?.targetType === 'cut',
    isStrengthTarget: currentUser?.profile?.targetType !== 'cut',
    load,
    handleRegenerate,
    handleGenerateTodayTraining,
    handleSelectTemplateWeekday,
    handleApplyTemplateToToday,
    handleRestoreSystemTraining,
    handleProfileSubmit,
    generateAiGuide,
  };
}
