import { ApiError, ApiEnvelope, type MovementPattern, type RestRuleSource, type IntensityLevel, type TrainingFocus, type WeekdayKey, type TrainingDayType } from '@campusfit/shared';
export { ApiError };
export type { MovementPattern, RestRuleSource, IntensityLevel, TrainingFocus };

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

export type ActiveTrainingSource = 'system' | 'user_override';
export type TrainingTemplateStatus = 'active' | 'archived';
export type TrainingTemplateWeekday = WeekdayKey;
export type TrainingTemplateDayType = TrainingDayType;

export type LoginSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    hasCompletedOnboarding: boolean;
  };
};

export type OnboardingPayload = {
  gender: 'male' | 'female' | 'other';
  birthYear: number;
  heightCm: number;
  currentWeightKg: number;
  targetType: 'cut' | 'maintain' | 'bulk';
  activityLevel: 'low' | 'light' | 'moderate' | 'high' | 'athlete';
  trainingExperience: 'beginner' | 'intermediate';
  trainingDaysPerWeek: number;
  dietScene: 'canteen' | 'dorm' | 'home';
  dietPreferences: string[];
  dietRestrictions: string[];
  supplementOptIn: boolean;
};

export type UpdateProfilePayload = Partial<OnboardingPayload>;

export type CurrentUserPayload = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  status: string;
  hasCompletedOnboarding: boolean;
  profile: (OnboardingPayload & {
    onboardingCompletedAt: string | null;
  }) | null;
};

export type TrainingCycleStatus = {
  configured: boolean;
  startFocus: TrainingFocus | null;
  currentFocus: TrainingFocus | null;
  requiresSelection: boolean;
  suggestedReset: boolean;
  inactivityDays: number | null;
  lastCompletedDate: string | null;
  resetAt: string | null;
};

export type WeeklyDietIngredient = {
  name: string;
  unit: string;
  amount: number;
};

export type WeeklyDietMeal = {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  description: string;
  ingredients: WeeklyDietIngredient[];
  nutrition: {
    calories: number;
    proteinG: number;
    carbG: number;
    fatG: number;
  };
  alternatives: string[];
  guidance: string[];
  prepTips: string[];
};

export type WeeklyDietDay = {
  date: string;
  weekday: string;
  dayType: 'training' | 'rest';
  dailyTargets: {
    calories: number;
    proteinG: number;
    carbG: number;
    fatG: number;
  };
  meals: {
    breakfast: WeeklyDietMeal;
    lunch: WeeklyDietMeal;
    dinner: WeeklyDietMeal;
  };
};

export type MacroNutrition = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};

export type MealIntakeActual = {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  foodCode: string;
  foodName: string;
  portionSize: 'small' | 'medium' | 'large';
  title: string;
  nutrition: MacroNutrition;
} | null;

export type DietPlanMealView = {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  description: string;
  target: string;
  alternatives: string[];
  notes: string[];
  planned: {
    id: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    title: string;
    description: string;
    nutrition: MacroNutrition;
    alternatives: string[];
  };
  actual: MealIntakeActual;
  effective: {
    mealType: 'breakfast' | 'lunch' | 'dinner';
    title: string;
    description: string;
    nutrition: MacroNutrition;
    source: 'planned' | 'actual';
  };
};

export type MealFoodSearchResult = {
  code: string;
  name: string;
  aliases: string[];
  sceneTags: Array<'canteen' | 'cookable'>;
  sceneLabels: string[];
  suggestedMealTypes: Array<'breakfast' | 'lunch' | 'dinner'>;
  nutritionPerMedium: MacroNutrition;
  portions: string[];
};

export type TodayTrainingPlan = {
  id: string;
  title: string;
  splitType: string;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  notes: string;
  items: Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    repText?: string;
    sourceType?: 'standard' | 'free_text';
    rawInput?: string | null;
    restSeconds: number;
    movementPattern: MovementPattern;
    restRuleSource: RestRuleSource;
    restHint: string;
    notes: string[];
  }>;
};

export type TodayPayload = {
  date: string;
  dailyPlanId: string;
  summary: {
    calorieTarget: number;
    proteinTargetG: number;
    carbTargetG: number;
    fatTargetG: number;
  };
  effectiveDailyTotals: MacroNutrition;
  dietPlan: {
    id: string;
    scene: string;
    sceneDisplay: string;
    summary: string;
    meals: DietPlanMealView[];
  } | null;
  weeklyDietPlan: {
    weekStartDate: string;
    weekEndDate: string;
    goalType: 'cut' | 'maintain' | 'bulk';
    dietScene: 'canteen' | 'dorm' | 'home';
    displayScene: 'canteen' | 'cookable';
    summary: string;
    days: WeeklyDietDay[];
  };
  trainingPlan: TodayTrainingPlan | null;
  systemTrainingPlan: TodayTrainingPlan | null;
  activeTrainingPlan: TodayTrainingPlan | null;
  activeTrainingSource: ActiveTrainingSource;
  trainingCycle: TrainingCycleStatus;
  checkInStatus: {
    hasCheckedIn: boolean;
    dietCompletionRate: number | null;
    trainingCompletionRate: number | null;
  };
  reviewHint: {
    hasWeeklyReview: boolean;
    latestWeekStartDate: string | null;
  };
};

export type CheckInPayload = {
  dailyPlanId: string;
  checkinDate: string;
  dietCompletionRate: number;
  trainingCompletionRate: number;
  waterIntakeMl?: number;
  stepCount?: number;
  weightKg?: number;
  energyLevel?: number;
  satietyLevel?: number;
  fatigueLevel?: number;
  note?: string;
};

export type CheckInRecord = CheckInPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyReviewPayload = {
  review: {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    planDays: number;
    checkedInDays: number;
    avgDietCompletionRate: number;
    avgTrainingCompletionRate: number;
    weightChangeKg: number;
    highlights: string[];
    risks: string[];
    recommendations: string[];
    narrativeText: string;
  } | null;
  actionItems: WeeklyReviewActionItem[];
  emptyReason: string | null;
};

export type WeeklyReviewActionItem = {
  id: string;
  userId: string;
  weeklyReviewId: string | null;
  weekStartDate: string;
  title: string;
  source: 'system_generated' | 'manual';
  status: 'pending' | 'completed';
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedWeeklyReviewPayload = NonNullable<WeeklyReviewPayload['review']> & {
  actionItems: WeeklyReviewActionItem[];
};

export type ConversationContext = {
  dailyPlanId?: string;
  dietPlanId?: string;
  trainingPlanId?: string;
};

export type TrainingTemplateItemPayload = {
  exerciseCode: string;
  exerciseName: string;
  sets: number;
  reps: string;
  repText?: string;
  sourceType?: 'standard' | 'free_text';
  rawInput?: string | null;
  restSeconds: number;
  notes?: string;
};

export type TrainingTemplateDayPayload = {
  weekday: TrainingTemplateWeekday;
  dayType: TrainingTemplateDayType;
  title: string;
  splitType?: string | null;
  durationMinutes?: number | null;
  intensityLevel?: IntensityLevel | null;
  notes?: string;
  items: TrainingTemplateItemPayload[];
};

export type TrainingTemplatePayload = {
  name: string;
  status?: TrainingTemplateStatus;
  isEnabled?: boolean;
  isDefault?: boolean;
  notes?: string;
  days: TrainingTemplateDayPayload[];
};

export type TrainingTemplateDetail = {
  id: string;
  userId: string;
  name: string;
  status: TrainingTemplateStatus;
  isEnabled: boolean;
  isDefault: boolean;
  notes: string;
  days: Array<
    TrainingTemplateDayPayload & {
      id: string;
      sortOrder?: number;
      dayIndex?: number;
      items: Array<TrainingTemplateItemPayload & { id: string; displayOrder?: number }>;
    }
  >;
};

export type TrainingTemplatePreview = {
  templateId: string;
  templateName: string;
  date: string;
  weekday: TrainingTemplateWeekday;
  day: TrainingTemplateDetail['days'][number];
} | null;

export type TrainingTemplateImportPreview = {
  previewToken: string;
  summary: {
    detectedDays: number;
    successfulLines: number;
    warningLines: number;
    blockingLines: number;
  };
  parsedDays: Array<{
    weekday: TrainingTemplateWeekday;
    title: string;
    dayType: TrainingTemplateDayType;
    selectable: boolean;
    warnings: string[];
    items: Array<{
      rawLine: string;
      exerciseName: string;
      matchedExerciseCode: string | null;
      sets: number | null;
      reps: string | null;
      repText: string | null;
      notes: string;
      matchStatus: 'matched' | 'free_text' | 'warning' | 'invalid';
    }>;
  }>;
  errors: Array<{
    lineNumber: number;
    weekday: TrainingTemplateWeekday | null;
    rawLine: string;
    message: string;
    blocking: boolean;
  }>;
};

export type Conversation = {
  id: string;
  title: string;
  context: ConversationContext;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<Record<string, unknown>>;
  trace: Array<Record<string, unknown>>;
  createdAt: string;
};

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
