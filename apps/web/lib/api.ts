import { ApiError, ApiEnvelope, type MovementPattern, type RestRuleSource, type IntensityLevel, type TrainingFocus, type WeekdayKey, type TrainingDayType } from '@campusfit/shared';
export { ApiError };
export type { IntensityLevel, MovementPattern, RestRuleSource, TrainingFocus } from '@campusfit/shared';
export type {
  ActiveTrainingSource,
  CheckInPayload,
  CheckInRecord,
  Conversation,
  ConversationContext,
  ConversationMessage,
  ConversationStreamEvent,
  CurrentUserPayload,
  DietPlanMealView,
  GeneratedWeeklyReviewPayload,
  LoginSession,
  MacroNutrition,
  MealFoodSearchResult,
  OnboardingPayload,
  TodayPayload,
  TodayTrainingPlan,
  TrainingTemplateDayPayload,
  TrainingTemplateDetail,
  TrainingTemplateImportPreview,
  TrainingTemplateItemPayload,
  TrainingTemplatePayload,
  TrainingTemplatePreview,
  TrainingTemplateWeekday,
  UpdateProfilePayload,
  WeeklyDietDay,
  WeeklyDietMeal,
  WeeklyReviewActionItem,
  WeeklyReviewPayload,
} from './api-types';
import type {
  ActiveTrainingSource,
  CheckInPayload,
  CheckInRecord,
  Conversation,
  ConversationContext,
  ConversationMessage,
  ConversationStreamEvent,
  CurrentUserPayload,
  DietPlanMealView,
  GeneratedWeeklyReviewPayload,
  LoginSession,
  MacroNutrition,
  MealFoodSearchResult,
  OnboardingPayload,
  TodayPayload,
  TodayTrainingPlan,
  TrainingTemplateDayPayload,
  TrainingTemplateDetail,
  TrainingTemplateImportPreview,
  TrainingTemplateItemPayload,
  TrainingTemplatePayload,
  TrainingTemplatePreview,
  TrainingTemplateWeekday,
  UpdateProfilePayload,
  WeeklyDietDay,
  WeeklyDietMeal,
  WeeklyReviewActionItem,
  WeeklyReviewPayload,
} from './api-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3050/api/v1';

function isStateChangingRequest(method?: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes((method ?? 'GET').toUpperCase());
}

function getCsrfToken(): string | null {
  for (const segment of document.cookie.split(';')) {
    const [name, ...rest] = segment.trim().split('=');
    if (name === 'campusfit_csrf_token') {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

const inflightRequests = new Map<string, Promise<unknown>>();

async function requestJson<T>(path: string, init: RequestInit = {}, token?: string) {
  const method = (init.method ?? 'GET').toUpperCase();

  if (method === 'GET') {
    const dedupKey = `${path}|${token ?? ''}`;
    const pending = inflightRequests.get(dedupKey);
    if (pending) return pending as Promise<T>;

    const promise = executeRequest<T>(path, init, token);
    inflightRequests.set(dedupKey, promise);
    try {
      return await promise;
    } finally {
      inflightRequests.delete(dedupKey);
    }
  }

  return executeRequest<T>(path, init, token);
}

async function executeRequest<T>(path: string, init: RequestInit = {}, token?: string) {
  const stateChanging = isStateChangingRequest(init.method);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    ...(stateChanging ? { cache: 'no-store' as const } : {}),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(stateChanging ? { 'X-CampusFit-CSRF': getCsrfToken() ?? '' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('INTERNAL_ERROR', '接口返回了无法解析的响应', response.status, null);
  }

  if (!response.ok || payload.code !== 'OK') {
    throw new ApiError(payload.code, payload.message, response.status, payload.data);
  }

  return payload.data;
}

export async function requestEmailCode(email: string) {
  return requestJson<{
    channel: string;
    destination: string;
    expiresInSeconds: number;
    deliveryMode: string;
    devCode?: string;
  }>('/auth/email/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailCode(email: string, code: string) {
  return requestJson<LoginSession>('/auth/email/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function submitOnboarding(token: string, payload: OnboardingPayload) {
  return requestJson<{
    profile: Record<string, unknown>;
    generatedPlanDate: string;
  }>(
    '/profiles/onboarding',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchCurrentUser(token: string) {
  return requestJson<CurrentUserPayload>('/users/me', { method: 'GET' }, token);
}

export async function requestDataDeletion(token: string, payload: { reason?: string }) {
  return requestJson<{
    id: string;
    status: string;
    reason: string | null;
    requestedAt: string;
  }>(
    '/users/me/deletion-request',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateProfile(token: string, payload: UpdateProfilePayload) {
  return requestJson<{
    profile: Record<string, unknown>;
    needsPlanRegeneration: boolean;
  }>(
    '/profiles/me',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function resetTrainingCycle(token: string, startFocus: TrainingFocus) {
  return requestJson<{
    profile: Record<string, unknown>;
    startFocus: TrainingFocus;
    needsPlanRegeneration: boolean;
  }>(
    '/profiles/training-cycle/reset',
    {
      method: 'POST',
      body: JSON.stringify({ startFocus }),
    },
    token,
  );
}

export async function fetchToday(token: string, date?: string) {
  const suffix = date ? `?date=${date}` : '';
  return requestJson<TodayPayload>(`/today${suffix}`, { method: 'GET' }, token);
}

export async function fetchTrainingTemplates(token: string) {
  return requestJson<TrainingTemplateDetail[]>('/users/me/training-templates', { method: 'GET' }, token);
}

export async function fetchTrainingTemplateDetail(token: string, templateId: string) {
  return requestJson<TrainingTemplateDetail>(`/users/me/training-templates/${templateId}`, { method: 'GET' }, token);
}

export async function createTrainingTemplate(token: string, payload: TrainingTemplatePayload) {
  return requestJson<TrainingTemplateDetail>(
    '/users/me/training-templates',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updateTrainingTemplate(token: string, templateId: string, payload: Partial<TrainingTemplatePayload>) {
  return requestJson<TrainingTemplateDetail>(
    `/users/me/training-templates/${templateId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function enableTrainingTemplate(token: string, templateId: string) {
  return requestJson<TrainingTemplateDetail>(
    `/users/me/training-templates/${templateId}/enable`,
    {
      method: 'POST',
    },
    token,
  );
}

export async function setDefaultTrainingTemplate(token: string, templateId: string) {
  return requestJson<TrainingTemplateDetail>(
    `/users/me/training-templates/${templateId}/set-default`,
    {
      method: 'POST',
    },
    token,
  );
}

export async function previewTrainingTemplate(
  token: string,
  params: { date: string; templateId?: string; weekday?: TrainingTemplateWeekday },
) {
  const search = new URLSearchParams();
  search.set('date', params.date);
  if (params.templateId) {
    search.set('templateId', params.templateId);
  }
  if (params.weekday) {
    search.set('weekday', params.weekday);
  }

  return requestJson<TrainingTemplatePreview>(`/users/me/training-template-preview?${search.toString()}`, { method: 'GET' }, token);
}

export async function importTrainingTemplatePreview(
  token: string,
  payload: { templateId: string; rawText: string },
) {
  return requestJson<TrainingTemplateImportPreview>(
    '/users/me/training-templates/import-preview',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function applyTrainingTemplateImport(
  token: string,
  templateId: string,
  payload: { previewToken: string; selectedWeekdays: TrainingTemplateWeekday[] },
) {
  return requestJson<TrainingTemplateDetail>(
    `/users/me/training-templates/${templateId}/import-apply`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function applyTrainingOverride(
  token: string,
  dailyPlanId: string,
  payload: { templateId: string; weekday: TrainingTemplateWeekday },
) {
  return requestJson<{
    dailyPlanId: string;
    activeTrainingSource: ActiveTrainingSource;
    systemTrainingPlan: TodayTrainingPlan | null;
    activeTrainingPlan: TodayTrainingPlan | null;
  }>(
    `/daily-plans/${dailyPlanId}/training-override`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function removeTrainingOverride(token: string, dailyPlanId: string) {
  return requestJson<{
    dailyPlanId: string;
    activeTrainingSource: ActiveTrainingSource;
    systemTrainingPlan: TodayTrainingPlan | null;
    activeTrainingPlan: TodayTrainingPlan | null;
  }>(
    `/daily-plans/${dailyPlanId}/training-override`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export async function regeneratePlan(token: string, date: string) {
  return requestJson(
    '/plans/generate',
    {
      method: 'POST',
      body: JSON.stringify({ date, force: true }),
    },
    token,
  );
}

export async function searchMealFoods(
  token: string,
  keyword: string,
  scene?: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner',
) {
  const params = new URLSearchParams();
  params.set('q', keyword);
  if (scene) {
    params.set('scene', scene);
  }
  if (mealType) {
    params.set('mealType', mealType);
  }
  return requestJson<MealFoodSearchResult[]>(`/meal-foods/search?${params.toString()}`, { method: 'GET' }, token);
}

export async function upsertMealIntake(
  token: string,
  dailyPlanId: string,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  payload: { foodCode: string; portionSize: 'small' | 'medium' | 'large' },
) {
  return requestJson<{
    actual: {
      mealType: 'breakfast' | 'lunch' | 'dinner';
      foodCode: string;
      foodName: string;
      portionSize: 'small' | 'medium' | 'large';
      calories: number;
      proteinG: number;
      carbG: number;
      fatG: number;
    };
    meals: DietPlanMealView[];
    effectiveDailyTotals: MacroNutrition;
  }>(
    `/daily-plans/${dailyPlanId}/meals/${mealType}/intake`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function removeMealIntake(
  token: string,
  dailyPlanId: string,
  mealType: 'breakfast' | 'lunch' | 'dinner',
) {
  return requestJson<{
    meals: DietPlanMealView[];
    effectiveDailyTotals: MacroNutrition;
  }>(
    `/daily-plans/${dailyPlanId}/meals/${mealType}/intake`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export async function submitCheckIn(token: string, payload: CheckInPayload) {
  return requestJson<{
    record: CheckInRecord;
    todayStatus: {
      hasCheckedIn: boolean;
      dietCompletionRate: number;
      trainingCompletionRate: number;
    };
  }>(
    '/check-ins',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function fetchCheckIn(token: string, date: string) {
  return requestJson<CheckInRecord>(`/check-ins/${date}`, { method: 'GET' }, token);
}

export async function fetchLatestWeeklyReview(token: string, weekStartDate?: string) {
  const suffix = weekStartDate ? `?weekStartDate=${weekStartDate}` : '';
  return requestJson<WeeklyReviewPayload>(`/weekly-reviews/latest${suffix}`, { method: 'GET' }, token);
}

export async function generateWeeklyReview(token: string, weekStartDate: string) {
  return requestJson<GeneratedWeeklyReviewPayload>(
    '/weekly-reviews/generate',
    {
      method: 'POST',
      body: JSON.stringify({ weekStartDate }),
    },
    token,
  );
}

export async function updateWeeklyReviewActionItem(
  token: string,
  actionItemId: string,
  payload: { status: WeeklyReviewActionItem['status'] },
) {
  return requestJson<WeeklyReviewActionItem>(
    `/weekly-reviews/action-items/${actionItemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function createConversation(token: string, payload: { title?: string; context?: ConversationContext }) {
  return requestJson<Conversation>(
    '/ai/conversations',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function listConversationMessages(token: string, conversationId: string) {
  return requestJson<{
    conversationId: string;
    messages: ConversationMessage[];
  }>(`/ai/conversations/${conversationId}/messages`, { method: 'GET' }, token);
}

export async function sendConversationMessage(
  token: string,
  conversationId: string,
  payload: { content: string; context?: ConversationContext },
) {
  return requestJson<{
    conversationId: string;
    userMessage: ConversationMessage;
    assistantMessage: ConversationMessage;
  }>(
    `/ai/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

function parseSseFrame(frame: string) {
  const lines = frame.split('\n');
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');

  if (!event || !data) {
    return null;
  }

  return { event, data };
}

async function* readSseEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const parsed = parseSseFrame(frame);
        if (parsed) {
          yield parsed;
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const parsed = parseSseFrame(buffer);
      if (parsed) {
        yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamConversationMessage(
  token: string,
  conversationId: string,
  payload: { content: string; context?: ConversationContext },
  signal?: AbortSignal,
): AsyncGenerator<ConversationStreamEvent> {
  const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-CampusFit-CSRF': getCsrfToken() ?? '',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let payloadBody: ApiEnvelope<unknown> | null = null;
    try {
      payloadBody = (await response.json()) as ApiEnvelope<unknown>;
    } catch {
      throw new ApiError('INTERNAL_ERROR', '接口返回了无法解析的响应', response.status, null);
    }
    throw new ApiError(payloadBody.code, payloadBody.message, response.status, payloadBody.data);
  }

  if (!response.body) {
    throw new ApiError('INTERNAL_ERROR', '流式响应为空', response.status, null);
  }

  for await (const frame of readSseEvents(response.body)) {
    const data = JSON.parse(frame.data) as Record<string, unknown>;
    if (frame.event === 'start') {
      yield {
        type: 'start',
        conversationId: String(data.conversationId),
        userMessage: data.userMessage as ConversationMessage,
        assistantMessageId: String(data.assistantMessageId),
      };
      continue;
    }
    if (frame.event === 'chunk') {
      yield {
        type: 'chunk',
        assistantMessageId: String(data.assistantMessageId),
        content: String(data.content ?? ''),
      };
      continue;
    }
    if (frame.event === 'done') {
      yield {
        type: 'done',
        conversationId: String(data.conversationId),
        assistantMessage: data.assistantMessage as ConversationMessage,
      };
      continue;
    }
    if (frame.event === 'error') {
      yield {
        type: 'error',
        code: String(data.code ?? 'AI_TIMEOUT'),
        message: String(data.message ?? 'AI 服务返回异常'),
      };
    }
  }
}
