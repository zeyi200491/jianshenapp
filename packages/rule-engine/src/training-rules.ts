export type MovementPattern = 'compound' | 'isolation' | 'recovery';
export type RestRuleSource = 'system' | 'manual';

type TrainingItemRuleInput = {
  exerciseCode?: string;
  exerciseName: string;
  movementPattern?: string | null;
  restRuleSource?: string | null;
  restSeconds?: number | null;
};

const COMPOUND_CODES = new Set([
  'bench_press',
  'barbell_bench_press',
  'db_bench_press',
  'dumbbell_floor_press',
  'incline_dumbbell_press',
  'incline_db_press',
  'incline_press',
  'seated_shoulder_press',
  'shoulder_press',
  'seated_dumbbell_press',
  'back_squat',
  'goblet_squat',
  'split_squat',
  'bulgarian_split_squat',
  'walking_lunge',
  'leg_press',
  'romanian_deadlift',
  'deadlift',
  'hip_thrust',
  'pull_up',
  'lat_pulldown',
  'barbell_row',
  'dumbbell_row',
  'one_arm_row',
  'seated_row',
  'dip',
  'dips',
]);

const ISOLATION_CODES = new Set([
  'cable_fly',
  'rope_pushdown',
  'triceps_pushdown',
  'biceps_curl',
  'barbell_curl',
  'dumbbell_curl',
  'lateral_raise',
  'face_pull',
  'leg_curl',
  'leg_extension',
  'calf_raise',
  'standing_calf_raise',
  'plank',
  'dead_bug',
  'hanging_knee_raise',
]);

const RECOVERY_CODES = new Set([
  'walk',
  'mobility',
  'stretch',
  'cardio_recovery',
  'cardio_warmup',
  'treadmill_incline_walk',
  'treadmill_incline_interval',
  'cardio_cooldown',
]);

const COMPOUND_KEYWORDS = [
  '卧推',
  '深蹲',
  '硬拉',
  '引体',
  '高位下拉',
  '划船',
  '肩推',
  '推举',
  '腿举',
  '弓步',
  '臂屈伸',
  '臀桥',
];

const ISOLATION_KEYWORDS = [
  '飞鸟',
  '弯举',
  '下压',
  '侧平举',
  '面拉',
  '腿弯举',
  '腿屈伸',
  '提踵',
  '平板支撑',
  '死虫',
  '举腿',
];

const RECOVERY_KEYWORDS = ['快走', '轻松骑行', '拉伸', '活动度', '恢复'];

function isMovementPattern(value: unknown): value is MovementPattern {
  return value === 'compound' || value === 'isolation' || value === 'recovery';
}

function isRestRuleSource(value: unknown): value is RestRuleSource {
  return value === 'system' || value === 'manual';
}

function normalizeText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function containsKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function detectMovementPattern(exerciseCode: string | undefined, exerciseName: string): MovementPattern {
  const code = normalizeText(exerciseCode);
  const name = normalizeText(exerciseName);

  if (RECOVERY_CODES.has(code) || containsKeyword(name, RECOVERY_KEYWORDS)) {
    return 'recovery';
  }

  if (COMPOUND_CODES.has(code) || containsKeyword(name, COMPOUND_KEYWORDS)) {
    return 'compound';
  }

  if (ISOLATION_CODES.has(code) || containsKeyword(name, ISOLATION_KEYWORDS)) {
    return 'isolation';
  }

  return 'isolation';
}

export function getDefaultRestSeconds(movementPattern: MovementPattern) {
  if (movementPattern === 'compound') {
    return 210;
  }

  if (movementPattern === 'recovery') {
    return 0;
  }

  return 150;
}

function buildRestHint(movementPattern: MovementPattern, restRuleSource: RestRuleSource) {
  if (movementPattern === 'recovery') {
    return '恢复动作无需组间休息，保持轻松节奏即可。';
  }

  if (movementPattern === 'compound') {
    return restRuleSource === 'manual'
      ? '复合动作，休息时间已按模板手动调整。'
      : '主项动作，建议更长恢复。';
  }

  return restRuleSource === 'manual'
    ? '孤立动作，休息时间已按模板手动调整。'
    : '辅助动作，恢复时间较短。';
}

export function resolveTrainingItemMetadata(input: TrainingItemRuleInput) {
  const movementPattern = isMovementPattern(input.movementPattern)
    ? input.movementPattern
    : detectMovementPattern(input.exerciseCode, input.exerciseName);
  const defaultRestSeconds = getDefaultRestSeconds(movementPattern);
  const restRuleSource = isRestRuleSource(input.restRuleSource)
    ? input.restRuleSource
    : input.restSeconds === undefined || input.restSeconds === null || input.restSeconds === defaultRestSeconds
      ? 'system'
      : 'manual';
  const restSeconds = restRuleSource === 'manual' && typeof input.restSeconds === 'number'
    ? input.restSeconds
    : defaultRestSeconds;

  return {
    movementPattern,
    restRuleSource,
    restSeconds,
    restHint: buildRestHint(movementPattern, restRuleSource),
  };
}

export function applyTrainingItemMetadata<T extends { exerciseCode?: string; exerciseName: string; restSeconds?: number | null; movementPattern?: string | null; restRuleSource?: string | null }>(
  item: T,
) {
  return resolveTrainingItemMetadata(item);
}
