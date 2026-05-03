import type { IntensityLevel, TrainingTemplateWeekday } from './api';

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

export function buildExerciseCodeFromName(exerciseName: string) {
  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `free-text/${normalized || 'custom'}`;
}
