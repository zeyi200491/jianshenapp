# Web Trust And UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Web 端剩余的信任感、信息架构和可用性问题，让登录、建档、饮食页和打卡页更像真实产品而不是演示稿。

**Architecture:** 保持现有 Next.js App Router 结构不变，只做四类收口：登录页隐藏开发态、建档页补齐饮食画像、饮食页从 `/status` 迁移到真实业务路由、打卡页补桌面精确输入与无障碍标签。优先复用现有 `DashboardShell`、`api.ts` 类型和 smoke 测试链路，避免引入新框架。

**Tech Stack:** Next.js、React、TypeScript、App Router、现有 smoke 脚本

---

### Task 1: 收口登录页开发态暴露

**Files:**
- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/lib/api.ts`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写登录页状态约束测试**

在 `apps/web/tests/smoke.test.mjs` 新增两个断言：

```js
assert(!html.includes('student@example.com'));
assert(!html.includes('当前开发验证码'));
```

Run: `node apps/web/tests/smoke.test.mjs`
Expected: FAIL，页面仍然暴露默认邮箱或开发验证码提示。

- [ ] **Step 2: 为开发验证码增加显式环境开关**

在 `apps/web/lib/api.ts` 为请求验证码返回值增加可选字段约束，并在登录页用显式常量控制：

```ts
const SHOW_DEV_CODE = process.env.NEXT_PUBLIC_SHOW_DEV_CODE === 'true';
```

登录页只在以下条件同时满足时显示开发验证码：

```ts
if (SHOW_DEV_CODE && result.devCode) {
  setDevCode(result.devCode);
}
```

- [ ] **Step 3: 去掉默认邮箱与自动回填验证码**

把登录页初始状态改成：

```ts
const [email, setEmail] = useState('');
const [code, setCode] = useState('');
```

删除这段自动回填：

```ts
setCode(result.devCode);
```

把“联调支持 / 当前开发验证码”从主文案区移除，改成普通用户可理解提示：

```tsx
<MetricPill label="认证方式" value="邮箱验证码" accent />
<MetricPill label="登录后去向" value="今日页 / 建档页" />
<MetricPill label="验证码有效期" value="6 位短码" />
<MetricPill label="收取方式" value="邮箱查收" />
```

- [ ] **Step 4: 复跑 smoke**

Run: `node apps/web/tests/smoke.test.mjs`
Expected: PASS，页面源码不再包含默认邮箱和开发验证码提示。

- [ ] **Step 5: 提交**

```bash
git add apps/web/app/login/page.tsx apps/web/lib/api.ts apps/web/tests/smoke.test.mjs
git commit -m "fix(web): hide dev login affordances"
```

### Task 2: 建档页补齐饮食偏好与忌口

**Files:**
- Modify: `apps/web/app/onboarding/page.tsx`
- Modify: `apps/web/app/today/page.tsx`
- Modify: `apps/web/app/account/page.tsx`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写建档字段可见性测试**

在 smoke 用例加入页面文案断言：

```js
assert(html.includes('饮食偏好'));
assert(html.includes('饮食限制'));
```

Run: `node apps/web/tests/smoke.test.mjs`
Expected: FAIL，当前建档页没有这两个字段组。

- [ ] **Step 2: 在建档页定义选项枚举和中文标签**

在 `apps/web/app/onboarding/page.tsx` 顶部新增：

```ts
const dietPreferenceOptions = [
  { value: 'high_protein', label: '高蛋白优先' },
  { value: 'low_sugar', label: '少糖' },
  { value: 'low_oil', label: '少油' },
  { value: 'vegetarian_friendly', label: '素食友好' },
  { value: 'budget_friendly', label: '预算友好' },
];

const dietRestrictionOptions = [
  { value: 'lactose_free', label: '乳糖不耐受' },
  { value: 'nut_free', label: '坚果过敏' },
  { value: 'seafood_free', label: '不吃海鲜' },
  { value: 'no_spicy', label: '不吃辣' },
  { value: 'no_beef', label: '不吃牛肉' },
];
```

- [ ] **Step 3: 把两个字段组接入表单**

在建档表单中新增多选按钮组，写回 `form.dietPreferences` 和 `form.dietRestrictions`：

```tsx
<fieldset>
  <legend>饮食偏好</legend>
  {dietPreferenceOptions.map((option) => (
    <button type="button" key={option.value}>...</button>
  ))}
</fieldset>
```

```ts
function toggleListField(key: 'dietPreferences' | 'dietRestrictions', value: string) {
  setForm((current) => ({
    ...current,
    [key]: current[key].includes(value)
      ? current[key].filter((item) => item !== value)
      : [...current[key], value],
  }));
}
```

- [ ] **Step 4: 在今日页与个人中心回显饮食画像摘要**

在 `apps/web/app/today/page.tsx` 和 `apps/web/app/account/page.tsx` 新增摘要区：

```tsx
<MetricPill label="饮食偏好" value={profile.dietPreferences.length ? ... : '未设置'} />
<MetricPill label="饮食限制" value={profile.dietRestrictions.length ? ... : '无'} />
```

- [ ] **Step 5: 复跑 smoke**

Run: `node apps/web/tests/smoke.test.mjs`
Expected: PASS，建档页能看到“饮食偏好 / 饮食限制”。

- [ ] **Step 6: 提交**

```bash
git add apps/web/app/onboarding/page.tsx apps/web/app/today/page.tsx apps/web/app/account/page.tsx apps/web/tests/smoke.test.mjs
git commit -m "feat(web): collect diet preferences and restrictions"
```

### Task 3: 把 `/status` 迁移成真实饮食计划路由

**Files:**
- Create: `apps/web/app/diet/page.tsx`
- Modify: `apps/web/app/status/page.tsx`
- Modify: `apps/web/components/web/dashboard-shell.tsx`
- Modify: `apps/web/components/web/site-header.tsx`
- Modify: `apps/web/app/account/page.tsx`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写饮食路由冒烟测试**

在 smoke 用例加入 `/diet` 页面检查：

```js
const diet = await fetch('/diet');
assert.equal(diet.status, 200);
```

Run: `node apps/web/tests/smoke.test.mjs`
Expected: FAIL，当前还没有 `/diet`。

- [ ] **Step 2: 新建真实业务路由**

创建 `apps/web/app/diet/page.tsx`，先直接复用当前饮食计划页面：

```ts
export { default } from '../status/page';
```

- [ ] **Step 3: 把所有导航入口从 `/status` 改到 `/diet`**

更新以下位置：

```ts
{ href: '/diet', label: '饮食计划', icon: 'diet' }
```

并把：

```ts
const dashboardRoutes = new Set(['/today', '/diet', '/check-in', '/review', '/account']);
```

`account` 页里的入口链接也同步换成 `/diet`。

- [ ] **Step 4: 给旧路由做跳转壳**

把 `apps/web/app/status/page.tsx` 改成重定向页：

```ts
import { redirect } from 'next/navigation';

export default function StatusRedirectPage() {
  redirect('/diet');
}
```

- [ ] **Step 5: 复跑 smoke**

Run: `node apps/web/tests/smoke.test.mjs`
Expected: PASS，`/diet` 可访问，旧 `/status` 会跳转。

- [ ] **Step 6: 提交**

```bash
git add apps/web/app/diet/page.tsx apps/web/app/status/page.tsx apps/web/components/web/dashboard-shell.tsx apps/web/components/web/site-header.tsx apps/web/app/account/page.tsx apps/web/tests/smoke.test.mjs
git commit -m "refactor(web): rename status route to diet"
```

### Task 4: 打卡页补桌面精确输入和顶部可访问性

**Files:**
- Modify: `apps/web/app/check-in/page.tsx`
- Modify: `apps/web/components/web/dashboard-shell.tsx`
- Test: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写无障碍文案和输入控件测试**

在 smoke 中加入：

```js
assert(html.includes('aria-label="个人中心"'));
assert(html.includes('aria-label="通知中心"'));
assert(html.includes('饮食完成度（%）'));
assert(html.includes('训练完成度（%）'));
```

Run: `node apps/web/tests/smoke.test.mjs`
Expected: FAIL，当前图标无标签，百分比字段只有滑杆。

- [ ] **Step 2: 给顶部图标补标签和禁用说明**

在 `apps/web/components/web/dashboard-shell.tsx` 修改：

```tsx
<Link href="/account" aria-label="个人中心" title="个人中心">...</Link>
<button type="button" aria-label="通知中心" title="通知中心即将上线" disabled aria-disabled="true">...</button>
```

- [ ] **Step 3: 给打卡页百分比字段补数字输入与快捷按钮**

把两个 `range` 区块改成“滑杆 + 数字输入 + 快捷值”：

```tsx
<label>
  饮食完成度（%）
  <input type="number" min="0" max="100" step="1" ... />
</label>
<div>
  {[25, 50, 75, 100].map((value) => (
    <button type="button" key={value}>{value}%</button>
  ))}
</div>
<input type="range" min="0" max="100" ... />
```

训练完成度区块做同样改造。

- [ ] **Step 4: 保持表单状态单一数据源**

复用当前 `updateField`，不要新增并行状态：

```ts
onChange={(event) => updateField('dietCompletionRate', event.target.value)}
```

确保数字输入、快捷按钮、滑杆都写回同一个字符串字段。

- [ ] **Step 5: 复跑 smoke**

Run: `node apps/web/tests/smoke.test.mjs`
Expected: PASS，顶部图标有语义标签，打卡页有精确输入文案。

- [ ] **Step 6: 提交**

```bash
git add apps/web/app/check-in/page.tsx apps/web/components/web/dashboard-shell.tsx apps/web/tests/smoke.test.mjs
git commit -m "fix(web): improve check-in precision and accessibility"
```

