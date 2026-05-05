import type {
  IntensityLevel,
  TrainingTemplateDayPayload,
  TrainingTemplateItemPayload,
  TrainingTemplatePayload,
  TrainingTemplateWeekday,
} from './api';

export const TRAINING_TEMPLATE_WEEKDAY_ORDER: TrainingTemplateWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DEFAULT_TRAINING_SPLIT_TYPE = 'push_pull_legs';
export const DEFAULT_TRAINING_DURATION_MINUTES = 45;
export const DEFAULT_TRAINING_INTENSITY_LEVEL: IntensityLevel = 'medium';
export const DEFAULT_TRAINING_REST_SECONDS = 90;

type DraftLikeItem = TrainingTemplateItemPayload & {
  repText?: string;
  sourceType?: string;
  rawInput?: string | null;
};

type DraftLikeDay = Omit<TrainingTemplateDayPayload, 'items'> & {
  items: DraftLikeItem[];
};

export type NormalizableTrainingTemplateDraft = Omit<TrainingTemplatePayload, 'days'> & {
  id?: string;
  days: DraftLikeDay[];
};

export function buildEmptyTrainingTemplateDraft() {
  return {
    name: '我的周训练模板',
    status: 'active' as const,
    isEnabled: false,
    isDefault: false,
    notes: '',
    days: TRAINING_TEMPLATE_WEEKDAY_ORDER.map((weekday, index) => {
      const isRestDay = index === 2 || index === 6;
      return {
        weekday,
        dayType: isRestDay ? ('rest' as const) : ('training' as const),
        title: isRestDay ? '恢复日' : `训练日 ${index + 1}`,
        splitType: isRestDay ? null : DEFAULT_TRAINING_SPLIT_TYPE,
        durationMinutes: isRestDay ? null : DEFAULT_TRAINING_DURATION_MINUTES,
        intensityLevel: isRestDay ? null : DEFAULT_TRAINING_INTENSITY_LEVEL,
        notes: '',
        items: [],
      };
    }),
  };
}

export function buildExerciseCodeFromName(exerciseName: string) {
  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `free-text/${normalized || 'custom'}`;
}

export function normalizeTrainingTemplateDraftForSave<T extends NormalizableTrainingTemplateDraft>(draft: T): T {
  return {
    ...draft,
    name: draft.name.trim(),
    notes: draft.notes?.trim() ?? '',
    days: draft.days.map((day) => {
      if (day.dayType === 'rest') {
        return {
          ...day,
          title: day.title.trim(),
          splitType: null,
          durationMinutes: null,
          intensityLevel: null,
          notes: day.notes?.trim() ?? '',
          items: [],
        };
      }

      return {
        ...day,
        title: day.title.trim(),
        splitType: day.splitType?.trim() || DEFAULT_TRAINING_SPLIT_TYPE,
        durationMinutes: day.durationMinutes ?? DEFAULT_TRAINING_DURATION_MINUTES,
        intensityLevel: day.intensityLevel ?? DEFAULT_TRAINING_INTENSITY_LEVEL,
        notes: day.notes?.trim() ?? '',
        items: day.items.map((item) => {
          const exerciseName = item.exerciseName.trim();
          return {
            ...item,
            exerciseCode: item.exerciseCode.trim() || buildExerciseCodeFromName(exerciseName),
            exerciseName,
            reps: item.reps.trim(),
            repText: item.repText?.trim() || item.reps.trim(),
            sourceType: item.sourceType === 'free_text' ? 'free_text' : 'standard',
            rawInput: item.rawInput?.trim() || null,
            restSeconds: item.restSeconds || DEFAULT_TRAINING_REST_SECONDS,
            notes: item.notes?.trim() ?? '',
          };
        }),
      };
    }),
  };
}
