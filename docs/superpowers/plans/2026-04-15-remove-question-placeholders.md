# 页面问号占位清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 Web 仪表盘相关页面中的所有裸 `?` / `??` 占位，并统一替换成更完整的视觉徽章与操作图形。

**Architecture:** 在共享的 `dashboard-shell` 组件中新增一组可复用的 SVG 几何图形与徽章包装，避免各页面继续手写占位字符。先用 smoke 测试锁定“源码里不能再出现裸问号占位”的约束，再逐页替换 `today`、`status`、`review`、`check-in` 中的占位内容。

**Tech Stack:** Next.js 15、React 19、TypeScript、Tailwind CSS、Node smoke test

---

### Task 1: 建立回归测试

**Files:**
- Modify: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写失败测试**

```js
const placeholderFiles = [
  'apps/web/app/today/page.tsx',
  'apps/web/app/status/page.tsx',
  'apps/web/app/review/page.tsx',
  'apps/web/app/check-in/page.tsx',
];

for (const filePath of placeholderFiles) {
  const source = readFileSync(resolve(rootDirectory, filePath), 'utf8');
  expectNotIncludes(source, '>\\?+<', `${filePath} should not render raw question mark placeholders`);
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: FAIL，提示至少一个页面仍然存在 `>?</` 或 `>??</` 占位。

### Task 2: 新增共享视觉徽章

**Files:**
- Modify: `apps/web/components/web/dashboard-shell.tsx`

- [ ] **Step 1: 在共享组件中新增图形枚举与 SVG 图标**

```tsx
type AccentGlyphKind =
  | 'spark'
  | 'strategy'
  | 'training'
  | 'calendar'
  | 'chevron-left'
  | 'chevron-right'
  | 'launch'
  | 'meal'
  | 'water'
  | 'steps'
  | 'highlight'
  | 'balance'
  | 'insight'
  | 'location';
```

- [ ] **Step 2: 新增共享包装组件**

```tsx
export function AccentGlyph(...) { ... }
export function AccentBadge(...) { ... }
```

- [ ] **Step 3: 保持现有页面 API 不受影响**

```tsx
export {
  DashboardCard,
  DashboardShell,
  MetricPill,
  ProgressBar,
  CircleGauge,
  PanelTag,
  SectionEyebrow,
};
```

### Task 3: 逐页替换问号占位

**Files:**
- Modify: `apps/web/app/today/page.tsx`
- Modify: `apps/web/app/status/page.tsx`
- Modify: `apps/web/app/review/page.tsx`
- Modify: `apps/web/app/check-in/page.tsx`

- [ ] **Step 1: 更新 import，接入共享徽章**

```tsx
import {
  AccentBadge,
  AccentGlyph,
  CircleGauge,
  DashboardCard,
  DashboardShell,
  ...
} from '@/components/web/dashboard-shell';
```

- [ ] **Step 2: 替换标题与卡片头部的大圆占位**

```tsx
<AccentBadge kind="spark" className="h-12 w-12 bg-[#73c4f0] text-white" iconClassName="h-5 w-5" />
```

- [ ] **Step 3: 替换小标题前缀、尾部跳转和翻页按钮**

```tsx
<AccentGlyph kind="training" className="h-4 w-4 text-[#0f7ea5]" />
<AccentBadge kind="chevron-left" className="h-10 w-10 bg-[#f0f5f9] text-[#6f8799]" iconClassName="h-4 w-4" />
<AccentGlyph kind="launch" className="h-4 w-4 text-[#0f7ea5]" />
```

### Task 4: 验证无残留

**Files:**
- Verify: `apps/web/tests/smoke.test.mjs`
- Verify: `apps/web/app/today/page.tsx`
- Verify: `apps/web/app/status/page.tsx`
- Verify: `apps/web/app/review/page.tsx`
- Verify: `apps/web/app/check-in/page.tsx`

- [ ] **Step 1: 运行 smoke 测试**

Run: `node apps/web/tests/smoke.test.mjs`

Expected: PASS，输出 `web smoke test passed`

- [ ] **Step 2: 再扫一次残留占位**

Run: `Get-ChildItem apps/web -Recurse -File | Where-Object { $_.FullName -notmatch '\\.next\\|node_modules|dist|coverage' } | Select-String -Pattern '>\\?+<'`

Expected: 无输出
