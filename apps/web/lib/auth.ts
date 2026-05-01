import type { LoginSession } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3050/api/v1';
const SESSION_STORAGE_KEY = 'campusfit-web-session';

let cachedSession: LoginSession | null = null;

function readSessionFromStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.user || typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      user: parsed.user,
    } as LoginSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeSessionToStorage(session: LoginSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  }));
}

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (cachedSession) {
    return cachedSession;
  }

  cachedSession = readSessionFromStorage();
  return cachedSession;
}

export function setStoredSession(session: LoginSession) {
  cachedSession = session;
  writeSessionToStorage(session);
}

export function clearStoredSession() {
  cachedSession = null;
  writeSessionToStorage(null);

  if (typeof window === 'undefined') {
    return;
  }

  void fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch((err: unknown) => {
    console.error('Logout request failed:', err instanceof Error ? err.message : 'unknown error');
  });
}

export function patchStoredSession(partial: Partial<LoginSession>) {
  const current = cachedSession;
  if (!current) {
    return;
  }

  setStoredSession({
    ...current,
    ...partial,
    user: {
      ...current.user,
      ...(partial.user ?? {}),
    },
  });
}

export function setStoredSessionOnboardingStatus(hasCompletedOnboarding: boolean) {
  const current = cachedSession;
  if (!current) {
    return;
  }

  setStoredSession({
    ...current,
    user: {
      ...current.user,
      hasCompletedOnboarding,
    },
  });
}
