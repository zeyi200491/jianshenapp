import { type ApiSuccessCode, type ApiErrorCode, type ApiResponse, type MovementPattern, type RestRuleSource, type IntensityLevel, type WeekdayKey, type TrainingDayType, type TemplateStatus, type DietScene, type MealType, type TargetType, type SplitType, type TrainingExperience } from '@campusfit/shared';

export type { ApiSuccessCode, ApiErrorCode, ApiResponse, MovementPattern, RestRuleSource, IntensityLevel, WeekdayKey, TrainingDayType, TemplateStatus, DietScene, MealType, SplitType };

export type GoalType = TargetType;
export type ExperienceLevel = TrainingExperience;

export type ProductStatus = "draft" | "active" | "inactive";
export type FeedbackStatus = "open" | "reviewed" | "closed";
export type FeedbackChannel = "checkin" | "ai" | "product" | "weekly_review";
export type Sentiment = "positive" | "neutral" | "negative";
export type FoodLibraryItemStatus = "active" | "inactive";
export type FoodLibraryItemSceneTag = "canteen" | "cookable";
export type FoodLibraryMealType = "breakfast" | "lunch" | "dinner";

export type DietMeal = {
  mealType: MealType;
  title: string;
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  suggestionText: string;
  alternatives: string[];
};

export type DietTemplate = {
  id: string;
  name: string;
  scene: DietScene;
  goalType: GoalType;
  status: TemplateStatus;
  version: string;
  summary: string;
  tags: string[];
  supplementNotes: string;
  meals: DietMeal[];
  createdAt: string;
  updatedAt: string;
};

export type TrainingItem = {
  exerciseCode: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  movementPattern?: MovementPattern;
  restRuleSource?: RestRuleSource;
  restHint?: string;
  notes: string;
};

export type TrainingTemplate = {
  id: string;
  name: string;
  splitType: SplitType;
  goalType: GoalType;
  experienceLevel: ExperienceLevel;
  trainingDaysPerWeek: number;
  status: TemplateStatus;
  version: string;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  focusTags: string[];
  notes: string;
  items: TrainingItem[];
  createdAt: string;
  updatedAt: string;
};

export type WeeklyTrainingDay = {
  weekday: WeekdayKey;
  dayType: TrainingDayType;
  title: string;
  notes: string;
  items: TrainingItem[];
};

export type WeeklyTrainingTemplate = {
  id: string;
  name: string;
  goalType: GoalType;
  experienceLevel: ExperienceLevel;
  trainingDaysPerWeek: number;
  status: TemplateStatus;
  version: string;
  intensityLevel: IntensityLevel;
  focusTags: string[];
  notes: string;
  weekDays: WeeklyTrainingDay[];
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  name: string;
  subtitle: string;
  description: string;
  targetTags: string[];
  sceneTags: string[];
  priceCents: number;
  coverImageUrl: string;
  detailImages: string[];
  status: ProductStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type FoodLibraryItem = {
  id: string;
  code: string;
  name: string;
  aliases: string[];
  sceneTags: FoodLibraryItemSceneTag[];
  suggestedMealTypes: FoodLibraryMealType[];
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  status: FoodLibraryItemStatus;
  sortOrder: number;
};

export type UserFeedback = {
  id: string;
  userId: string;
  userNickname: string;
  channel: FeedbackChannel;
  sentiment: Sentiment;
  rating: number;
  sourcePage: string;
  content: string;
  status: FeedbackStatus;
  createdAt: string;
};

export type DashboardMetrics = {
  totalUsers: number;
  onboardingCompletionRate: number;
  planViewRate: number;
  checkInRate: number;
  weeklyReviewReachRate: number;
  aiUsageRate: number;
  productClickRate: number;
  activeDietTemplates: number;
  activeTrainingTemplates: number;
  activeProducts: number;
  topDietTemplates: Array<{ id: string; name: string; usageCount: number }>;
  topTrainingTemplates: Array<{ id: string; name: string; usageCount: number }>;
  latestFeedback: UserFeedback[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
};
