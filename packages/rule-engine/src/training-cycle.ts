type TrainingExperience = 'beginner' | 'intermediate';
type TrainingFocus = 'push' | 'pull' | 'legs';
type TrainingPlanItemResult = {
  exerciseCode: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  movementPattern: import('./training-rules').MovementPattern;
  restRuleSource: import('./training-rules').RestRuleSource;
  restHint: string;
  notes: string;
  displayOrder: number;
};

type TrainingPlanResult = {
  splitType: 'push_pull_legs';
  title: string;
  durationMinutes: number;
  intensityLevel: 'low' | 'medium' | 'high';
  notes: string;
  items: TrainingPlanItemResult[];
};

type ExerciseTemplateTuple = [string, string, number, string, number, string];
import { applyTrainingItemMetadata } from './training-rules';

function buildPlan(title: string, intensityLevel: 'low' | 'medium' | 'high', notes: string, items: ExerciseTemplateTuple[]): TrainingPlanResult {
  return {
    splitType: 'push_pull_legs',
    title,
    durationMinutes: intensityLevel === 'high' ? 70 : 55,
    intensityLevel,
    notes,
    items: items.map((item, index) => ({
      exerciseCode: item[0],
      exerciseName: item[1],
      sets: item[2],
      reps: item[3],
      notes: item[5],
      displayOrder: index + 1,
      ...applyTrainingItemMetadata({
        exerciseCode: item[0],
        exerciseName: item[1],
      }),
    })),
  };
}

function buildBeginnerFocusedPlan(focus: TrainingFocus): TrainingPlanResult {
  if (focus === 'push') {
    return buildPlan(
      'Push 日',
      'medium',
      '从推日开始建立节奏，动作以胸、肩、三头的基础发力为主，每组保留 2-3 次余力。',
      [
        ['incline_push_up', '上斜俯卧撑', 3, '10-12 次', 60, '先稳定肩胛，再发力推起身体。'],
        ['dumbbell_floor_press', '哑铃地板卧推', 3, '10-12 次', 75, '手腕保持中立，推起时不要耸肩。'],
        ['seated_dumbbell_press', '坐姿哑铃肩推', 3, '10 次', 75, '收紧核心，避免腰部过度后仰。'],
        ['lateral_raise', '侧平举', 3, '12-15 次', 45, '重量轻一些，专注肩中束发力。'],
        ['rope_pushdown', '绳索下压', 3, '12-15 次', 45, '上臂固定，肘关节完全伸展。'],
      ],
    );
  }

  if (focus === 'pull') {
    return buildPlan(
      'Pull 日',
      'medium',
      '拉日先建立背部发力和肩胛控制，动作速度放慢，避免完全靠手臂借力。',
      [
        ['lat_pulldown', '高位下拉', 3, '10-12 次', 75, '下拉到锁骨附近，离心阶段放慢。'],
        ['dumbbell_row', '单臂哑铃划船', 3, '10-12 次/侧', 60, '躯干稳定后再向后拉肘。'],
        ['seated_row', '坐姿划船', 3, '10-12 次', 60, '顶峰停顿 1 秒，感受背部收缩。'],
        ['face_pull', '面拉', 3, '12-15 次', 45, '拉向额头，强化后束和肩胛稳定。'],
        ['dumbbell_curl', '哑铃弯举', 3, '12 次', 45, '避免前后摆动借力。'],
      ],
    );
  }

  return buildPlan(
    'Leg 日',
    'medium',
    '腿日优先保证动作深度和稳定性，不急着追重量，先把下肢模式做顺。',
    [
      ['goblet_squat', '高杯深蹲', 4, '10-12 次', 75, '下降时膝盖朝脚尖方向，核心保持稳定。'],
      ['romanian_deadlift', '罗马尼亚硬拉', 3, '10 次', 75, '以髋主导发力，感受腿后侧拉伸。'],
      ['walking_lunge', '行进弓步', 3, '10 步/侧', 60, '步幅稳定，避免躯干左右摇摆。'],
      ['leg_curl', '腿弯举', 3, '12 次', 45, '离心慢放，感受腿后侧发力。'],
      ['standing_calf_raise', '站姿提踵', 4, '15 次', 30, '顶峰停顿 1 秒。'],
    ],
  );
}

function buildIntermediateFocusedPlan(focus: TrainingFocus): TrainingPlanResult {
  if (focus === 'push') {
    return buildPlan(
      'Push 日',
      'high',
      '以胸、肩、三头为主，先做复合推举，再补充孤立动作，控制卧推动作质量。',
      [
        ['bench_press', '杠铃卧推', 4, '6-8 次', 120, '肩胛收紧，下放到胸部中下段。'],
        ['incline_dumbbell_press', '上斜哑铃卧推', 3, '8-10 次', 90, '肘部略低于肩线，避免耸肩。'],
        ['seated_shoulder_press', '坐姿肩推', 3, '8-10 次', 90, '核心收紧，不要用腰部顶重量。'],
        ['cable_fly', '绳索夹胸', 3, '12-15 次', 60, '幅度稳定，感受胸部收缩。'],
        ['triceps_pushdown', '绳索下压', 3, '12-15 次', 60, '固定上臂，专注肘关节伸展。'],
      ],
    );
  }

  if (focus === 'pull') {
    return buildPlan(
      'Pull 日',
      'high',
      '拉日优先背部厚度与宽度，再补肱二头和后束，动作全程保持肩胛控制。',
      [
        ['deadlift', '硬拉', 4, '4-6 次', 150, '背部中立，起杆时腿和髋同时发力。'],
        ['pull_up', '引体向上', 4, '6-10 次', 90, '无法完成时使用辅助弹力带。'],
        ['barbell_row', '杠铃划船', 3, '8-10 次', 90, '躯干角度固定，避免借力起身。'],
        ['face_pull', '面拉', 3, '12-15 次', 60, '拉向额头，强化后束与肩袖。'],
        ['barbell_curl', '杠铃弯举', 3, '10-12 次', 60, '控制离心，不要晃动身体。'],
      ],
    );
  }

  return buildPlan(
    'Leg 日',
    'high',
    '腿日先完成下肢主项，再补单侧稳定和小腿训练，保证动作深度和控制。',
    [
      ['back_squat', '杠铃深蹲', 4, '6-8 次', 150, '脚掌受力均匀，核心保持稳定。'],
      ['romanian_deadlift', '罗马尼亚硬拉', 3, '8-10 次', 90, '保持背部平直，重点发力臀腿后侧。'],
      ['leg_press', '腿举', 3, '10-12 次', 90, '下背部贴紧靠垫，不要反弹。'],
      ['walking_lunge', '行进弓步', 3, '10 步/侧', 75, '每一步都控制重心。'],
      ['calf_raise', '提踵', 4, '12-15 次', 45, '顶峰停顿 1 秒，离心放慢。'],
    ],
  );
}

export function buildFocusedTrainingPlan(trainingExperience: TrainingExperience, focus: TrainingFocus): TrainingPlanResult {
  return trainingExperience === 'beginner'
    ? buildBeginnerFocusedPlan(focus)
    : buildIntermediateFocusedPlan(focus);
}

