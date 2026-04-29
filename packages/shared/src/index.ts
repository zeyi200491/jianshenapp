// Canonical domain types re-exported from rule-engine
export type {
  TargetType,
  ActivityLevel,
  TrainingExperience,
  DietScene,
  DisplayDietScene,
  Gender,
  MealType,
  SplitType,
  IntensityLevel,
  TrainingFocus,
  MovementPattern,
  RestRuleSource,
  RuleProfileInput,
  NutritionTargets,
  DietPlanItemResult,
  DietPlanResult,
  TrainingPlanItemResult,
  TrainingPlanResult,
  WeeklyReviewInput,
  WeeklyReviewResult,
} from '@campusfit/rule-engine';

// ── Shared error class ──
export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, message: string, status: number, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ── Shared API envelope (web-style) ──
export type ApiEnvelope<T> = {
  code: string;
  message: string;
  data: T;
};

// ── Shared API envelope (admin-style) ──
export type ApiSuccessCode = 'OK';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export type ApiResponse<T> = {
  code: ApiSuccessCode | ApiErrorCode;
  message: string;
  data: T | null;
  requestId?: string;
};

// ── Shared domain primitives (not in rule-engine) ──
export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type TrainingDayType = 'training' | 'rest';

export type TemplateStatus = 'draft' | 'active' | 'inactive';

export type MacroNutrition = {
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
};
