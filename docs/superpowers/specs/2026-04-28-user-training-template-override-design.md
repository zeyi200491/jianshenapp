# 用户周训练模板与当日覆盖设计

## 目标

在保留现有系统自动训练计划的前提下，新增一套“用户自己的周训练模板”能力，让用户可以：

1. 维护自己按周一到周日编排的长期训练模板。
2. 在 today 页默认按自然日预览当天对应的模板内容。
3. 手动切换预览其他星期几的训练内容。
4. 把某一天的模板内容“应用到今天”，替换今天实际执行的训练方案。
5. 随时恢复查看和使用系统原本自动生成的训练计划。

## 非目标

本次不做以下内容：

1. 不把用户模板直接接入规则引擎，替代系统长期生成逻辑。
2. 不实现多套模板之间的复杂版本比对、复制历史版本、模板分享。
3. 不把 today 页改造成完整训练模板编辑器。
4. 不改造打卡的完成度模型，只保证打卡读取当前生效训练方案。

## 现状与问题

当前系统的训练链路是单轨结构：

1. `PlansService.generateForDate()` 基于档案和规则引擎生成 `daily_plans + training_plans + training_plan_items`。
2. `TodayService` 聚合 today 数据时，只返回一份 `trainingPlan`。
3. `TrainingPlanPanel`、AI 助手、打卡页训练摘要都默认把这份 `trainingPlan` 当作今天唯一训练方案。

这套结构的问题是：

1. 用户无法长期维护自己的固定周训练安排。
2. 用户无法临时把“自己的方案”应用到今天。
3. 如果直接复用现有 `training_plans` 去存模板，会把“长期模板”和“当天执行历史”混在一起，后续修改模板会污染过去的训练记录。

## 设计结论

### 1. 采用“双层模型”

本次采用两层结构：

1. `用户周训练模板`
   - 负责保存用户的长期训练配置。
   - 这是“未来可复用的模板”，不是今日执行记录。

2. `当日训练覆盖快照`
   - 当用户在 today 页点击“应用到今天”时，把模板中的某一天复制成一份挂在 `dailyPlan` 下的快照。
   - 这份快照才是今天真正执行、打卡、AI 解读所读取的训练方案。

### 2. 保留系统计划，不强行覆盖原链路

用户选择的是“双轨保留”：

1. 系统自动训练计划继续生成并保留。
2. 用户模板作为另一条来源进入 today 页。
3. today 页需要明确区分：
   - 系统原方案
   - 当前生效方案
   - 当前来源是系统还是用户覆盖

### 3. 默认按自然日，允许手动切换

当用户启用了自己的周模板后：

1. today 页默认按当天星期几预览模板对应内容。
2. 用户可以手动切换预览“周一到周日”的任意一天。
3. 只有在点击“应用到今天”后，才会真正生成当日覆盖快照。

这样既保证默认简单，也满足临时调课需求。

## 用户流程

### 1. 维护模板

1. 用户进入“我的训练模板”页面。
2. 新建一套周训练模板。
3. 按周一到周日填写每天内容：
   - 休息日
   - 训练日标题
   - 动作列表
   - 组数、次数、休息秒数、备注
4. 保存并启用模板。

### 2. today 页预览

1. today 页读取当前启用模板。
2. 默认按自然日定位到当天对应的 `weekday`。
3. 训练计划卡片展示模板预览内容。
4. 用户可以切换查看别的星期几，不落库。

### 3. 应用到今天

1. 用户在 today 页选择要应用的星期几内容。
2. 点击“应用到今天”。
3. 服务端把该模板日复制成一份 `daily training override snapshot`。
4. today、打卡、AI 都切换为读取这份快照。

### 4. 恢复系统方案

1. 用户点击“恢复系统方案”。
2. 服务端停用今天的 override。
3. today 页重新回到系统训练计划。

## 数据模型

### 1. 用户周模板

新增三张表：

#### `user_training_templates`

- `id`
- `user_id`
- `name`
- `status`
  - `active | archived`
- `is_default`
- `is_enabled`
- `notes`
- `created_at`
- `updated_at`

约束：

1. 每个用户可有多套模板。
2. 每个用户同一时刻最多一套 `is_enabled=true`。

#### `user_training_template_days`

- `id`
- `template_id`
- `weekday`
  - `monday | tuesday | wednesday | thursday | friday | saturday | sunday`
- `day_type`
  - `training | rest`
- `title`
- `notes`
- `sort_order`

约束：

1. 每套模板固定 7 条 weekday 记录。
2. 同一模板下 `weekday` 唯一。

#### `user_training_template_items`

- `id`
- `template_day_id`
- `exercise_code`
- `exercise_name`
- `sets`
- `reps`
- `rest_seconds`
- `notes`
- `display_order`

约束：

1. `day_type=rest` 时不允许挂动作。
2. `day_type=training` 时允许 1..N 个动作。

### 2. 当日训练覆盖快照

新增两张表：

#### `daily_training_overrides`

- `id`
- `daily_plan_id`
- `user_id`
- `source_template_id`
- `source_weekday`
- `title`
- `notes`
- `status`
  - `active | superseded`
- `created_at`
- `updated_at`

约束：

1. 每个 `daily_plan_id` 同时最多一条 `active` override。
2. 允许保留旧记录，但只会有一条当前生效。

#### `daily_training_override_items`

- `id`
- `override_id`
- `exercise_code`
- `exercise_name`
- `sets`
- `reps`
- `rest_seconds`
- `notes`
- `display_order`

### 3. 现有表处理策略

现有以下表不承担模板角色：

1. `training_plans`
2. `training_plan_items`

它们继续表示系统自动生成的当日训练方案。

这样可以保证：

1. 系统原计划始终存在。
2. 历史快照不会被模板编辑污染。
3. 当前 today 链路可以渐进式扩展，而不是整体重构。

## API 设计

### 1. 模板管理

#### `GET /users/me/training-templates`

返回当前用户全部模板摘要，包含：

- 模板头信息
- 是否默认
- 是否启用

#### `POST /users/me/training-templates`

新建模板，请求体直接带 7 天结构。

#### `GET /users/me/training-templates/:id`

返回模板详情，包括 7 天和动作明细。

#### `PATCH /users/me/training-templates/:id`

更新模板头、某一天和动作列表。

#### `POST /users/me/training-templates/:id/enable`

启用该模板，并自动取消同用户其他模板的 `is_enabled`。

#### `POST /users/me/training-templates/:id/set-default`

设为默认模板。

### 2. 模板预览

#### `GET /users/me/training-template-preview`

Query：

- `date`
- `templateId`，可选，不传则取当前启用模板
- `weekday`，可选，不传则按 `date` 的自然日换算

返回：

- 当前预览星期几
- 预览标题
- 动作列表
- 来源模板信息

该接口不落库，只做预览。

### 3. 应用到今天

#### `POST /daily-plans/:dailyPlanId/training-override`

请求体：

```json
{
  "templateId": "uuid",
  "weekday": "tuesday"
}
```

行为：

1. 校验 `dailyPlan` 属于当前用户。
2. 校验模板属于当前用户。
3. 读取模板指定 `weekday`。
4. 生成 override 快照及 items。
5. 若已有旧 override，则置为 `superseded`。
6. 返回新的当前生效训练方案。

### 4. 恢复系统方案

#### `DELETE /daily-plans/:dailyPlanId/training-override`

行为：

1. 找到该日当前 `active` override。
2. 将其置为失效，或按实现策略删除。
3. 返回系统训练计划作为当前生效结果。

### 5. today 聚合结构扩展

`GET /today` 增加以下字段：

- `systemTrainingPlan`
- `activeTrainingPlan`
- `activeTrainingSource`
  - `system | user_override`
- `enabledUserTrainingTemplate`
  - 当前启用模板的简要信息，可选

兼容策略：

1. 原有 `trainingPlan` 可以先保留为 `activeTrainingPlan` 的镜像字段，用于减少前端一次性改动。
2. 后续再逐步把前端切到显式使用 `activeTrainingPlan`。

## 前端设计

### 1. 新页面

新增独立页面，例如：

- `/account/training-templates`

页面职责：

1. 模板列表
2. 新建模板
3. 编辑周一到周日内容
4. 设置默认 / 启用

不把完整编辑器塞进 today 页，避免 today 继续膨胀。

### 2. today 页训练卡片

`TrainingPlanPanel` 增加以下能力：

1. 展示当前来源：
   - 系统方案
   - 用户模板覆盖
2. 增加“我的训练模板”入口
3. 增加周一到周日切换器
4. 增加“应用到今天”按钮
5. 增加“查看系统方案”入口
6. 增加“恢复系统方案”按钮

### 3. 默认行为

1. 若用户没有启用模板：
   - today 维持现状，只展示系统方案。
2. 若用户启用模板但尚未应用到今天：
   - today 默认展示模板预览区，并允许应用。
   - 系统方案仍可查看。
3. 若用户已应用到今天：
   - today 默认展示当前 active override。
   - 同时保留系统方案查看和恢复入口。

## 服务落点

### 1. `training-templates` 模块

负责：

1. 用户模板 CRUD
2. 启用 / 默认模板切换
3. 按 `weekday` 预览模板内容

### 2. `training-overrides` 模块

负责：

1. 应用模板某一天到指定 `dailyPlan`
2. 生成当日覆盖快照
3. 恢复系统方案

### 3. `today.service.ts`

负责聚合：

1. 系统训练计划
2. 当前 active override
3. 当前生效来源

规则：

1. 有 active override 时，`activeTrainingPlan = override`
2. 没有 override 时，`activeTrainingPlan = system training plan`

### 4. `plans.service.ts`

仍负责系统生成逻辑，不承担用户模板管理或 override 写入职责。

这样可以避免 `PlansService` 职责继续膨胀。

## AI、打卡、详情联动

### 1. AI 助手

AI 应读取“当前生效训练方案”，而不是默认只读系统 `trainingPlan`。

要求：

1. today 页传给 AI 的训练上下文必须指向 active plan。
2. 若今天使用用户 override，AI 输出内容必须基于 override 动作明细。

### 2. 打卡页

打卡页训练摘要必须与 today 的 `activeTrainingPlan` 一致。

不改 `check_ins` 表结构，只改其读取训练摘要的来源。

### 3. 训练详情

推荐新增：

- `GET /daily-plans/:dailyPlanId/active-training-plan`

该接口直接返回“今天真正执行的训练详情”，避免前端额外判断 system/override 两套详情接口。

## 测试策略

### 1. DTO / 参数校验

覆盖：

1. 模板必须含完整 7 天
2. `weekday` 枚举合法
3. 休息日不可保存动作
4. 训练动作组数、次数、休息时间合法

### 2. Service 单测

覆盖：

1. 创建模板
2. 启用模板
3. 默认按自然日预览
4. 手动切换星期几预览
5. 应用模板到今天生成 override
6. 重复应用时旧 override 失效
7. 恢复系统方案后回退

### 3. today 聚合测试

覆盖：

1. 无 override 时返回 system
2. 有 override 时返回 user override
3. `activeTrainingSource` 正确
4. `systemTrainingPlan` 保留

### 4. Web 冒烟测试

覆盖：

1. today 出现模板入口和来源标识
2. today 出现“应用到今天 / 恢复系统方案”
3. 模板页存在周一到周日结构

## 风险与控制

### 1. 训练上下文分裂

风险：

today、AI、打卡若没有同时切到 active plan，会出现页面显示、AI 提示、打卡摘要三套口径不一致。

控制：

统一由 `today.service.ts` 聚合 active plan，并让其他读取入口复用同一判定逻辑。

### 2. 模板污染历史

风险：

如果 today 直接读模板作为历史执行记录，用户后续编辑模板会改写过去。

控制：

必须通过 `daily_training_overrides` 生成快照，不直接把模板当历史记录。

### 3. today 页继续膨胀

风险：

把完整模板编辑器塞到 today 会让 today 页再次失控。

控制：

today 只做预览、应用和恢复；模板编辑单独成页。

### 4. 现有前端字段兼容

风险：

当前前端广泛假设 today 只有一个 `trainingPlan` 字段。

控制：

先在 today API 里新增 `systemTrainingPlan / activeTrainingPlan / activeTrainingSource`，同时暂时保留旧 `trainingPlan` 指向 active plan，分阶段迁移前端。

## 推荐实施顺序

1. 先落数据库模型与 Prisma 结构。
2. 再做模板模块和 override 模块 API。
3. 然后改 today 聚合与打卡/AI 读取来源。
4. 最后补 today 页与模板管理页交互。

这样可以先打通后端能力，再逐步接入用户界面，降低联调风险。
