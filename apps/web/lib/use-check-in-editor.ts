'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ApiError,
  fetchCheckIn,
  fetchToday,
  submitCheckIn,
  type CheckInPayload,
  type CheckInRecord,
  type TodayPayload,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { getTodayDateString } from '@/lib/date';
import { describeUserFacingError } from '@/lib/user-facing-error';
import type { CheckInMode } from '@/lib/use-check-in-url-state';

type RouterLike = {
  replace: (href: string) => void;
};

export type CheckInFormState = {
  dietCompletionRate: string;
  trainingCompletionRate: string;
  waterIntakeMl: string;
  stepCount: string;
  weightKg: string;
  energyLevel: string;
  satietyLevel: string;
  fatigueLevel: string;
  note: string;
};

const defaultFormState: CheckInFormState = {
  dietCompletionRate: '',
  trainingCompletionRate: '',
  waterIntakeMl: '',
  stepCount: '',
  weightKg: '',
  energyLevel: '',
  satietyLevel: '',
  fatigueLevel: '',
  note: '',
};

export function normalizeCheckInMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '这次打卡没有保存成功。',
    nextStep: '检查内容后再试一次，或稍后重新提交。',
    dataStatus: '你当前填写的内容还在，不会因为这次失败丢失。',
  });
}

export function isSameCheckInFormState(left: CheckInFormState, right: CheckInFormState) {
  return (
    left.dietCompletionRate === right.dietCompletionRate &&
    left.trainingCompletionRate === right.trainingCompletionRate &&
    left.waterIntakeMl === right.waterIntakeMl &&
    left.stepCount === right.stepCount &&
    left.weightKg === right.weightKg &&
    left.energyLevel === right.energyLevel &&
    left.satietyLevel === right.satietyLevel &&
    left.fatigueLevel === right.fatigueLevel &&
    left.note === right.note
  );
}

export function buildCheckInFormState(record?: CheckInRecord | null): CheckInFormState {
  if (!record) {
    return defaultFormState;
  }

  return {
    dietCompletionRate: String(record.dietCompletionRate),
    trainingCompletionRate: String(record.trainingCompletionRate),
    waterIntakeMl: record.waterIntakeMl ? String(record.waterIntakeMl) : '',
    stepCount: record.stepCount ? String(record.stepCount) : '',
    weightKg: typeof record.weightKg === 'number' ? String(record.weightKg) : '',
    energyLevel: typeof record.energyLevel === 'number' ? String(record.energyLevel) : '',
    satietyLevel: typeof record.satietyLevel === 'number' ? String(record.satietyLevel) : '',
    fatigueLevel: typeof record.fatigueLevel === 'number' ? String(record.fatigueLevel) : '',
    note: record.note ?? '',
  };
}

export function validateForm(date: string, form: CheckInFormState, mode: CheckInMode) {
  const today = getTodayDateString();
  if (date > today) {
    return '打卡日期不能晚于今天。';
  }

  const requiredFields: Array<[string, string]> = [
    ['饮食完成度', form.dietCompletionRate],
    ['训练完成度', form.trainingCompletionRate],
  ];

  if (mode === 'detailed') {
    requiredFields.push(
      ['精力', form.energyLevel],
      ['饱腹感', form.satietyLevel],
      ['疲劳感', form.fatigueLevel],
    );
  }

  for (const [label, value] of requiredFields) {
    if (value.trim() === '') {
      return `${label}还没有填写。`;
    }
  }

  const pairs: Array<[string, number, number, number]> = [
    ['饮食完成度', Number(form.dietCompletionRate), 0, 100],
    ['训练完成度', Number(form.trainingCompletionRate), 0, 100],
  ];

  if (mode === 'detailed') {
    pairs.push(
      ['精力', Number(form.energyLevel), 1, 5],
      ['饱腹感', Number(form.satietyLevel), 1, 5],
      ['疲劳感', Number(form.fatigueLevel), 1, 5],
    );
  }

  for (const [label, value, min, max] of pairs) {
    if (Number.isNaN(value) || value < min || value > max) {
      return `${label}必须在 ${min} 到 ${max} 之间。`;
    }
  }

  return null;
}

export function useCheckInEditor({
  router,
  date,
}: {
  router: RouterLike;
  date: string;
}) {
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [existingRecord, setExistingRecord] = useState<CheckInRecord | null>(null);
  const [form, setForm] = useState<CheckInFormState>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  async function load(targetDate: string) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const todayPayload = await fetchToday(session.accessToken, targetDate);
      setToday(todayPayload);

      try {
        const record = await fetchCheckIn(session.accessToken, targetDate);
        setExistingRecord(record);
        setForm(buildCheckInFormState(record));
      } catch (fetchError) {
        if (fetchError instanceof ApiError && fetchError.status === 404) {
          setExistingRecord(null);
          setForm(buildCheckInFormState(null));
        } else {
          throw fetchError;
        }
      }
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return;
      }
      if (loadError instanceof ApiError && loadError.code === 'CONFLICT') {
        setStoredSessionOnboardingStatus(false);
        router.replace('/onboarding');
        return;
      }
      setError(describeUserFacingError(loadError, {
        whatHappened: '今天的打卡数据还没有加载成功。',
        nextStep: '稍后重试，或先回到今日页再进入打卡。',
        dataStatus: '你之前已经保存的打卡记录不会丢失。',
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(date);
  }, [date]);

  const baselineForm = useMemo(() => buildCheckInFormState(existingRecord), [existingRecord]);
  const hasUnsavedChanges = useMemo(() => !isSameCheckInFormState(form, baselineForm), [baselineForm, form]);

  function updateField(name: keyof CheckInFormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>, mode: CheckInMode) {
    event.preventDefault();

    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!today) {
      setError('今日计划尚未加载完成，暂时无法提交打卡。');
      return;
    }

    const validationError = validateForm(date, form, mode);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSuccess('');

    const payload: CheckInPayload = {
      dailyPlanId: today.dailyPlanId,
      checkinDate: date,
      dietCompletionRate: Number(form.dietCompletionRate),
      trainingCompletionRate: Number(form.trainingCompletionRate),
      energyLevel: form.energyLevel ? Number(form.energyLevel) : existingRecord?.energyLevel ?? undefined,
      satietyLevel: form.satietyLevel ? Number(form.satietyLevel) : existingRecord?.satietyLevel ?? undefined,
      fatigueLevel: form.fatigueLevel ? Number(form.fatigueLevel) : existingRecord?.fatigueLevel ?? undefined,
      waterIntakeMl: form.waterIntakeMl ? Number(form.waterIntakeMl) : undefined,
      stepCount: form.stepCount ? Number(form.stepCount) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      note: form.note.trim() || undefined,
    };

    startTransition(async () => {
      try {
        const result = await submitCheckIn(session.accessToken, payload);
        setExistingRecord(result.record);
        setForm(buildCheckInFormState(result.record));
        setSuccess(
          mode === 'quick'
            ? '快打卡已提交。未填写的体感会先留空，你可以稍后切到详细模式继续补充。'
            : '今日打卡已提交，数据会同步进入今日页与周复盘。',
        );
      } catch (submitError) {
        if (submitError instanceof ApiError && submitError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }
        setError(describeUserFacingError(submitError, {
          whatHappened: '这次打卡还没有提交成功。',
          nextStep: '检查完成度和日期后再试一次。',
          dataStatus: '当前表单内容还在，不会因为这次失败立刻丢失。',
        }));
      }
    });
  }

  return {
    today,
    existingRecord,
    form,
    loading,
    error,
    success,
    isPending,
    hasUnsavedChanges,
    updateField,
    handleSubmit,
  };
}
