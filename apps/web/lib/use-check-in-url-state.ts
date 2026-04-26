'use client';

import { useEffect, useState } from 'react';

export type CheckInMode = 'quick' | 'detailed';

function parseCheckInMode(value: string | null): CheckInMode {
  return value === 'detailed' ? 'detailed' : 'quick';
}

export function useCheckInUrlState(initialDate: string) {
  const [date, setDate] = useState(initialDate);
  const [mode, setMode] = useState<CheckInMode>('quick');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const nextDate = params.get('date') ?? initialDate;
      const nextMode = parseCheckInMode(params.get('mode'));

      setDate((current) => (current === nextDate ? current : nextDate));
      setMode((current) => (current === nextMode ? current : nextMode));
    }

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, [initialDate]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set('date', date);
    params.set('mode', mode);

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}?${nextQuery}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl === currentUrl) {
      return;
    }

    window.history.replaceState(null, '', nextUrl);
  }, [date, mode]);

  return {
    date,
    setDate,
    mode,
    setMode,
  };
}
