import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEmptyTrainingTemplateDraft,
  TRAINING_TEMPLATE_WEEKDAY_ORDER,
} from '../lib/training-template-draft.ts';

test('buildEmptyTrainingTemplateDraft creates a blank editable draft without seeded empty actions', () => {
  const draft = buildEmptyTrainingTemplateDraft();

  assert.equal(draft.name, '我的周训练模板');
  assert.equal(draft.days.length, TRAINING_TEMPLATE_WEEKDAY_ORDER.length);

  for (const day of draft.days) {
    assert.deepEqual(day.items, []);
  }

  const monday = draft.days[0];
  assert.equal(monday.dayType, 'training');
  assert.equal(monday.title, '训练日 1');
  assert.equal(monday.splitType, 'push_pull_legs');
  assert.equal(monday.durationMinutes, 45);
  assert.equal(monday.intensityLevel, 'medium');

  const wednesday = draft.days[2];
  assert.equal(wednesday.dayType, 'rest');
  assert.equal(wednesday.title, '恢复日');
  assert.equal(wednesday.splitType, null);
  assert.equal(wednesday.durationMinutes, null);
  assert.equal(wednesday.intensityLevel, null);
});
