import type {
  IntensityLevel,
  TrainingTemplateDayPayload,
  TrainingTemplateImportPreview,
  TrainingTemplatePayload,
  TrainingTemplateWeekday,
} from './api';

type ImportedTrainingTemplateItem = TrainingTemplateDayPayload['items'][number] & {
  repText?: string;
  sourceType?: 'standard' | 'free_text';
  rawInput?: string | null;
};

type ImportedTrainingTemplateDay = Omit<TrainingTemplateDayPayload, 'items'> & {
  items: ImportedTrainingTemplateItem[];
};

export type ImportedTrainingTemplateDraft = Omit<TrainingTemplatePayload, 'days'> & {
  id?: string;
  days: ImportedTrainingTemplateDay[];
};

const TRAINING_TEMPLATE_WEEKDAY_ORDER: TrainingTemplateWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_TRAINING_SPLIT_TYPE = 'push_pull_legs';
const DEFAULT_TRAINING_DURATION_MINUTES = 45;
const DEFAULT_TRAINING_INTENSITY_LEVEL: IntensityLevel = 'medium';
const DEFAULT_TRAINING_REST_SECONDS = 90;

function buildExerciseCodeFromName(exerciseName: string) {
  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `free-text/${normalized || 'custom'}`;
}

function buildRestDay(weekday: TrainingTemplateDayPayload['weekday'], title = '休息'): ImportedTrainingTemplateDay {
  return {
    weekday,
    dayType: 'rest',
    title,
    splitType: null,
    durationMinutes: null,
    intensityLevel: null,
    notes: '',
    items: [],
  };
}

export function buildImportedDraftName(baseName: string) {
  const normalizedBaseName = baseName.trim() || '训练模板';
  return `${normalizedBaseName}（导入草稿）`;
}

export function buildDraftFromImportPreview(
  preview: TrainingTemplateImportPreview,
  options: { baseName?: string } = {},
): ImportedTrainingTemplateDraft {
  const parsedDays = new Map(preview.parsedDays.map((day) => [day.weekday, day]));

  return {
    name: buildImportedDraftName(options.baseName ?? '训练模板'),
    status: 'active',
    isEnabled: false,
    isDefault: false,
    notes: '',
    days: TRAINING_TEMPLATE_WEEKDAY_ORDER.map((weekday) => {
      const parsedDay = parsedDays.get(weekday);

      if (!parsedDay) {
        return buildRestDay(weekday);
      }

      if (parsedDay.dayType === 'rest') {
        return buildRestDay(weekday, parsedDay.title.trim() || '休息');
      }

      return {
        weekday,
        dayType: 'training',
        title: parsedDay.title.trim() || '训练日',
        splitType: DEFAULT_TRAINING_SPLIT_TYPE,
        durationMinutes: DEFAULT_TRAINING_DURATION_MINUTES,
        intensityLevel: DEFAULT_TRAINING_INTENSITY_LEVEL,
        notes: parsedDay.warnings.join('；'),
        items: parsedDay.items.map((item) => {
          const repValue = item.reps?.trim() || item.repText?.trim() || '自定义';
          const repText = item.repText?.trim() || item.reps?.trim() || '自定义';
          const exerciseName = item.exerciseName.trim() || item.rawLine.trim() || '未命名动作';

          return {
            exerciseCode: item.matchedExerciseCode ?? buildExerciseCodeFromName(exerciseName),
            exerciseName,
            sets: item.sets ?? 1,
            reps: repValue,
            repText,
            sourceType: item.matchedExerciseCode ? 'standard' : 'free_text',
            rawInput: item.rawLine,
            restSeconds: DEFAULT_TRAINING_REST_SECONDS,
            notes: item.notes ?? '',
          };
        }),
      };
    }),
  };
}
