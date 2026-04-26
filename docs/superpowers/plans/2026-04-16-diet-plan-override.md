# Diet Plan Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为饮食计划页增加双场景饮食展示和三餐实际摄入替代录入能力，并将生效营养汇总接入 `/today` 聚合。

**Architecture:** 后端新增食物库服务和餐次替代持久化表，聚合层统一产出 `planned / actual / effective` 结构；前端仅消费聚合数据并在 `/status` 页面提供编辑入口。场景层先做兼容映射，不做老数据迁移。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Next.js 15、React、Jest

---

### Task 1: 规格常量与场景映射

**Files:**
- Modify: `packages/rule-engine/src/index.ts`
- Modify: `packages/rule-engine/src/weekly-diet.ts`
- Test: `apps/api/src/modules/plans/rule-engine.runtime.spec.ts`

- [ ] 定义“展示场景”映射规则，统一把 `dorm/home` 视为 `cookable`
- [ ] 调整饮食模板文案，让 `canteen` 更偏窗口选择，`dorm/home` 更偏快手家常菜
- [ ] 补充或更新运行时测试，验证 `dorm/home` 的输出文案都落在“可做饭”语义下

### Task 2: 实际摄入持久化模型

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/prisma/prisma.service.ts`
- Modify: `apps/api/src/prisma/mock-store.ts`
- Modify: `apps/api/src/prisma/prisma-fallback.d.ts`
- Test: `apps/api/src/modules/plans/plans.service.spec.ts`

- [ ] 为 `MealIntakeOverride` 增加 Prisma 模型和唯一约束
- [ ] 绑定 Prisma delegate，确保数据库模式和 mock 模式都可读写新表
- [ ] 在 mock store 中加入替代记录的增删查改支持
- [ ] 补测试数据，保证 `dailyPlan` 关联替代记录时仍可正常返回

### Task 3: 食物库与替代录入服务

**Files:**
- Create: `apps/api/src/modules/meal-intakes/food-library.ts`
- Create: `apps/api/src/modules/meal-intakes/meal-intakes.repository.ts`
- Create: `apps/api/src/modules/meal-intakes/meal-intakes.service.ts`
- Create: `apps/api/src/modules/meal-intakes/meal-intakes.controller.ts`
- Create: `apps/api/src/modules/meal-intakes/meal-intakes.module.ts`
- Create: `apps/api/src/modules/meal-intakes/dto/search-meal-foods.dto.ts`
- Create: `apps/api/src/modules/meal-intakes/dto/upsert-meal-intake.dto.ts`
- Test: `apps/api/src/modules/meal-intakes/meal-intakes.service.spec.ts`

- [ ] 先写失败测试，覆盖食物搜索、份量倍率计算、同餐覆盖更新、删除恢复
- [ ] 实现内置食物库，至少覆盖常见主食/套餐/面类/快手家常菜
- [ ] 实现搜索接口 `GET /meal-foods/search`
- [ ] 实现保存接口 `PUT /daily-plans/:dailyPlanId/meals/:mealType/intake`
- [ ] 实现删除接口 `DELETE /daily-plans/:dailyPlanId/meals/:mealType/intake`
- [ ] 跑服务测试，确认红绿闭环

### Task 4: 计划仓库与 Today 聚合

**Files:**
- Modify: `apps/api/src/modules/plans/plans.repository.ts`
- Modify: `apps/api/src/modules/today/today.service.ts`
- Modify: `apps/api/src/modules/diet-plans/diet-plans.service.ts`
- Create: `apps/api/src/modules/today/today.service.spec.ts`

- [ ] 先补 today 聚合失败测试，验证 `planned / actual / effective` 和全天汇总
- [ ] 扩展仓库查询，把餐次替代记录一并取回
- [ ] 在 `TodayService` 中组装三层餐次结构和 `effectiveDailyTotals`
- [ ] 在饮食详情服务中补充实际摄入信息，避免后续详情页需要再次改接口
- [ ] 跑 today 与 plans 相关测试

### Task 5: 前端类型与 API 接入

**Files:**
- Modify: `apps/web/lib/api.ts`
- Test: `apps/web` 现有页面构建验证

- [ ] 扩展 `TodayPayload`、`WeeklyDietMeal` 等类型，加入 `planned / actual / effective`
- [ ] 增加食物搜索、保存替代、删除替代三个 API 方法
- [ ] 增加场景展示映射字段或前端辅助函数

### Task 6: 饮食计划页交互

**Files:**
- Modify: `apps/web/app/status/page.tsx`
- Modify: `apps/web/components/web/dashboard-shell.tsx`（仅当需要复用状态标签或输入样式）

- [ ] 先加最小失败验证思路：页面需要能根据 payload 区分显示推荐和实际摄入
- [ ] 在每餐卡片中增加“录入实际吃了什么 / 改成别的 / 恢复推荐”
- [ ] 增加食物搜索与份量选择 UI
- [ ] 保存成功后刷新当天聚合数据
- [ ] 汇总区改为显示 `effectiveDailyTotals`
- [ ] 场景文案改为 `食堂 / 可做饭`

### Task 7: 回归验证

**Files:**
- Verify only

- [ ] 运行后端定向测试：
  - `npm.cmd test -- meal-intakes.service.spec.ts`
  - `npm.cmd test -- plans.service.spec.ts`
  - `npm.cmd test -- today.service.spec.ts`
- [ ] 运行前端构建或类型检查：
  - `npm.cmd run build`
  - 或根目录 `npm.cmd run build`
- [ ] 手工验证本地页面：
  - `/onboarding`
  - `/status`
  - 搜索、保存、恢复推荐
- [ ] 记录剩余风险，例如食物库覆盖度不足、偏差提示阈值是否合理
