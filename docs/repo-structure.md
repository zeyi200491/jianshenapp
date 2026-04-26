# CampusFit AI 仓库结构设计

## 1. 目标

使用 `pnpm + Turborepo` 搭建 Monorepo，统一管理公开网页、运营后台、后端、AI 服务与共享包，确保：

1. 依赖统一
2. 脚本统一
3. 类型统一
4. 配置统一
5. Web 优先开发成本可控

## 2. 顶层结构建议

```text
campusfit-ai/
├─ apps/
│  ├─ web/
│  ├─ admin/
│  └─ api/
├─ services/
│  └─ ai-service/
├─ packages/
│  ├─ ui/
│  ├─ types/
│  ├─ config/
│  ├─ eslint-config/
│  ├─ tsconfig/
│  └─ rule-engine/
├─ docs/
├─ scripts/
├─ infra/
├─ .github/
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

## 3. 目录职责说明

### 3.1 `apps/web`

负责公开网页 MVP：

- 登录与建档
- 今日页
- 饮食计划页
- 训练计划页
- 打卡页
- 周复盘页
- AI 助手页
- 商品列表页
- 用户中心

### 3.2 `apps/admin`

负责运营后台：

- 模板管理
- 商品管理
- 内容管理
- 数据看板

### 3.3 `apps/api`

负责核心业务服务：

- 认证
- 用户档案
- 今日计划
- 打卡
- 周复盘
- 商品接口
- AI 编排

### 3.4 `services/ai-service`

负责 AI 能力服务：

- Prompt 组装
- 检索增强
- LLM 调用
- AI 问答
- 计划解释
- 周复盘文案增强

### 3.5 `packages/rule-engine`

这是 MVP 的关键共享包，负责：

1. 营养目标计算
2. 饮食场景规则匹配
3. 训练计划框架生成
4. 输出结构化计划

## 4. 工程约定

### 4.1 命名约定

1. 应用目录使用语义清晰英文名。
2. 公共包以能力命名，不以页面命名。
3. 数据模型统一使用英文单数，接口资源路径使用复数。

### 4.2 文档约定

1. 所有关键信息落到 `docs/`
2. 每次阶段性变更同步更新 `docs/progress.md`
3. 架构与范围变更同步更新 `docs/decisions.md`
4. 不确定项同步更新 `docs/assumptions.md`

### 4.3 配置约定

建议第二阶段建立以下配置：

1. 根目录统一 `eslint`、`prettier`、`commitlint`
2. `packages/tsconfig` 统一 TS 基础配置
3. `.env.example` 管理环境变量模板
4. `turbo.json` 统一任务编排

## 5. 任务编排建议

1. `pnpm dev`
2. `pnpm build`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm format`
6. `pnpm db:migrate`
7. `pnpm db:seed`

## 5.1 当前默认交付范围

当前根脚本与 CI 的默认交付范围固定为以下 4 个应用：

1. `apps/web`
2. `apps/admin`
3. `apps/api`
4. `apps/ai-service`

`apps/miniapp` 与 `apps/mobile` 已从当前仓库移除，不再进入根 `pnpm build` 和 CI 合并门禁。后续如果要恢复多端交付，建议作为新应用重新接入，并补齐与上述 4 个应用同等级的 `lint`、`typecheck`、`test`、`build` 质量标准。

## 6. 仓库风险提示

1. AI 服务是 Python 工程，需要明确独立依赖管理方式。
2. 公开网页与后台共享组件时，要注意权限边界与样式隔离。
3. 共享规则引擎需保持纯函数化和低耦合。
4. 目录口径需与真实仓库一致，避免再出现 `apps/ai-service` 与 `services/ai-service` 的定义冲突。
