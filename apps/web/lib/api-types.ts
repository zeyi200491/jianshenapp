import type {
  IntensityLevel,
  MovementPattern,
  RestRuleSource,
  TrainingFocus,
  TrainingDayType,
  WeekdayKey,
} from '@campusfit/shared';

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

export type ConversationStreamEvent =
  | {
      type: 'start';
      conversationId: string;
      userMessage: ConversationMessage;
      assistantMessageId: string;
    }
  | {
      type: 'chunk';
      assistantMessageId: string;
      content: string;
    }
  | {
      type: 'done';
      conversationId: string;
      assistantMessage: ConversationMessage;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };
