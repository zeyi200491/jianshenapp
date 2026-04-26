'use client';

import { useEffect, useState } from 'react';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

function parseMealType(value: string | null): MealType {
  if (value === 'lunch' || value === 'dinner') {
    return value;
  }

  return 'breakfast';
}

export function useDietPageUrlState() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const nextDate = params.get('date') ?? '';
      const nextMealType = parseMealType(params.get('meal'));

      setSelectedDate((current) => (current === nextDate ? current : nextDate));
      setSelectedMealType((current) => (current === nextMealType ? current : nextMealType));
    }

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (selectedDate) {
      params.set('date', selectedDate);
    } else {
      params.delete('date');
    }
    params.set('meal', selectedMealType);

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl === currentUrl) {
      return;
    }

    window.history.replaceState(null, '', nextUrl);
  }, [selectedDate, selectedMealType]);

  return {
    selectedDate,
    setSelectedDate,
    selectedMealType,
    setSelectedMealType,
  };
}
