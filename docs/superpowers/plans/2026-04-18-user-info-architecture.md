# 用户信息架构重做 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重做网页端用户信息相关入口，让 `/status` 稳定承载“饮食计划”语义、首页隐藏开发态服务信息，并新增真实的“个人中心”入口承接设置、帮助与退出登录。

**Architecture:** 本次改动只重整现有前端信息架构，不新增后端接口。实现上通过新增 `apps/web/app/account/page.tsx` 承接个人信息，再同步收口首页、公开页导航与工作台导航中的伪入口，并用 smoke + build 做最终验收。

**Tech Stack:** Next.js App Router、React、TypeScript、现有 `fetchCurrentUser` / `fetchToday` API 封装、Node 脚本级 smoke 测试

---

## 文件结构与职责

- Create: `apps/web/app/account/page.tsx`
  - 新的个人中心页面，承接账号信息、我的设置、帮助支持、账户动作
- Modify: `apps/web/app/page.tsx`
  - 首页去除开发态服务信息，补齐“个人中心”用户入口
- Modify: `apps/web/app/status/page.tsx`
  - 清理残余“状态页”表达，统一为饮食计划语义
- Modify: `apps/web/components/web/dashboard-shell.tsx`
  - 工作台侧边栏和顶部入口统一收口到 `/account`
- Modify: `apps/web/components/web/site-header.tsx`
  - 公开页头部导航增加“个人中心”
- Modify: `apps/web/tests/smoke.test.mjs`
  - 更新 smoke 断言，覆盖首页隐藏开发态信息和个人中心入口

> 当前工作区不是 Git 仓库，执行阶段不安排 commit 步骤；如果后续迁入 Git 仓库，再补充提交策略。

### Task 1: 先把 smoke 断言改成新需求

**Files:**
- Modify: `apps/web/tests/smoke.test.mjs`

- [ ] **Step 1: 写失败断言，锁定首页与个人中心的新需求**

```js
  const landingSource = readFileSync(resolve(rootDirectory, 'apps/web/app/page.tsx'), 'utf8');
  expectNotIncludes(landingSource, '本地服务状态', 'Landing page should hide developer runtime status');
  expectNotIncludes(landingSource, '开发可见', 'Landing page should not expose developer-only labels');
  expectNotIncludes(landingSource, 'RuntimeStatus', 'Landing page should not render runtime diagnostics');
  expectIncludes(landingSource, '个人中心', 'Landing page should expose the account entry');

  expectFile('apps/web/app/account/page.tsx');

  const accountSource = readFileSync(resolve(rootDirectory, 'apps/web/app/account/page.tsx'), 'utf8');
  expectIncludes(accountSource, '个人中心', 'Account page should expose the account title');
  expectIncludes(accountSource, '账号信息', 'Account page should expose account information');
  expectIncludes(accountSource, '我的设置', 'Account page should expose settings summary');
  expectIncludes(accountSource, '帮助支持', 'Account page should expose help content');
  expectIncludes(accountSource, '退出登录', 'Account page should expose logout action');
```

- [ ] **Step 2: 补充导航收口断言**

```js
  const dashboardShellSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/dashboard-shell.tsx'),
    'utf8',
  );
  expectIncludes(dashboardShellSource, '/account', 'Dashboard shell should route account entry to /account');
  expectNotIncludes(dashboardShellSource, '>设置<', 'Dashboard shell should not keep the fake settings text link');
  expectNotIncludes(dashboardShellSource, '>帮助<', 'Dashboard shell should not keep the fake help text link');

  const headerSource = readFileSync(
    resolve(rootDirectory, 'apps/web/components/web/site-header.tsx'),
    'utf8',
  );
  expectIncludes(headerSource, '/account', 'Public header should expose the account entry');
```

- [ ] **Step 3: 跑 smoke，确认它先失败**

Run: `node .\apps\web\tests\smoke.test.mjs`

Expected:
- FAIL
- 至少出现 `Missing file: apps/web/app/account/page.tsx`
- 或首页仍包含 `RuntimeStatus`

### Task 2: 新增个人中心页面

**Files:**
- Create: `apps/web/app/account/page.tsx`

- [ ] **Step 1: 写最小页面骨架，先满足页面结构与文案要求**

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, fetchCurrentUser, type CurrentUserPayload } from '@/lib/api';
import { clearStoredSession, getStoredSession, setStoredSessionOnboardingStatus } from '@/lib/auth';
import { DashboardCard, DashboardShell, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';

function normalizeMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return '个人中心读取失败，请确认 API 已启动后重试。';
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const session = getStoredSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const payload = await fetchCurrentUser(session.accessToken);
        setUser(payload);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 401) {
          clearStoredSession();
          router.replace('/login');
          return;
        }
        if (loadError instanceof ApiError && loadError.code === 'CONFLICT') {
          setStoredSessionOnboardingStatus(false);
          router.replace('/onboarding');
          return;
        }
        setError(normalizeMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const settingsSummary = useMemo(() => {
    if (!user?.profile) {
      return [
        { label: '训练目标', value: '待建档' },
        { label: '饮食场景', value: '待建档' },
        { label: '训练频率', value: '待建档' },
      ];
    }

    return [
      { label: '训练目标', value: user.profile.targetType },
      { label: '饮食场景', value: user.profile.dietScene },
      { label: '训练频率', value: `${user.profile.trainingDaysPerWeek} 天 / 周` },
    ];
  }, [user]);

  function handleLogout() {
    clearStoredSession();
    router.replace('/login');
  }

  return (
    <DashboardShell
      currentPath=""
      sidebarHint="账号、帮助和退出都收在这里。"
      primaryCta={{ label: '返回今日页', href: '/today' }}
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Account Hub</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">个人中心</h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">
              这里统一承接账号信息、我的设置、帮助支持与退出登录，不再把设置和帮助散落成伪入口。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="登录状态" value={user ? '已登录' : '读取中'} accent />
            <MetricPill label="建档状态" value={user?.hasCompletedOnboarding ? '已完成' : '待完成'} />
            <MetricPill label="当前身份" value={user?.nickname ?? '读取中'} />
          </div>
        </section>
      }
    >
      {loading ? <DashboardCard className="text-sm text-[#5d7288]">正在读取个人中心...</DashboardCard> : null}
      {error ? <DashboardCard className="border-[#ffd8d4] bg-[#fff2f1] text-sm text-[#a34d47]">{error}</DashboardCard> : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-[#17324d]">账号信息</p>
              <p className="mt-2 text-sm leading-7 text-[#5f768d]">这里展示当前登录账号和建档完成情况。</p>
            </div>
            <PanelTag tone="deep">已收口</PanelTag>
          </div>
          <div className="mt-6 grid gap-3">
            <MetricPill label="昵称" value={user?.nickname ?? '读取中'} />
            <MetricPill label="状态" value={user?.status ?? '读取中'} />
            <MetricPill label="建档" value={user?.hasCompletedOnboarding ? '已完成' : '未完成'} accent />
          </div>
        </DashboardCard>

        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">我的设置</p>
          <p className="mt-2 text-sm leading-7 text-[#5f768d]">第一版只做查看与跳转，不在这里发明新的保存逻辑。</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {settingsSummary.map((item) => (
              <MetricPill key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white">前往建档调整</Link>
            <Link href="/status" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">查看饮食计划</Link>
            <Link href="/today" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">返回今日页</Link>
          </div>
        </DashboardCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">帮助支持</p>
          <div className="mt-6 grid gap-3">
            {[
              ['如何开始', '先登录，完成建档，再进入今日页查看训练和饮食计划。'],
              ['饮食计划怎么看', '在饮食计划页查看三餐详情、替换方案与执行指导。'],
              ['打卡后数据去哪了', '每日打卡会同步到今日页和每周复盘，用来生成趋势总结。'],
              ['AI 助手能做什么', '它基于你的当日计划提供解释、问答和执行建议。'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
                <p className="text-lg font-semibold text-[#17324d]">{title}</p>
                <p className="mt-2 text-sm leading-7 text-[#5f768d]">{detail}</p>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard>
          <p className="text-lg font-semibold text-[#17324d]">账户动作</p>
          <div className="mt-6 grid gap-3">
            <Link href="/" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">返回首页</Link>
            <Link href="/today" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">返回今日页</Link>
            <button type="button" onClick={handleLogout} className="rounded-full bg-[#17324d] px-5 py-3 text-sm font-semibold text-white">
              退出登录
            </button>
          </div>
        </DashboardCard>
      </section>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: 跑 smoke，确认个人中心页面文本满足断言**

Run: `node .\apps\web\tests\smoke.test.mjs`

Expected:
- FAIL 可能转移到首页仍包含 `RuntimeStatus`
- 不再报 `Missing file: apps/web/app/account/page.tsx`

### Task 3: 收口工作台和公开页入口

**Files:**
- Modify: `apps/web/components/web/dashboard-shell.tsx`
- Modify: `apps/web/components/web/site-header.tsx`

- [ ] **Step 1: 修改工作台侧边栏底部入口，只保留真实的个人中心**

```tsx
            <div className="hidden gap-5 text-sm text-[#5f7690] lg:grid">
              <Link href="/account" className="transition hover:text-[#0f7ea5]">个人中心</Link>
            </div>
```

- [ ] **Step 2: 修改顶部齿轮按钮为真实跳转**

```tsx
            <Link
              href="/account"
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#61778f] shadow-[0_12px_24px_rgba(21,74,112,0.08)]"
            >
              <TopIcon type="gear" />
            </Link>
```

- [ ] **Step 3: 公开页头部导航补齐个人中心**

```tsx
const navigation = [
  { href: '/today', label: '今日执行' },
  { href: '/check-in', label: '打卡' },
  { href: '/review', label: '周复盘' },
  { href: '/assistant', label: 'AI 助手' },
  { href: '/status', label: '饮食计划' },
  { href: '/account', label: '个人中心' },
  { href: '/onboarding', label: '建档向导' },
  { href: '/login', label: '登录' },
];
```

- [ ] **Step 4: 跑 smoke，确认导航与入口断言通过**

Run: `node .\apps\web\tests\smoke.test.mjs`

Expected:
- FAIL 可能只剩首页仍渲染 `RuntimeStatus`
- 不再报导航缺少 `/account`

### Task 4: 清理首页开发态信息并补业务入口

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: 删除首页开发态运行状态区域和 `RuntimeStatus` 引入**

```tsx
import Link from 'next/link';

import { DashboardCard, MetricPill, PanelTag, SectionEyebrow } from '@/components/web/dashboard-shell';
import { getOverviewStates, getStateLabel } from '@/lib/display-state';
```

```tsx
      <section className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardCard className="bg-[#ecf5fb] p-7 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionEyebrow>Launch Path</SectionEyebrow>
              <h2 className="mt-3 text-[36px] font-semibold text-[#17324d]">从进入到执行，只保留必要步骤</h2>
            </div>
            <PanelTag>即开即用</PanelTag>
          </div>
          <div className="mt-8 grid gap-4">
            {[
              ['01', '邮箱登录', '使用验证码快速进入；已建档用户直达今日仪表盘。'],
              ['02', '建立档案', '收集目标、训练习惯和饮食场景，生成你的第一版计划。'],
              ['03', '开始执行', '在今日页查看训练、饮食和 AI 提示，然后直接去打卡。'],
            ].map(([index, title, description]) => (
              <div key={index} className="grid gap-4 rounded-[28px] bg-white px-5 py-5 sm:grid-cols-[72px_1fr] sm:items-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-[#dff2ff] text-lg font-semibold text-[#0f7ea5]">{index}</div>
                <div>
                  <p className="text-xl font-semibold text-[#17324d]">{title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#5d7288]">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard className="p-7 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionEyebrow>Account Entry</SectionEyebrow>
              <h2 className="mt-3 text-[36px] font-semibold text-[#17324d]">把账号、帮助和设置放回用户语义</h2>
            </div>
            <PanelTag tone="deep">真实入口</PanelTag>
          </div>
          <p className="mt-4 text-sm leading-7 text-[#5d7288]">
            首页不再展示开发态服务信息，而是只保留与普通用户相关的主路径和账户入口。
          </p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-[24px] bg-[#eef4f9] px-5 py-5">
              <p className="text-lg font-semibold text-[#17324d]">个人中心</p>
              <p className="mt-2 text-sm leading-7 text-[#5d7288]">
                在这里查看账号信息、当前设置摘要、帮助支持内容，并执行退出登录。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/account" className="rounded-full bg-[#0f7ea5] px-5 py-3 text-sm font-semibold text-white">进入个人中心</Link>
              <Link href="/status" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324d]">查看饮食计划</Link>
            </div>
          </div>
        </DashboardCard>
      </section>
```

- [ ] **Step 2: 跑 smoke，确认首页断言全部转绿**

Run: `node .\apps\web\tests\smoke.test.mjs`

Expected:
- PASS
- 输出 `web smoke test passed`

### Task 5: 统一 `/status` 页面业务命名并做最终验证

**Files:**
- Modify: `apps/web/app/status/page.tsx`

- [ ] **Step 1: 扫掉 `/status` 页中残余状态页表达**

```tsx
      header={
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <SectionEyebrow>Meal Planner</SectionEyebrow>
            <h1 className="mt-3 text-[56px] font-semibold leading-none text-[#1b3042] sm:text-[68px]">
              智能饮食计划
            </h1>
            <p className="mt-4 max-w-3xl text-xl leading-9 text-[#5f768d]">
              这一页只展示 today 接口已经返回的真实周菜单、今日餐次和实际摄入状态，不再承担系统状态展示职责。
            </p>
          </div>
```

- [ ] **Step 2: 最终跑 smoke 验证**

Run: `node .\apps\web\tests\smoke.test.mjs`

Expected:
- PASS
- 输出 `web smoke test passed`

- [ ] **Step 3: 最终跑 web 构建验证**

Run: `npm.cmd --prefix .\apps\web run build`

Expected:
- exit code 0
- 输出中出现 `/account`
- 输出中保留 `/status`

## 自检

### Spec 覆盖检查

- 首页隐藏开发态服务信息：Task 1、Task 4 覆盖
- `/status` 正名为饮食计划页：Task 5 覆盖
- 设置 / 帮助做成真实入口：Task 2、Task 3 覆盖
- 个人中心承接账号、设置、帮助、退出：Task 2 覆盖

### 占位符检查

- 计划中未使用 `TODO`、`TBD`、`implement later`
- 每个代码步骤都给出具体代码
- 每个验证步骤都给出具体命令和预期

### 类型一致性检查

- 新页面统一使用 `CurrentUserPayload`
- 认证处理统一使用 `getStoredSession` / `clearStoredSession` / `setStoredSessionOnboardingStatus`
- 所有新入口统一跳转 `/account`
