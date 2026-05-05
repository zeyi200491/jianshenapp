import assert from 'node:assert/strict';
import test from 'node:test';

import { clearStoredSession, getStoredSession, setStoredSession } from '../lib/auth.ts';
import { importTrainingTemplatePreview } from '../lib/api.ts';

function createSessionStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test('importTrainingTemplatePreview refreshes the session and retries once after a 401 response', async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const sessionStorage = createSessionStorage();
  const fetchCalls = [];

  globalThis.window = {
    sessionStorage,
  };

  setStoredSession({
    accessToken: 'expired-access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-1',
      nickname: '小健用户',
      avatarUrl: null,
      hasCompletedOnboarding: true,
    },
  });

  globalThis.fetch = async (url, init = {}) => {
    fetchCalls.push({
      url: String(url),
      authorization: init.headers?.Authorization ?? init.headers?.authorization ?? null,
      method: init.method ?? 'GET',
    });

    if (fetchCalls.length === 1) {
      return {
        ok: false,
        status: 401,
        async json() {
          return {
            code: 'UNAUTHORIZED',
            message: '旧 access token 已失效',
            data: null,
          };
        },
      };
    }

    if (fetchCalls.length === 2) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            code: 'OK',
            message: '会话已刷新',
            data: {
              accessToken: 'fresh-access-token',
              refreshToken: 'fresh-refresh-token',
              user: {
                id: 'user-1',
                nickname: '小健用户',
                avatarUrl: null,
                hasCompletedOnboarding: true,
              },
            },
          };
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          code: 'OK',
          message: '解析成功',
          data: {
            previewToken: 'preview-1',
            summary: {
              detectedDays: 1,
              successfulLines: 1,
              warningLines: 0,
              blockingLines: 0,
            },
            parsedDays: [],
            errors: [],
          },
        };
      },
    };
  };

  try {
    const preview = await importTrainingTemplatePreview('expired-access-token', {
      rawText: '周三 背二头\n引体向上 8×4',
    });

    assert.equal(preview.previewToken, 'preview-1');
    assert.equal(fetchCalls.length, 3);
    assert.match(fetchCalls[0].url, /training-templates\/import-preview$/);
    assert.equal(fetchCalls[0].authorization, 'Bearer expired-access-token');
    assert.match(fetchCalls[1].url, /auth\/refresh$/);
    assert.equal(fetchCalls[1].authorization, null);
    assert.equal(fetchCalls[2].authorization, 'Bearer fresh-access-token');
    assert.equal(getStoredSession()?.accessToken, 'fresh-access-token');
  } finally {
    clearStoredSession();
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});
