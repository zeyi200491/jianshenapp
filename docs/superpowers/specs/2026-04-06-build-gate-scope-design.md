# 根构建门禁与交付范围收口设计

> **目标**：稳定根构建链路，并把默认交付范围明确收口到 `web + admin + api + ai-service`。

## 背景

当前根 `pnpm build` 已经把 `@campusfit/api`、`@campusfit/admin`、`@campusfit/web`、`@campusfit/ai-service` 作为正式构建范围，但 `.github/workflows/ci.yml` 只校验 `lint`、`format`、`typecheck`、`test`，没有拦截构建损坏。与此同时，README 与仓库结构文档没有同步体现 `admin` 已进入正式交付范围，导致交付边界和质量门禁存在漂移。

## 设计决策

### 1. 默认交付范围

本次正式交付范围固定为：

1. `apps/web`
2. `apps/admin`
3. `apps/api`
4. `apps/ai-service`

`apps/miniapp` 与 `apps/mobile` 当前视为已归档应用，不纳入默认交付面，也不进入根 `build` 和 CI 基础门禁。

### 2. 最小 CI 门禁

在现有 `lint`、`format:check`、`typecheck`、`test` 之后新增根 `build` 步骤：

```yaml
- name: 执行构建
  run: corepack pnpm build
```

这样 PR 和主分支提交都会被同一条根构建链路校验。

### 3. 范围一致性约束

现有 `scripts/typecheck.mjs` 已承担仓库级静态约束检查，因此在其中补充两类规则：

1. 根 `package.json` 必须保留 `build` 脚本。
2. 根 `build` 脚本必须包含 `api/admin/web/ai-service` 四个过滤器，且不得误纳入 `miniapp/mobile`。
3. CI 工作流必须包含 `corepack pnpm build`，防止后续再次移除构建门禁。

### 4. 文档收口

更新 `README.md` 与 `docs/repo-structure.md`，明确：

1. `admin` 属于当前正式交付面。
2. 根构建与 CI 都以四个应用为基础质量门禁。
3. `miniapp/mobile` 目前按已归档应用处理，仅保留目录，不进入默认门禁。

## 验证策略

实施完成后，至少验证以下命令：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

并确认 `apps/admin` 单独执行 `npm.cmd run build` 也保持通过，以排除后台应用自身构建异常。