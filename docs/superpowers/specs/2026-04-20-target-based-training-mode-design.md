# 目标驱动训练模式设计

## 背景

当前系统对训练计划的生成存在两套心智模型：

- 减脂用户默认走有氧模板
- 非减脂用户走力量训练模板，并保留力量循环重置入口

但前端仍残留“手动改今天训练类型”的交互，容易让展示层和生成层出现冲突。本次要把规则收口成单一来源：训练类型只由用户目标决定。

## 业务规则

- `bulk`：只生成力量训练
- `maintain`：只生成力量训练
- `cut`：只生成有氧计划
- `bulk` / `maintain` 允许继续使用力量训练循环
- `cut` 不再参与力量训练循环，也不允许手动重置 `push / pull / legs`

## 模块边界

### 规则引擎

`packages/rule-engine/src/index.ts` 成为训练模式唯一判定入口：

- `generateTrainingPlan()` 根据 `targetType` 决定训练大类
- `buildInitialProfileSummary()` 的训练建议与目标保持一致
- 力量目标允许使用 `forcedFocus`
- 减脂目标忽略 `forcedFocus`

### API 服务

`apps/api/src/modules/plans/plans.service.ts` 与 `apps/api/src/modules/profiles/profiles.service.ts` 负责把规则和用户动作接起来：

- `PlansService` 继续为力量目标维护训练循环状态
- `PlansService` 对减脂目标返回“无需选择力量 focus”的状态
- `ProfilesService.resetTrainingCycle()` 对减脂目标直接拒绝

### 前端展示

`apps/web/app/today/page.tsx` 只展示当前目标允许的训练类型：

- `cut` 仅展示有氧计划卡片
- `bulk` / `maintain` 仅展示力量训练卡片
- 力量训练按钮只在力量目标下显示
- 减脂用户不再看到力量循环相关入口

## 兼容策略

- 不迁移历史 `dailyPlan`
- 未来日期或用户重新生成当天计划时，自然按新规则覆盖
- 历史 `trainingCycleStartFocus` 对减脂用户继续保留数据库值，但不再参与计划生成

## 异常处理

- 减脂用户调用训练循环重置接口时，返回明确业务错误
- 前端收到该错误后仅展示友好提示，不做兜底重试

## 测试策略

- 规则引擎测试覆盖 `bulk` / `maintain` / `cut` 三类目标的训练生成结果
- API 服务测试覆盖减脂用户重置力量循环被拒绝
- 前端最小回归覆盖今天页在不同目标下的按钮/文案显示
