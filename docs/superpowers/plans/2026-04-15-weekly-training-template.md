# 周训练模板与休息规则 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有通用训练模板的同时，新增周训练模板能力，并把复合/孤立动作休息规则接入训练方案生成和用户端展示。

**Architecture:** 后台新增一套周训练模板模型和表单；规则引擎新增动作类型识别与默认休息规则；API 和用户端补充动作类型、休息来源和休息说明字段。旧训练模板链路继续保留，周模板作为新增扩展层接入。

**Tech Stack:** Next.js Admin、NestJS API、Prisma、TypeScript、Jest

---

### Task 1: 为规则引擎补动作识别与休息规则

**Files:**
- Modify: `packages/rule-engine/src/index.ts`
- Create: `packages/rule-engine/src/training-rules.ts`
- Test: `apps/api/src/modules/plans/rule-engine.runtime.spec.ts`

- [ ] **Step 1: 先写失败测试**
- [ ] **Step 2: 运行 `npm.cmd test -- rule-engine.runtime.spec.ts`，确认新断言先失败**
- [ ] **Step 3: 实现复合/孤立动作识别和默认休息秒数**
- [ ] **Step 4: 再跑同一条测试，确认通过**

### Task 2: 扩展 API 训练方案输出结构

**Files:**
- Modify: `apps/api/src/modules/today/today.service.ts`
- Modify: `apps/api/src/modules/training-plans/training-plans.service.ts`
- Modify: `apps/api/src/modules/plans/plans.repository.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/src/modules/plans/plans.service.spec.ts`

- [ ] **Step 1: 先写失败测试，覆盖训练项新增字段的序列化**
- [ ] **Step 2: 运行 `npm.cmd test -- plans.service.spec.ts`，确认测试先失败**
- [ ] **Step 3: 给训练项补 `movementPattern`、`restRuleSource`、`restHint` 字段并写入存储/返回**
- [ ] **Step 4: 重新运行测试，确认通过**

### Task 3: 改用户端训练方案展示

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/app/today/page.tsx`
- Modify: `apps/miniapp/src/types/api.ts`
- Modify: `apps/miniapp/src/pages/training/index.tsx`

- [ ] **Step 1: 更新 Web 和小程序训练项类型定义**
- [ ] **Step 2: Web 今日页展示动作类型和休息说明**
- [ ] **Step 3: 小程序训练页展示动作类型和休息说明**
- [ ] **Step 4: 运行 `npm.cmd run typecheck` 验证前端类型无破坏**

### Task 4: 新增后台周训练模板模型与默认数据

**Files:**
- Modify: `apps/admin/lib/contracts.ts`
- Modify: `apps/admin/lib/validation.ts`
- Modify: `apps/admin/lib/mock-store.ts`
- Create: `apps/admin/lib/training-template-rules.ts`

- [ ] **Step 1: 扩展后台 contracts，新增周模板、周配置、动作类型字段**
- [ ] **Step 2: 扩展校验 schema，覆盖七天配置与休息规则来源**
- [ ] **Step 3: 在 mock store 里加入默认周模板数据，映射用户提供的周计划**
- [ ] **Step 4: 写入动作识别和默认休息秒数逻辑，支持手动覆盖**

### Task 5: 新增后台周训练模板编辑页

**Files:**
- Create: `apps/admin/components/admin/weekly-training-template-form.tsx`
- Create: `apps/admin/app/(admin)/weekly-training-templates/page.tsx`
- Create: `apps/admin/app/(admin)/weekly-training-templates/new/page.tsx`
- Create: `apps/admin/app/(admin)/weekly-training-templates/[id]/page.tsx`
- Create: `apps/admin/app/(admin)/weekly-training-templates/[id]/edit/page.tsx`
- Create: `apps/admin/app/api/v1/admin/weekly-training-templates/route.ts`
- Create: `apps/admin/app/api/v1/admin/weekly-training-templates/[id]/route.ts`
- Modify: `apps/admin/lib/admin-nav.ts`

- [ ] **Step 1: 建周模板列表页和详情页**
- [ ] **Step 2: 建七天卡片式编辑器**
- [ ] **Step 3: 接通新增/更新 API 路由到 mock store**
- [ ] **Step 4: 更新后台导航入口**

### Task 6: 总体验证

**Files:**
- Modify: `docs/superpowers/specs/2026-04-15-weekly-training-template-design.md`
- Modify: `docs/superpowers/plans/2026-04-15-weekly-training-template.md`

- [ ] **Step 1: 运行 `npm.cmd test -- rule-engine.runtime.spec.ts`**
- [ ] **Step 2: 运行 `npm.cmd test -- plans.service.spec.ts`**
- [ ] **Step 3: 运行 `npm.cmd run typecheck`**
- [ ] **Step 4: 如有必要补充文档，让最终结构与实现保持一致**
