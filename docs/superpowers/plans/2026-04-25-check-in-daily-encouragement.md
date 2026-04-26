# 每日打卡鼓励语轮换与饮食页说明清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/check-in` 用按日期固定轮换的鼓励语替换固定名言，并移除 `/diet` 页头部的冗余说明文案。

**Architecture:** 先在 `apps/web/lib/check-in-view.ts` 新增纯函数 `buildDailyEncouragement(date)` 和本地文案池，用 `apps/web/tests/view-helpers.test.mjs` 锁定“同日稳定、跨日轮换、异常兜底”这三个行为。再用 `apps/web/tests/smoke.test.mjs` 锁定页面接线和旧文案移除，最后只改 `apps/web/app/check-in/page.tsx` 与 `apps/web/app/status/page.tsx` 两个页面入口，保持 UI 结构最小变更。

**Tech Stack:** Next.js 15、React 19、TypeScript、Node 内置测试、现有 smoke test

---

## 文件结构与职责

- `apps/web/lib/check-in-view.ts`
  - 新增鼓励语文案池
  - 新增 `buildDailyEncouragement(date: string)` 纯函数
  - 负责轮换规则与兜底逻辑

- `apps/web/tests/view-helpers.test.mjs`
  - 为鼓励语轮换逻辑补回归测试
  - 锁定相同日期稳定返回、相邻日期轮换、异常输入兜底

- `apps/web/app/check-in/page.tsx`
  - 接入 `buildDailyEncouragement(date)`
  - 删除固定名言，改为展示每日鼓励语

- `apps/web/app/status/page.tsx`
  - 删除饮食计划页头部的说明性段落

- `apps/web/tests/smoke.test.mjs`
  - 锁定页面不再保留旧固定名言
  - 锁定饮食计划页不再保留已退役说明文案
  - 锁定每日打卡页通过共享 helper 取鼓励语

> 注：当前工作区未挂载 `.git` 元数据，因此本计划不包含实际提交步骤；若后续接回 git 工作区，再按任务边界补提交。

### Task 1: 为鼓励语轮换补失败测试

**Files:**
- Modify: `apps/web/tests/view-helpers.test.mjs`
- Test: `apps/web/tests/view-helpers.test.mjs`

- [ ] **Step 1: 在 helper 测试中引入新函数**

```js
import {
  buildCoachTip,
  buildCompletionSummary,
  buildDailyEncouragement,
  buildReadinessState,
  formatHeadlineDate,
  toOptionalNumber,
} from '../lib/check-in-view.ts';
```

- [ ] **Step 2: 添加失败测试，先锁定轮换规则**

```js
test('check-in view helper rotates encouragements by explicit date string', () => {
  assert.equal(
    buildDailyEncouragement('2026-04-25'),
    '练得不必完美，先把今天完成。',
  );
  assert.equal(
    buildDailyEncouragement('2026-04-25'),
    buildDailyEncouragement('2026-04-25'),
  );
  assert.notEqual(
    buildDailyEncouragement('2026-04-25'),
    buildDailyEncouragement('2026-04-26'),
  );
});

test('check-in view helper falls back to the first encouragement on malformed dates', () => {
  assert.equal(
    buildDailyEncouragement('bad-input'),
    '你今天的每一次选择，都在帮明天的自己省力。',
  );
});
```

- [ ] **Step 3: 运行测试，确认它先失败**

Run: `node --test apps/web/tests/view-helpers.test.mjs`

Expected: FAIL，报错类似 `buildDailyEncouragement is not exported`，或提示该函数未定义。

### Task 2: 在视图辅助层实现日期轮换函数

**Files:**
- Modify: `apps/web/lib/check-in-view.ts`
- Test: `apps/web/tests/view-helpers.test.mjs`

- [ ] **Step 1: 在 helper 文件中新增鼓励语文案池**

```ts
const DAILY_ENCOURAGEMENTS = [
  '你今天的每一次选择，都在帮明天的自己省力。',
  '练得不必完美，先把今天完成。',
  '吃对一餐、动完一次，身体就会记住你的认真。',
  '别和别人比，今天比昨天稳一点就够了。',
  '你现在的坚持，正在悄悄改变状态。',
  '先完成，再优化，这就是进步的样子。',
  '今天多走一步，多稳一分。',
  '把计划做完，信心自然会回来。',
];
```

- [ ] **Step 2: 实现按日期固定轮换的纯函数**

```ts
export function buildDailyEncouragement(date: string) {
  const normalized = date.replaceAll('-', '');

  if (!/^\d{8}$/.test(normalized)) {
    return DAILY_ENCOURAGEMENTS[0];
  }

  const index = Number(normalized) % DAILY_ENCOURAGEMENTS.length;
  return DAILY_ENCOURAGEMENTS[index];
}
```

- [ ] **Step 3: 运行 helper 测试，确认变绿**

Run: `node --test apps/web/tests/view-helpers.test.mjs`

Expected: PASS，且输出中包含新增的两个 `ok` 测试结果。

### Task 3: 为页面接线和旧文案移除补 smoke 回归

**Files:**
- Modify: `apps/web/tests/smoke.test.mjs`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 给每日打卡页补共享 helper 接线断言**

```js
expectIncludes(
  checkInSource,
  'buildDailyEncouragement',
  'Check-in page should derive the headline encouragement through the shared helper',
);
expectNotIncludes(
  checkInSource,
  '力量不在于你能做什么，而在于你克服了曾经以为做不到的事情',
  'Check-in page should not keep the retired fixed quote',
);
```

- [ ] **Step 2: 给饮食计划页补旧说明文案移除断言**

```js
expectNotIncludes(
  statusSource,
  '这一页只展示 today 接口已经返回的真实周菜单',
  'Diet page should remove the retired data-explanation paragraph',
);
```

- [ ] **Step 3: 运行 smoke 测试，确认它先失败**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: FAIL，至少有一条断言指出每日打卡页仍保留旧固定名言，或饮食页仍保留旧说明文案。

### Task 4: 接入每日鼓励语并删除饮食页说明文案

**Files:**
- Modify: `apps/web/app/check-in/page.tsx`
- Modify: `apps/web/app/status/page.tsx`
- Test: `apps/web/tests/smoke.test.mjs`
- Test: `apps/web/tests/view-helpers.test.mjs`

- [ ] **Step 1: 在每日打卡页引入新 helper，并基于页面 date 计算文案**

```tsx
import {
  buildCoachTip,
  buildCompletionSummary,
  buildDailyEncouragement,
  buildReadinessState,
  formatHeadlineDate,
  toOptionalNumber,
} from '@/lib/check-in-view';

const dailyEncouragement = useMemo(() => buildDailyEncouragement(date), [date]);
```

- [ ] **Step 2: 替换头部固定名言**

```tsx
<p className="mt-5 max-w-3xl text-2xl leading-10 text-[#5f768d]">{dailyEncouragement}</p>
```

- [ ] **Step 3: 删除饮食计划页头部说明段落，仅保留标题和指标卡**

```tsx
<div>
  <SectionEyebrow>Meal Planner</SectionEyebrow>
  <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">智能饮食计划</h1>
</div>
```

- [ ] **Step 4: 运行 smoke 测试，确认页面级回归通过**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS，并输出 `web smoke test passed`

- [ ] **Step 5: 再跑一次 helper 测试，确认轮换逻辑未被接线改坏**

Run: `node --test apps/web/tests/view-helpers.test.mjs`

Expected: PASS

- [ ] **Step 6: 跑 Web 类型检查，确认页面改动没有引入类型问题**

Run: `npm.cmd --prefix apps/web run typecheck`

Expected: PASS，无 TypeScript 报错输出。

### Task 5: 手工验收页面行为

**Files:**
- Verify only

- [ ] **Step 1: 启动 Web 应用**

Run: `npm.cmd --prefix apps/web run dev`

Expected: Next.js 在 `http://localhost:3200` 启动成功。

- [ ] **Step 2: 手工验证每日打卡页日期切换**

Check:
- 打开 `http://localhost:3200/check-in`
- 记录当天显示的鼓励语
- 切换到前一天或后一天
- 确认鼓励语发生变化
- 再切回原日期，确认原文案恢复

- [ ] **Step 3: 手工验证饮食计划页头部**

Check:
- 打开 `http://localhost:3200/diet`
- 确认标题下方不再出现“这一页只展示 today 接口已经返回的真实周菜单...”说明文案
- 确认头部间距没有明显塌陷或拥挤

## 自检结果

- Spec 覆盖：已覆盖饮食页说明删除、每日打卡按日期轮换、使用页面 `date` 而非系统当前时间、helper 测试与 smoke 回归。
- Placeholder 扫描：计划内未使用 TBD、TODO、类似“自行处理”字样。
- 类型一致性：统一使用 `buildDailyEncouragement(date: string)` 作为 helper 名称，页面和测试都围绕这一签名展开。
