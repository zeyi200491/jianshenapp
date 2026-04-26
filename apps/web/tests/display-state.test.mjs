import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const tempDirectory = mkdtempSync(join(tmpdir(), 'campusfit-display-state-'));

try {
  const source = readFileSync(new URL('../lib/display-state.ts', import.meta.url), 'utf8').replace(
    "import type { TodayPayload, WeeklyReviewPayload } from '@/lib/api';",
    "import type { TodayPayload, WeeklyReviewPayload } from './api-stub.ts';",
  );

  writeFileSync(join(tempDirectory, 'display-state-under-test.ts'), source);
  writeFileSync(
    join(tempDirectory, 'api-stub.ts'),
    'export type TodayPayload = any;\nexport type WeeklyReviewPayload = any;\n',
  );

  const module = await import(`file:///${join(tempDirectory, 'display-state-under-test.ts').replace(/\\/g, '/')}`);

  test('display-state exposes readable status labels', () => {
    assert.equal(module.getStateLabel('actual'), '真实数据');
    assert.equal(module.getStateLabel('explained'), '解释态');
    assert.equal(module.getStateLabel('placeholder'), '占位态');
  });

  test('display-state exposes readable landing overview copy', () => {
    assert.deepEqual(module.getOverviewStates(), [
      {
        label: '计划完整度',
        value: '登录后显示',
        detail: '只有在登录并生成今日训练和饮食计划后，这里才会展示真实完成情况。',
        kind: 'placeholder',
      },
      {
        label: '打卡闭环',
        value: '打卡后同步',
        detail: '闭环状态依赖每日打卡和周复盘数据，不再预填演示百分比。',
        kind: 'explained',
      },
    ]);
  });

  test('display-state exposes readable energy and review summaries', () => {
    assert.deepEqual(module.buildEnergyInsight(null), {
      title: '今日计划总量',
      value: '--',
      unit: 'kcal',
      detail: '正在读取今日饮食计划和营养目标。',
      kind: 'placeholder',
    });

    assert.deepEqual(module.buildReviewHeaderState(null, '2026-04-21'), {
      title: '4/21 - 4/21 数据复盘',
      description: '这里只有在本周复盘真实生成后，才会出现趋势总结和下周建议。',
      exportReady: false,
    });
  });
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

