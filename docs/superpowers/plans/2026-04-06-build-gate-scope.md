# 根构建门禁与交付范围收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让根构建覆盖 `web + admin + api + ai-service`，并把该构建正式接入 CI 基础门禁。

**Architecture:** 继续使用根 `pnpm build` 作为唯一聚合构建入口，CI 直接复用这条链路。通过仓库级静态检查和文档同步，保证脚本、工作流与交付范围保持一致。

**Tech Stack:** GitHub Actions、pnpm、Turborepo、Next.js、Node.js

---

### Task 1: 固化 CI 构建门禁

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: 在现有测试步骤后新增根构建步骤**

将以下内容加入 `执行测试` 之后：

```yaml
- name: 执行构建
  run: corepack pnpm build
```

- [ ] **Step 2: 运行根构建验证工作流所依赖的命令**

Run: `npm.cmd run build`
Expected: 四个交付应用全部构建成功，退出码为 0。

### Task 2: 加入范围漂移静态校验

**Files:**
- Modify: `scripts/typecheck.mjs`

- [ ] **Step 1: 让根静态校验强制要求 `build` 脚本存在**

把 `build` 加入 `package.json` 必需脚本列表。

- [ ] **Step 2: 校验根 `build` 脚本的交付范围**

新增对以下过滤器的检查：

```js
const deliveryBuildFilters = [
  '@campusfit/api',
  '@campusfit/admin',
  '@campusfit/web',
  '@campusfit/ai-service'
];
```

并确保以下应用未被误纳入：

```js
const excludedBuildFilters = ['@campusfit/miniapp', '@campusfit/mobile'];
```

- [ ] **Step 3: 校验 CI 工作流包含根构建门禁**

读取 `.github/workflows/ci.yml`，确认存在：

```js
/run:\s+corepack pnpm build/u
```

- [ ] **Step 4: 运行静态校验**

Run: `npm.cmd run typecheck`
Expected: 通过并输出成功信息。

### Task 3: 同步文档中的交付口径

**Files:**
- Modify: `README.md`
- Modify: `docs/repo-structure.md`
- Create: `docs/superpowers/specs/2026-04-06-build-gate-scope-design.md`

- [ ] **Step 1: 在 README 中明确 admin 已进入正式交付范围**

补充 `apps/admin` 入口，并新增“当前默认交付范围与门禁”说明。

- [ ] **Step 2: 在仓库结构文档中明确 miniapp/mobile 当前状态**

新增“当前默认交付范围”段落，说明 `miniapp/mobile` 当前按已归档应用处理，不纳入根构建和 CI 门禁。

- [ ] **Step 3: 保存本次设计说明**

写入 `docs/superpowers/specs/2026-04-06-build-gate-scope-design.md`，记录范围与门禁决策。

- [ ] **Step 4: 复核 README 中的验证命令**

确保包含：

```powershell
npm.cmd --prefix apps\admin run build
corepack pnpm build
```

### Task 4: 完整验证

**Files:**
- No file changes

- [ ] **Step 1: 验证后台单包构建**

Run: `npm.cmd run build`
Workdir: `apps/admin`
Expected: Next.js 生产构建成功。

- [ ] **Step 2: 验证根静态检查**

Run: `npm.cmd run typecheck`
Expected: 通过并退出 0。

- [ ] **Step 3: 验证根聚合构建**

Run: `npm.cmd run build`
Expected: `api/admin/web/ai-service` 四个应用全部构建成功。