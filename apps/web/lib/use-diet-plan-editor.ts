'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  fetchToday,
  removeMealIntake,
  searchMealFoods,
  upsertMealIntake,
  type MealFoodSearchResult,
  type TodayPayload,
  type WeeklyDietMeal,
} from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { describeUserFacingError } from '@/lib/user-facing-error';
import type { MealType } from '@/lib/use-diet-page-url-state';

type RouterLike = {
  replace: (href: string) => void;
};

export function normalizeDietPageMessage(error: unknown) {
  return describeUserFacingError(error, {
    whatHappened: '饮食计划暂时没有加载成功。',
    nextStep: '稍后重试，或先回到今日页再进入饮食计划。',
    dataStatus: '已经保存的餐次记录不会因为这次失败丢失。',
  });
}

export function pickSelectedDay(payload: TodayPayload | null, selectedDate: string) {
  if (!payload) {
    return null;
  }

  return payload.weeklyDietPlan.days.find((item) => item.date === selectedDate) ?? payload.weeklyDietPlan.days[0] ?? null;
}

export function pickSelectedTodayMeal(payload: TodayPayload | null, selectedDate: string, mealType: MealType) {
  if (!payload || payload.date !== selectedDate) {
    return null;
  }

  return payload.dietPlan?.meals.find((item) => item.mealType === mealType) ?? null;
}

export function useDietPlanEditor({
  router,
  selectedDate,
  selectedMealType,
  setSelectedDate,
}: {
  router: RouterLike;
  selectedDate: string;
  selectedMealType: MealType;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [payload, setPayload] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MealFoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const todayPayload = await fetchToday(session.accessToken);
      setPayload(todayPayload);
      setSelectedDate((current) =>
        todayPayload.weeklyDietPlan.days.some((item) => item.date === current) ? current : todayPayload.date,
      );
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
        whatHappened: '饮食计划暂时没有加载成功。',
        nextStep: '稍后重试，或先回到今日页再进入饮食计划。',
        dataStatus: '已经保存的餐次记录不会因此丢失。',
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedDay = useMemo(() => pickSelectedDay(payload, selectedDate), [payload, selectedDate]);
  const selectedTodayMeal = useMemo(
    () => pickSelectedTodayMeal(payload, selectedDate, selectedMealType),
    [payload, selectedDate, selectedMealType],
  );
  const selectedWeekMeal = useMemo<WeeklyDietMeal | null>(() => {
    if (!selectedDay) {
      return null;
    }

    return selectedDay.meals[selectedMealType];
  }, [selectedDay, selectedMealType]);
  const canSyncToday = Boolean(payload && selectedDay && selectedDay.date === payload.date);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!payload) {
      return;
    }

    const keyword = searchQuery.trim();
    if (keyword.length < 2) {
      setSearchResults([]);
      setSearchError('搜索关键词至少输入 2 个字。');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const results = await searchMealFoods(
        session.accessToken,
        keyword,
        payload.weeklyDietPlan.displayScene,
        selectedMealType,
      );
      setSearchResults(results);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return;
      }
      setSearchResults([]);
      setSearchError(describeUserFacingError(requestError, {
        whatHappened: '这次食物搜索没有返回结果。',
        nextStep: '换一个更具体的关键词再试，比如“鸡胸肉”或“牛奶”。',
        dataStatus: '当前已选的餐次内容不会丢失。',
      }));
    } finally {
      setSearching(false);
    }
  }

  async function handleApplyFood(food: MealFoodSearchResult) {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!payload || !canSyncToday) {
      setActionMessage('只有今天的餐次才允许同步实际摄入。');
      return;
    }

    setSaving(true);
    setActionMessage('');
    setSearchError('');

    try {
      const result = await upsertMealIntake(session.accessToken, payload.dailyPlanId, selectedMealType, {
        foodCode: food.code,
        portionSize: 'medium',
      });

      setPayload((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          effectiveDailyTotals: result.effectiveDailyTotals,
          dietPlan: current.dietPlan
            ? {
                ...current.dietPlan,
                meals: result.meals,
              }
            : current.dietPlan,
        };
      });
      setActionMessage(`已把 ${food.name} 记为今天这餐的实际摄入。`);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return;
      }
      if (requestError instanceof ApiError && requestError.code === 'CONFLICT') {
        setStoredSessionOnboardingStatus(false);
        router.replace('/onboarding');
        return;
      }
      setActionMessage(describeUserFacingError(requestError, {
        whatHappened: '这次替换餐次没有保存成功。',
        nextStep: '稍后重试，或先回到今日页确认计划是否正常。',
        dataStatus: '原来的计划仍然保留，没有被覆盖。',
      }));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveActual() {
    const session = getStoredSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!payload || !canSyncToday || !selectedTodayMeal?.actual) {
      return;
    }

    setSaving(true);
    setActionMessage('');

    try {
      const result = await removeMealIntake(session.accessToken, payload.dailyPlanId, selectedMealType);

      setPayload((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          effectiveDailyTotals: result.effectiveDailyTotals,
          dietPlan: current.dietPlan
            ? {
                ...current.dietPlan,
                meals: result.meals,
              }
            : current.dietPlan,
        };
      });
      setActionMessage('已清除这餐的实际摄入，页面已回退到计划版本。');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearStoredSession();
        router.replace('/login');
        return;
      }
      if (requestError instanceof ApiError && requestError.code === 'CONFLICT') {
        setStoredSessionOnboardingStatus(false);
        router.replace('/onboarding');
        return;
      }
      setActionMessage(describeUserFacingError(requestError, {
        whatHappened: '这次撤销实际摄入没有成功。',
        nextStep: '稍后再试一次，或刷新页面后继续操作。',
        dataStatus: '当前餐次记录不会因为这次失败被清空。',
      }));
    } finally {
      setSaving(false);
    }
  }

  return {
    payload,
    loading,
    error,
    actionMessage,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    searchError,
    saving,
    selectedDay,
    selectedWeekMeal,
    selectedTodayMeal,
    canSyncToday,
    handleSearch,
    handleApplyFood,
    handleRemoveActual,
  };
}
