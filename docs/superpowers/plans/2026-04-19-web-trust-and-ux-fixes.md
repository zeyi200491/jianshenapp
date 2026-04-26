# Web Trust And UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为网页端补上快打卡模式、周复盘行动清单后端持久化，并修复前台乱码文案，提升执行效率与产品信任感。

**Architecture:** 保持现有 `check-ins` 数据模型不变，只在前端拆分快速/详细交互；为周复盘新增独立的行动清单模型与接口，避免把勾选状态塞进复盘正文 JSON；用户可见文案直接修正源码，统一由前端页面渲染正常中文。

**Tech Stack:** Next.js App Router、NestJS、Prisma、PostgreSQL/mock store、Jest

---

### Task 1: 为周复盘行动清单补后端数据模型

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/prisma/prisma.service.ts`
- Modify: `apps/api/src/prisma/mock-store.ts`
- Create: `apps/api/prisma/migrations/20260419_add_weekly_review_action_items/migration.sql`
- Test: `apps/api/src/modules/weekly-reviews/weekly-reviews.service.spec.ts`

- [ ] 新增 Prisma `WeeklyReviewActionItem` 模型，并把 `User`、`WeeklyReview` 关系补齐。
- [ ] 在 `PrismaService` 中绑定新的 delegate，让数据库模式和 mock 模式都能访问。
- [ ] 在 `MockPrismaStore` 中补 `weeklyReviewActionItems` 存储与 `findMany`、`createMany`、`update`、`deleteMany` 能力。
- [ ] 写一条服务层测试，先描述“生成周复盘后会同时生成 3 条行动清单”的期望，再实现模型支撑。

### Task 2: 为周复盘模块新增行动清单读写能力

**Files:**
- Modify: `apps/api/src/modules/weekly-reviews/weekly-reviews.repository.ts`
- Modify: `apps/api/src/modules/weekly-reviews/weekly-reviews.service.ts`
- Modify: `apps/api/src/modules/weekly-reviews/weekly-reviews.controller.ts`
- Modify: `apps/api/src/modules/weekly-reviews/dto/generate-weekly-review.dto.ts`
- Test: `apps/api/src/modules/weekly-reviews/weekly-reviews.service.spec.ts`

- [ ] 先写失败测试：读取最新周复盘时返回 `actionItems`，生成复盘时会覆盖未完成的系统行动项，勾选接口能持久化完成状态。
- [ ] 在 repository 中补：
  - 查询周复盘行动项
  - 重建未完成系统项
  - 更新单条行动项状态
- [ ] 在 service 中补：
  - 生成默认 3 条行动项
  - `getLatest` 返回 `actionItems`
  - `updateActionItem` 更新 `status/completedAt`
- [ ] 在 controller 与 DTO 中新增 `PATCH /weekly-reviews/action-items/:id`。

### Task 3: 扩展前端 API 类型与请求

**Files:**
- Modify: `apps/web/lib/api.ts`
- Test: `apps/api/src/modules/weekly-reviews/weekly-reviews.service.spec.ts`

- [ ] 先根据后端返回结构补前端类型：`WeeklyReviewActionItem`、`WeeklyReviewPayload.actionItems`。
- [ ] 新增更新行动清单状态的请求方法，供复盘页勾选调用。
- [ ] 保持现有周复盘读取/生成调用不破坏老逻辑。

### Task 4: 把每日打卡改成快打卡优先

**Files:**
- Modify: `apps/web/app/check-in/page.tsx`

- [ ] 先调整页面状态结构，增加 `isDetailedMode`。
- [ ] 默认只展示核心字段：饮食完成度、训练完成度、精力、饱腹感、疲劳感。
- [ ] 把水分、步数、体重、备注、日期切换折叠到“详细模式”区域。
- [ ] 根据模式调整主按钮文案，但继续复用现有提交接口。
- [ ] 已有记录时强化提示“已打卡，可继续补充详细信息”。

### Task 5: 在周复盘页渲染并持久化行动清单

**Files:**
- Modify: `apps/web/app/review/page.tsx`

- [ ] 在“优化建议”模块后新增“下周行动清单”区块。
- [ ] 渲染每条行动项的标题、状态、勾选框。
- [ ] 勾选时做乐观更新，失败则回滚并提示错误。
- [ ] 移除长期置灰的导出按钮，避免持续暴露未完成能力。
- [ ] 保留“带着复盘去问 AI”入口。

### Task 6: 修复个人中心与饮食页乱码

**Files:**
- Modify: `apps/web/app/account/page.tsx`
- Modify: `apps/web/app/status/page.tsx`

- [ ] 直接把用户可见乱码文案替换成正常中文，不保留脏字符串。
- [ ] 顺手统一页面里的空态、错误态、按钮文案，保证口径一致。

### Task 7: 运行验证

**Files:**
- Modify: `apps/api/src/modules/weekly-reviews/weekly-reviews.service.spec.ts`

- [ ] 运行后端单测，重点验证周复盘行动清单生成与更新。
- [ ] 运行前端构建或类型检查，确保新类型与页面改动可编译。
- [ ] 如果时间允许，补跑一个现有打卡/复盘相关测试命令，确认没有把主链路打坏。
