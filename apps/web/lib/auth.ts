import type { LoginSession } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3050/api/v1';

let cachedSession: LoginSession | null = null;

function stripTokens(session: LoginSession): LoginSession {
  return {
    ...session,
    accessToken: '',
    refreshToken: '',
  };
}

function buildCookieBackedSession(): LoginSession {
  return {
    accessToken: '',
    refreshToken: '',
    user: {
      id: '',
      nickname: '',
      avatarUrl: null,
      hasCompletedOnboarding: false,
    },
  };
}

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (cachedSession) {
    return cachedSession;
  }

  return window.location.pathname === '/login' ? null : buildCookieBackedSession();
}

export function setStoredSession(session: LoginSession) {
  cachedSession = stripTokens(session);
}

export function clearStoredSession() {
  cachedSession = null;

  if (typeof window === 'undefined') {
    return;
  }

  void fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined);
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
