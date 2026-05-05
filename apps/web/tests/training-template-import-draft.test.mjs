import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDraftFromImportPreview,
  buildImportedDraftName,
} from '../lib/training-template-import-draft.ts';

test('buildImportedDraftName trims the base name and appends the import-draft suffix', () => {
  assert.equal(buildImportedDraftName(' 我的训练模板 '), '我的训练模板（导入草稿）');
  assert.equal(buildImportedDraftName('   '), '训练模板（导入草稿）');
});

test('buildDraftFromImportPreview creates a new unsaved draft from parsed training days', () => {
  const preview = {
    previewToken: 'preview-1',
    summary: {
      detectedDays: 2,
      successfulLines: 3,
      warningLines: 1,
      blockingLines: 0,
    },
    parsedDays: [
      {
        weekday: 'monday',
        title: '休息',
        dayType: 'rest',
        selectable: true,
        warnings: [],
        items: [],
      },
      {
        weekday: 'tuesday',
        title: '胸肩三头',
        dayType: 'training',
        selectable: true,
        warnings: ['二头超级组按自由文本保留'],
        items: [
          {
            rawLine: '杠铃卧推 8x4',
            exerciseName: '杠铃卧推',
            matchedExerciseCode: 'barbell-bench-press',
            sets: 4,
            reps: '8',
            repText: '8',
            notes: '',
            matchStatus: 'matched',
          },
          {
            rawLine: '二头超级组（站姿+坐姿 10+10x3）',
            exerciseName: '二头超级组',
            matchedExerciseCode: null,
            sets: 3,
            reps: null,
            repText: '10+10',
            notes: '站姿+坐姿',
            matchStatus: 'warning',
          },
        ],
      },
      {
        weekday: 'sunday',
        title: '',
        dayType: 'training',
        selectable: true,
        warnings: [],
        items: [
          {
            rawLine: '平板支撑',
            exerciseName: '平板支撑',
            matchedExerciseCode: null,
            sets: null,
            reps: null,
            repText: null,
            notes: '',
            matchStatus: 'free_text',
          },
        ],
      },
    ],
    errors: [],
  };

  const draft = buildDraftFromImportPreview(preview, { baseName: '我的训练模板' });

  assert.equal(draft.id, undefined);
  assert.equal(draft.isEnabled, false);
  assert.equal(draft.isDefault, false);
  assert.equal(draft.name, buildImportedDraftName('我的训练模板'));
  assert.equal(draft.days.length, 7);

  assert.deepEqual(
    draft.days.map((day) => day.weekday),
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  );

  assert.equal(draft.days[0].dayType, 'rest');
  assert.equal(draft.days[0].title, '休息');
  assert.deepEqual(draft.days[0].items, []);

  assert.equal(draft.days[1].dayType, 'training');
  assert.equal(draft.days[1].title, '胸肩三头');
  assert.equal(draft.days[1].durationMinutes, 45);
  assert.equal(draft.days[1].intensityLevel, 'medium');
  assert.equal(draft.days[1].items[0].exerciseCode, 'barbell-bench-press');
  assert.equal(draft.days[1].items[0].repText, '8');
  assert.equal(draft.days[1].items[0].sourceType, 'standard');
  assert.equal(draft.days[1].items[0].rawInput, '杠铃卧推 8x4');
  assert.equal(draft.days[1].items[1].exerciseCode, 'free-text/二头超级组');
  assert.equal(draft.days[1].items[1].repText, '10+10');
  assert.equal(draft.days[1].items[1].sourceType, 'free_text');
  assert.equal(draft.days[1].items[1].rawInput, '二头超级组（站姿+坐姿 10+10x3）');

  assert.equal(draft.days[2].dayType, 'rest');
  assert.equal(draft.days[2].title, '休息');
  assert.equal(draft.days[2].durationMinutes, null);
  assert.equal(draft.days[2].intensityLevel, null);
  assert.deepEqual(draft.days[2].items, []);

  assert.equal(draft.days[6].dayType, 'training');
  assert.equal(draft.days[6].title, '训练日');
  assert.equal(draft.days[6].durationMinutes, 45);
  assert.equal(draft.days[6].intensityLevel, 'medium');
  assert.equal(draft.days[6].items[0].exerciseCode, 'free-text/平板支撑');
  assert.equal(draft.days[6].items[0].sets, 1);
  assert.equal(draft.days[6].items[0].reps, '自定义');
  assert.equal(draft.days[6].items[0].repText, '自定义');
});
