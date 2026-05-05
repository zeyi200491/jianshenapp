import type { TrainingTemplatePayload } from '@/lib/api';

const DEFAULT_TRAINING_DURATION_MINUTES = 45;

type DraftItem = TrainingTemplatePayload['days'][number]['items'][number] & {
  repText?: string;
  sourceType?: string;
  rawInput?: string | null;
};

type DraftDay = Omit<TrainingTemplatePayload['days'][number], 'items'> & {
  items: DraftItem[];
};

export type NormalizableTrainingTemplateDraft = Omit<TrainingTemplatePayload, 'days'> & {
  days: DraftDay[];
};

export function buildExerciseCodeFromName(exerciseName: string) {
  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized ? `free-text/${normalized}` : '';
}

export function normalizeTrainingTemplateDraftForSave<T extends NormalizableTrainingTemplateDraft>(draft: T): T {
  return {
    ...draft,
    days: draft.days.map((day) => {
      if (day.dayType === 'rest') {
        return {
          ...day,
          durationMinutes: null,
          items: [],
        };
      }

      return {
        ...day,
        durationMinutes: day.durationMinutes ?? DEFAULT_TRAINING_DURATION_MINUTES,
        items: day.items.map((item) => ({
          ...item,
          exerciseCode: item.exerciseCode.trim() || buildExerciseCodeFromName(item.exerciseName),
        })),
      };
    }),
  };
}
