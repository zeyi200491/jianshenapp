import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const tempDirectory = mkdtempSync(join(testDirectory, '.tmp-hook-helpers-'));

try {
  const todaySource = readFileSync(new URL('../lib/use-today-dashboard.ts', import.meta.url), 'utf8')
    .replace("from '@/lib/api';", "from './api-stub.ts';")
    .replace("from '@/lib/auth';", "from './auth-stub.ts';")
    .replace("from '@/lib/user-facing-error';", "from './user-facing-error-stub.ts';");
  const dietSource = readFileSync(new URL('../lib/use-diet-plan-editor.ts', import.meta.url), 'utf8')
    .replace("from '@/lib/api';", "from './api-stub.ts';")
    .replace("from '@/lib/auth';", "from './auth-stub.ts';")
    .replace("from '@/lib/user-facing-error';", "from './user-facing-error-stub.ts';")
    .replace("from '@/lib/use-diet-page-url-state';", "from './diet-url-state-stub.ts';");
  const checkInSource = readFileSync(new URL('../lib/use-check-in-editor.ts', import.meta.url), 'utf8')
    .replace("from '@/lib/api';", "from './api-stub.ts';")
    .replace("from '@/lib/auth';", "from './auth-stub.ts';")
    .replace("from '@/lib/date';", "from './date-stub.ts';")
    .replace("from '@/lib/user-facing-error';", "from './user-facing-error-stub.ts';")
    .replace("from '@/lib/use-check-in-url-state';", "from './check-in-url-state-stub.ts';");

  writeFileSync(join(tempDirectory, 'use-today-dashboard-under-test.ts'), todaySource);
  writeFileSync(join(tempDirectory, 'use-diet-plan-editor-under-test.ts'), dietSource);
  writeFileSync(join(tempDirectory, 'use-check-in-editor-under-test.ts'), checkInSource);
  writeFileSync(
    join(tempDirectory, 'api-stub.ts'),
    [
      'export class ApiError extends Error {',
      '  constructor(code, message, status, details = null) {',
      '    super(message);',
      '    this.code = code;',
      '    this.status = status;',
      '    this.details = details;',
      '  }',
      '}',
      'export async function applyTrainingOverride() { throw new Error("stub"); }',
      'export async function createConversation() { throw new Error("stub"); }',
      'export async function fetchCurrentUser() { throw new Error("stub"); }',
      'export async function fetchToday() { throw new Error("stub"); }',
      'export async function previewTrainingTemplate() { throw new Error("stub"); }',
      'export async function regeneratePlan() { throw new Error("stub"); }',
      'export async function removeTrainingOverride() { throw new Error("stub"); }',
      'export async function resetTrainingCycle() { throw new Error("stub"); }',
      'export async function sendConversationMessage() { throw new Error("stub"); }',
      'export async function updateProfile() { throw new Error("stub"); }',
      'export async function removeMealIntake() { throw new Error("stub"); }',
      'export async function searchMealFoods() { throw new Error("stub"); }',
      'export async function upsertMealIntake() { throw new Error("stub"); }',
      'export async function fetchCheckIn() { throw new Error("stub"); }',
      'export async function submitCheckIn() { throw new Error("stub"); }',
    ].join('\n'),
  );
  writeFileSync(
    join(tempDirectory, 'auth-stub.ts'),
    [
      'export function clearStoredSession() {}',
      'export function getStoredSession() { return null; }',
      'export function setStoredSessionOnboardingStatus() {}',
    ].join('\n'),
  );
  writeFileSync(
    join(tempDirectory, 'user-facing-error-stub.ts'),
    [
      'export function describeUserFacingError(_error, fallback) {',
      '  return [`发生了什么：${fallback.whatHappened}`, `现在怎么做：${fallback.nextStep}`, `数据情况：${fallback.dataStatus}`].join("\\n");',
      '}',
    ].join('\n'),
  );
  writeFileSync(join(tempDirectory, 'diet-url-state-stub.ts'), 'export {};\n');
  writeFileSync(join(tempDirectory, 'check-in-url-state-stub.ts'), 'export {};\n');
  writeFileSync(join(tempDirectory, 'date-stub.ts'), 'export function getTodayDateString() { return "2026-04-21"; }\n');

  const todayModule = await import(`file:///${join(tempDirectory, 'use-today-dashboard-under-test.ts').replace(/\\/g, '/')}`);
  const dietModule = await import(`file:///${join(tempDirectory, 'use-diet-plan-editor-under-test.ts').replace(/\\/g, '/')}`);
  const checkInModule = await import(`file:///${join(tempDirectory, 'use-check-in-editor-under-test.ts').replace(/\\/g, '/')}`);

  test('today dashboard helper functions expose readable prompt and payload builders', () => {
    const message = todayModule.normalizeTodayDashboardMessage(new Error('x'));
    assert.match(message, /发生了什么：/);
    assert.match(message, /现在怎么做：/);
    assert.match(message, /数据情况：/);

    assert.deepEqual(todayModule.buildProfileForm(null), {
      heightCm: '175',
      currentWeightKg: '70',
      targetType: 'cut',
      activityLevel: 'moderate',
      trainingExperience: 'beginner',
      trainingDaysPerWeek: '3',
    });

    assert.deepEqual(
      todayModule.buildProfilePayload({
        heightCm: '180',
        currentWeightKg: '78.5',
        targetType: 'maintain',
        activityLevel: 'high',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: '5',
      }),
      {
        heightCm: 180,
        currentWeightKg: 78.5,
        targetType: 'maintain',
        activityLevel: 'high',
        trainingExperience: 'intermediate',
        trainingDaysPerWeek: 5,
      },
    );

    assert.deepEqual(
      todayModule.buildConversationContext({
        dailyPlanId: 'daily-1',
        dietPlan: { id: 'diet-1' },
        activeTrainingPlan: { id: 'override-1' },
        trainingPlan: { id: 'training-1' },
      }),
      {
        dailyPlanId: 'daily-1',
        dietPlanId: 'diet-1',
        trainingPlanId: 'override-1',
      },
    );

    assert.match(
      todayModule.buildAiPrompt(
        {
          trainingPlan: { title: '跑步机爬坡', splitType: 'cardio' },
          trainingCycle: { currentFocus: null },
        },
        { push: '推日', pull: '拉日', legs: '腿日' },
      ),
      /跑步机爬坡/,
    );
  });

  test('diet plan helper functions expose readable fallback messages and meal selection', () => {
    const message = dietModule.normalizeDietPageMessage(new Error('x'));
    assert.match(message, /发生了什么：/);
    assert.match(message, /现在怎么做：/);
    assert.match(message, /数据情况：/);

    const payload = {
      date: '2026-04-21',
      weeklyDietPlan: {
        days: [
          { date: '2026-04-21', meals: {} },
          { date: '2026-04-22', meals: {} },
        ],
      },
      dietPlan: {
        meals: [{ mealType: 'lunch', title: '午餐' }],
      },
    };

    assert.equal(dietModule.pickSelectedDay(payload, '2026-04-22')?.date, '2026-04-22');
    assert.equal(dietModule.pickSelectedDay(payload, '2026-04-30')?.date, '2026-04-21');
    assert.equal(dietModule.pickSelectedTodayMeal(payload, '2026-04-21', 'lunch')?.title, '午餐');
    assert.equal(dietModule.pickSelectedTodayMeal(payload, '2026-04-22', 'lunch'), null);
  });

  test('check-in helper functions expose readable validation and baseline-state behavior', () => {
    const message = checkInModule.normalizeCheckInMessage(new Error('x'));
    assert.match(message, /发生了什么：/);
    assert.match(message, /现在怎么做：/);
    assert.match(message, /数据情况：/);

    assert.deepEqual(checkInModule.buildCheckInFormState(null), {
      dietCompletionRate: '',
      trainingCompletionRate: '',
      waterIntakeMl: '',
      stepCount: '',
      weightKg: '',
      energyLevel: '',
      satietyLevel: '',
      fatigueLevel: '',
      note: '',
    });

    assert.equal(
      checkInModule.validateForm('2999-01-01', checkInModule.buildCheckInFormState(null), 'quick'),
      '打卡日期不能晚于今天。',
    );
    assert.equal(
      checkInModule.validateForm('2026-04-21', checkInModule.buildCheckInFormState(null), 'quick'),
      '饮食完成度还没有填写。',
    );
    assert.equal(
      checkInModule.validateForm(
        '2026-04-21',
        {
          ...checkInModule.buildCheckInFormState(null),
          dietCompletionRate: '80',
          trainingCompletionRate: '90',
          energyLevel: '6',
          satietyLevel: '4',
          fatigueLevel: '3',
        },
        'detailed',
      ),
      '精力必须在 1 到 5 之间。',
    );

    const form = {
      ...checkInModule.buildCheckInFormState(null),
      dietCompletionRate: '80',
    };
    assert.equal(checkInModule.isSameCheckInFormState(form, form), true);
  });
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
