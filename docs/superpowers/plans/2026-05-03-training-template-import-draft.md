# Training Template Import Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把个人训练模板页的“文字导入”改成“弹窗粘贴文本并生成未保存草稿模板，用户微调后再手动保存”的流程。

**Architecture:** 继续复用现有后端训练文本预览解析接口，只把它的返回结果映射成前端本地草稿，不再调用导入应用接口直接覆盖已保存模板。页面容器负责未保存确认、导入弹窗开关、预览转草稿、保存落库；编辑器只负责展示草稿和发出动作；导入弹窗只负责文本输入、解析、问题提示和“生成草稿模板”回调。

**Tech Stack:** Next.js App Router、React、TypeScript、现有 `apps/web/lib/api.ts` API 客户端、Node smoke tests、Web 构建与类型检查

---

## 文件结构

### 需要新增

- Create: `apps/web/lib/training-template-import-draft.ts`
  - 负责把后端 `TrainingTemplateImportPreview` 转成前端 `TrainingTemplateDraft`
  - 负责草稿模板名、默认训练日时长、动作自动编码等导入后归一化规则
- Create: `apps/web/tests/training-template-import-draft.test.mjs`
  - 负责纯函数级测试，锁定“预览结果 -> 草稿模板”的核心行为

### 需要修改

- Modify: `apps/web/app/account/training-templates/page.tsx`
  - 页面容器，改造为“未保存确认 -> 打开导入弹窗 -> 生成草稿 -> 手动保存”
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
  - 保留编辑器职责，去掉 `importDisabled` 概念，展示“未保存草稿”提示，不再暴露时长与动作编码输入
- Modify: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
  - 从“解析后确认覆盖已保存模板”改成“解析后生成草稿模板”
- Modify: `apps/web/lib/api.ts`
  - 保留预览接口类型，去除页面对“必须有 templateId 才能导入”的前置依赖所需的类型耦合
- Modify: `apps/web/lib/training-template-draft.ts`
  - 保留保存前归一化能力，并和导入草稿生成逻辑共享默认值/动作编码规则
- Modify: `apps/web/tests/smoke.test.mjs`
  - 增加源码级回归断言，锁定新文案和新交互入口

---

### Task 1: 先写纯函数测试并收口导入草稿映射逻辑

**Files:**
- Create: `apps/web/lib/training-template-import-draft.ts`
- Create: `apps/web/tests/training-template-import-draft.test.mjs`
- Modify: `apps/web/lib/training-template-draft.ts`
- Test: `apps/web/tests/training-template-import-draft.test.mjs`

- [ ] **Step 1: 写失败测试，先锁定“预览结果 -> 未保存草稿模板”**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDraftFromImportPreview,
  buildImportedDraftName,
} from '../lib/training-template-import-draft.js';

test('buildDraftFromImportPreview creates a new unsaved draft from parsed training days', () => {
  const preview = {
    previewToken: 'preview-1',
    summary: { detectedDays: 2, successfulLines: 3, warningLines: 1, blockingLines: 0 },
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
            rawLine: '杠铃卧推 8×4',
            exerciseName: '杠铃卧推',
            matchedExerciseCode: 'barbell-bench-press',
            sets: 4,
            reps: '8',
            repText: '8',
            notes: '',
            matchStatus: 'matched',
          },
          {
            rawLine: '二头超级组（站姿+坐姿 10+10×3）',
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
    ],
    errors: [],
  };

  const draft = buildDraftFromImportPreview(preview, { baseName: '我的训练模板' });

  assert.equal(draft.id, undefined);
  assert.equal(draft.name, buildImportedDraftName('我的训练模板'));
  assert.equal(draft.days.length, 7);
  assert.equal(draft.days[0].dayType, 'rest');
  assert.equal(draft.days[1].title, '胸肩三头');
  assert.equal(draft.days[1].durationMinutes, 45);
  assert.equal(draft.days[1].items[0].exerciseCode, 'barbell-bench-press');
  assert.equal(draft.days[1].items[1].exerciseCode, 'free-text/二头超级组');
  assert.equal(draft.days[1].items[1].sourceType, 'free_text');
  assert.equal(draft.days[1].items[1].rawInput, '二头超级组（站姿+坐姿 10+10×3）');
});
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run: `node --test apps/web/tests/training-template-import-draft.test.mjs`

Expected: FAIL，提示 `buildDraftFromImportPreview` 或 `buildImportedDraftName` 未定义。

- [ ] **Step 3: 以最小实现新增导入草稿映射文件**

```ts
import type {
  TrainingTemplateDayPayload,
  TrainingTemplateImportPreview,
  TrainingTemplatePayload,
  TrainingTemplateWeekday,
} from '@/lib/api';
import { buildExerciseCodeFromName } from '@/lib/training-template-draft';

const weekdayOrder: TrainingTemplateWeekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DEFAULT_DURATION_MINUTES = 45;
const DEFAULT_INTENSITY_LEVEL = 'medium';
const DEFAULT_REST_SECONDS = 90;

export type ImportedTrainingTemplateDraft = Omit<TrainingTemplatePayload, 'days'> & {
  id?: string;
  days: Array<
    TrainingTemplateDayPayload & {
      items: Array<
        TrainingTemplateDayPayload['items'][number] & {
          repText?: string;
          sourceType?: string;
          rawInput?: string | null;
        }
      >;
    }
  >;
};

export function buildImportedDraftName(baseName: string) {
  const name = baseName.trim() || '训练模板';
  return `${name}（导入草稿）`;
}

export function buildDraftFromImportPreview(
  preview: TrainingTemplateImportPreview,
  options: { baseName?: string } = {},
): ImportedTrainingTemplateDraft {
  const parsedDayMap = new Map(preview.parsedDays.map((day) => [day.weekday, day]));

  return {
    name: buildImportedDraftName(options.baseName ?? '训练模板'),
    status: 'active',
    isEnabled: false,
    isDefault: false,
    notes: '',
    days: weekdayOrder.map((weekday) => {
      const parsedDay = parsedDayMap.get(weekday);
      if (!parsedDay) {
        return {
          weekday,
          dayType: 'rest',
          title: '休息',
          splitType: null,
          durationMinutes: null,
          intensityLevel: null,
          notes: '',
          items: [],
        };
      }

      if (parsedDay.dayType === 'rest') {
        return {
          weekday,
          dayType: 'rest',
          title: parsedDay.title || '休息',
          splitType: null,
          durationMinutes: null,
          intensityLevel: null,
          notes: '',
          items: [],
        };
      }

      return {
        weekday,
        dayType: 'training',
        title: parsedDay.title || '训练日',
        splitType: 'push_pull_legs',
        durationMinutes: DEFAULT_DURATION_MINUTES,
        intensityLevel: DEFAULT_INTENSITY_LEVEL,
        notes: parsedDay.warnings.join('；'),
        items: parsedDay.items.map((item) => ({
          exerciseCode: item.matchedExerciseCode ?? buildExerciseCodeFromName(item.exerciseName),
          exerciseName: item.exerciseName,
          sets: item.sets ?? 1,
          reps: item.reps ?? item.repText ?? '自定义',
          repText: item.repText ?? item.reps ?? '自定义',
          sourceType: item.matchedExerciseCode ? 'standard' : 'free_text',
          rawInput: item.rawLine,
          restSeconds: DEFAULT_REST_SECONDS,
          notes: item.notes,
        })),
      };
    }),
  };
}
```

- [ ] **Step 4: 把保存前归一化 helper 的默认值与动作编码逻辑整理成可复用结构**

```ts
export const DEFAULT_TRAINING_DURATION_MINUTES = 45;

export function buildExerciseCodeFromName(exerciseName: string) {
  const normalized = exerciseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized ? `free-text/${normalized}` : '';
}
```

- [ ] **Step 5: 运行测试，确认映射函数变绿**

Run: `node --test apps/web/tests/training-template-import-draft.test.mjs`

Expected: PASS

- [ ] **Step 6: 提交这一层**

```bash
git add apps/web/lib/training-template-draft.ts apps/web/lib/training-template-import-draft.ts apps/web/tests/training-template-import-draft.test.mjs
git commit -m "feat: add training template import draft mapper"
```

---

### Task 2: 先用 smoke 锁住新交互文案和可见结构

**Files:**
- Modify: `apps/web/tests/smoke.test.mjs`
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 先加失败断言，锁定新交互名词**

```js
expectIncludes(
  trainingTemplateEditorSource,
  '当前是未保存草稿，确认无误后再保存模板',
  'Training template editor should expose the unsaved draft guidance',
);
expectNotIncludes(
  trainingTemplateEditorSource,
  'importDisabled',
  'Training template editor should not hard-disable text import for unsaved drafts',
);
expectIncludes(
  trainingTemplateImportDrawerSource,
  '生成草稿模板',
  'Training template import modal should expose the new draft-generation action',
);
expectNotIncludes(
  trainingTemplateImportDrawerSource,
  '确认覆盖',
  'Training template import modal should stop framing import as direct overwrite',
);
expectNotIncludes(
  trainingTemplateEditorSource,
  'value=\\{day\\.durationMinutes',
  'Training template editor should not render the day duration input',
);
expectNotIncludes(
  trainingTemplateEditorSource,
  'value=\\{item\\.exerciseCode',
  'Training template editor should not render the manual exercise-code input',
);
```

- [ ] **Step 2: 运行 smoke 测试，确认这些断言先失败**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: FAIL，至少提示缺少 `生成草稿模板`、`当前是未保存草稿` 等新文案。

- [ ] **Step 3: 最小化修改编辑器文案与显式草稿提示**

```tsx
{draft.id ? null : (
  <p className="mt-3 rounded-[18px] bg-[#eef6fb] px-4 py-3 text-sm leading-7 text-[#24516a]">
    当前是未保存草稿，确认无误后再保存模板。
  </p>
)}
```

```tsx
<button
  type="button"
  onClick={onOpenImport}
  disabled={disabled}
  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17324d] disabled:opacity-60"
>
  文字导入
</button>
```

- [ ] **Step 4: 最小化修改导入弹窗主按钮与说明文案**

```tsx
<button
  type="button"
  onClick={onGenerateDraft}
  disabled={parsing || !rawText.trim()}
  className="rounded-full bg-[#0f7ea5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
>
  {parsing ? '生成中...' : '生成草稿模板'}
</button>
```

```tsx
<span className="text-xs leading-6 text-[#5f768d]">
  这一步只会生成一份未保存草稿，不会直接改动已保存模板。
</span>
```

- [ ] **Step 5: 重新运行 smoke 测试，确认文案和可见结构锁定通过**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS，至少本次新增断言全部通过；若有历史无关断言失败，先修本次关联文件中的断言基线后再继续。

- [ ] **Step 6: 提交这一层**

```bash
git add apps/web/tests/smoke.test.mjs apps/web/components/web/training-templates/training-template-editor.tsx apps/web/components/web/training-templates/training-template-import-drawer.tsx
git commit -m "test: lock training template draft import copy"
```

---

### Task 3: 改造导入弹窗，只做“解析并生成草稿”

**Files:**
- Modify: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
- Modify: `apps/web/lib/api.ts`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 先把导入弹窗 props 改成“回传预览结果而不是应用覆盖”**

```ts
type TrainingTemplateImportDrawerProps = {
  open: boolean;
  templateName: string;
  rawText: string;
  preview: TrainingTemplateImportPreview | null;
  parsing: boolean;
  error: string;
  onClose: () => void;
  onRawTextChange: (value: string) => void;
  onGenerateDraft: () => void;
  onUseExample: () => void;
};
```

- [ ] **Step 2: 运行类型检查，确认旧 props 用法先报错**

Run: `npm.cmd run typecheck`

Expected: FAIL，提示页面容器仍在传 `applying`、`selectedWeekdays`、`onApply` 等旧参数。

- [ ] **Step 3: 删掉“勾选周几 + 确认覆盖”区块，保留解析问题展示**

```tsx
{preview ? (
  <div className="rounded-[24px] bg-white px-5 py-5">
    <p className="text-base font-semibold text-[#17324d]">解析结果</p>
    <p className="mt-1 text-sm text-[#5f768d]">
      生成草稿后，你还可以继续修改标题、训练日和动作内容。
    </p>
  </div>
) : null}
```

删除整个“确认覆盖”区域与所有 `selectedWeekdays` 相关 checkbox 交互。

- [ ] **Step 4: 保留预览接口依赖，但把按钮行为统一成“解析并生成草稿”**

```tsx
<button
  type="button"
  onClick={onGenerateDraft}
  disabled={parsing || !rawText.trim()}
  className="rounded-full bg-[#0f7ea5] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
>
  {parsing ? '生成中...' : '生成草稿模板'}
</button>
```

- [ ] **Step 5: 跑类型检查与 smoke，确认弹窗职责已收口**

Run: `npm.cmd run typecheck`

Expected: FAIL or PASS；如果失败，应只剩页面容器尚未接上的调用错误。

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS，本次弹窗新文案和结构断言通过。

- [ ] **Step 6: 提交这一层**

```bash
git add apps/web/components/web/training-templates/training-template-import-drawer.tsx apps/web/lib/api.ts
git commit -m "refactor: turn training template import into draft generation modal"
```

---

### Task 4: 改页面容器，接上“未保存确认 -> 解析预览 -> 替换为新草稿”

**Files:**
- Modify: `apps/web/app/account/training-templates/page.tsx`
- Modify: `apps/web/lib/training-template-import-draft.ts`
- Modify: `apps/web/lib/training-template-draft.ts`
- Test: `apps/web/tests/training-template-import-draft.test.mjs`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 先加失败断言，锁定“导入成功后不直接落库”**

```js
test('buildDraftFromImportPreview keeps the generated import draft unsaved', () => {
  const draft = buildDraftFromImportPreview(preview, { baseName: '我的训练模板' });
  assert.equal(draft.id, undefined);
  assert.equal(draft.isEnabled, false);
  assert.equal(draft.isDefault, false);
});
```

- [ ] **Step 2: 跑定向测试，确认当前行为若不满足则先失败**

Run: `node --test apps/web/tests/training-template-import-draft.test.mjs`

Expected: FAIL（如果上一步新增了新的未满足断言）或 PASS（如果已满足，可直接进入页面容器接线）。

- [ ] **Step 3: 在页面容器中新增未保存确认函数**

```ts
function hasUnsavedDraftChanges(currentDraft: TrainingTemplateDraft | null) {
  return Boolean(currentDraft);
}

function confirmImportReplacement(currentDraft: TrainingTemplateDraft | null) {
  if (!hasUnsavedDraftChanges(currentDraft)) {
    return true;
  }
  return window.confirm('继续后会替换当前未保存内容，是否继续？');
}
```

- [ ] **Step 4: 让 `handleOpenImport` 先确认，再打开弹窗，不再自动保存**

```ts
function handleOpenImport() {
  if (!confirmImportReplacement(draft)) {
    return;
  }

  setMessage('');
  setError('');
  resetImportState();
  setImportOpen(true);
}
```

- [ ] **Step 5: 改造生成逻辑，只请求预览接口并把结果转成新草稿**

```ts
async function handleGenerateImportDraft() {
  const session = getStoredSession();
  if (!session) {
    router.replace('/login');
    return;
  }
  if (!importRawText.trim()) {
    setImportError('请先粘贴训练文字，再生成草稿模板。');
    return;
  }

  setImportParsing(true);
  setImportError('');

  try {
    const preview = await importTrainingTemplatePreview(session.accessToken, {
      templateId: selectedTemplateId ?? 'draft-preview',
      rawText: importRawText,
    });
    setImportPreview(preview);

    const nextDraft = buildDraftFromImportPreview(preview, {
      baseName: draft?.name ?? '训练模板',
    });
    setDraft(nextDraft);
    setSelectedTemplateId(null);
    setImportOpen(false);
    resetImportState();

    if (preview.summary.warningLines > 0) {
      setMessage('草稿模板已生成，部分动作需要你手动补充。');
    } else {
      setMessage('已根据文本生成新的草稿模板，你现在可以继续调整后再保存。');
    }
  } catch (requestError) {
    setImportError(normalizeError(requestError));
  } finally {
    setImportParsing(false);
  }
}
```

- [ ] **Step 6: 让 `handleSaveDraft` 继续保持“有 id 则更新，无 id 则创建”**

```ts
const saved = draft.id
  ? await updateTrainingTemplate(session.accessToken, draft.id, payload)
  : await createTrainingTemplate(session.accessToken, payload);
```

这里不要增加任何“导入即保存”的分支。

- [ ] **Step 7: 跑定向测试、类型检查和 smoke**

Run: `node --test apps/web/tests/training-template-import-draft.test.mjs`

Expected: PASS

Run: `npm.cmd run typecheck`

Expected: PASS

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS，本次改动相关断言通过。

- [ ] **Step 8: 提交这一层**

```bash
git add apps/web/app/account/training-templates/page.tsx apps/web/lib/training-template-import-draft.ts apps/web/lib/training-template-draft.ts apps/web/tests/training-template-import-draft.test.mjs apps/web/tests/smoke.test.mjs
git commit -m "feat: generate unsaved training template drafts from text import"
```

---

### Task 5: 做最终回归，确认模板页编译、保存和提示链路都稳定

**Files:**
- Modify: `apps/web/app/account/training-templates/page.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-editor.tsx`
- Modify: `apps/web/components/web/training-templates/training-template-import-drawer.tsx`
- Modify: `apps/web/tests/smoke.test.mjs`
- Test: `apps/web/tests/training-template-import-draft.test.mjs`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 加最后一轮源码断言，锁定成功提示和保存边界**

```js
expectIncludes(
  trainingTemplatePageSource,
  '已根据文本生成新的草稿模板，你现在可以继续调整后再保存。',
  'Training template page should explain that text import creates a draft first',
);
expectIncludes(
  trainingTemplatePageSource,
  "window.confirm('继续后会替换当前未保存内容，是否继续？')",
  'Training template page should confirm before replacing an unsaved draft',
);
expectNotIncludes(
  trainingTemplatePageSource,
  '已先保存当前模板，现在可以继续文字导入。',
  'Training template page should stop auto-saving before text import',
);
```

- [ ] **Step 2: 跑定向测试**

Run: `node --test apps/web/tests/training-template-import-draft.test.mjs`

Expected: PASS

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS

- [ ] **Step 3: 跑类型检查**

Run: `npm.cmd run typecheck`

Expected: PASS

- [ ] **Step 4: 跑 Web 构建，确认生产编译稳定**

Run: `npm.cmd --prefix apps/web run build`

Expected: PASS，`/account/training-templates` 页面成功进入静态生成输出。

- [ ] **Step 5: 提交收尾**

```bash
git add apps/web/app/account/training-templates/page.tsx apps/web/components/web/training-templates/training-template-editor.tsx apps/web/components/web/training-templates/training-template-import-drawer.tsx apps/web/tests/smoke.test.mjs
git commit -m "test: cover training template import draft flow"
```

## Spec Coverage Check

1. “弹窗粘贴，生成后替换当前编辑区为一份未保存草稿”由 Task 3 和 Task 4 覆盖。
2. “若当前有未保存内容，导入前先确认”由 Task 4 的确认函数与源码断言覆盖。
3. “生成后还能自己继续调节”由 Task 4 的 `setDraft(nextDraft)` 与 Task 2 的编辑器草稿提示覆盖。
4. “不是现在先保存再导入的实现过程”由 Task 4 和 Task 5 中移除自动保存文案与逻辑覆盖。
5. “时间输入”和“动作编号输入”继续移除，由 Task 2 的 smoke 断言和编辑器源码修改覆盖。

## Placeholder Scan

1. 计划中没有 `TODO`、`TBD`、`后续处理` 这类占位词。
2. 每个测试步骤都给了实际断言、实际命令和预期结果。
3. 每个代码步骤都给了明确函数名、字段名和最小实现方向，没有“自行处理边界情况”这类空话。

## Type Consistency Check

1. 新导入映射 helper 统一使用 `buildDraftFromImportPreview`、`buildImportedDraftName`。
2. 页面容器统一使用“生成草稿模板”表达，不再混用“确认覆盖”。
3. 草稿对象仍以 `TrainingTemplateDraft` 为核心，新增 helper 只负责生成，不重造新的页面状态协议。
