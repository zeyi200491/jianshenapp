# CampusFit AI 项目进度

更新时间：2026-04-03

## 当前阶段

阶段一补充：网页主链路已跑通，正在继续补齐可观测性和联调体验。

## 已完成

1. 产品方向已统一为公开网页，不再推进小程序和原生 App。
2. 文档体系已改为网页优先：产品、PRD、架构、仓库结构、页面树、API、数据库、路线图、验收标准等已同步更新。
3. `apps/web` 已完成首页、登录页、建档页、今日页，并接入真实 API。
4. `apps/web` 已补齐打卡页、周复盘页和 AI 助手页。
5. 打卡页支持按日期读取与提交数据，并可跳转回今日页或周复盘页。
6. 周复盘页支持指定周起始日、切换上一周和下一周，以及一键生成周复盘。
7. AI 助手页支持基于今日计划上下文创建会话、发送消息、查看引用数量，并复用当天会话。
8. API 已支持邮箱验证码登录，并增加验证码发送冷却时间与错误次数限制。
9. API 已新增 SMTP 邮件发送提供方，保留 `mock` 作为本地联调模式。
10. AI 服务已支持 `mock` 和 `openai_compatible` 两种模型提供方。
11. 网页已新增 `/status` 页面，用于集中查看 API、邮件提供方和 AI 提供方状态。
12. 首页和站点导航已补系统状态入口，运行状态组件支持手动刷新和最近检查时间。
13. 本地服务已经验证可启动，网页页面和核心 HTTP 链路均能访问。

## 已验证

1. `node apps\web\tests\smoke.test.mjs` 通过。
2. `corepack pnpm --filter @campusfit/web typecheck` 通过。
3. `corepack pnpm --filter @campusfit/web build` 通过。
4. `npm.cmd --prefix apps\api test -- auth.service.spec.ts` 通过。
5. `npm.cmd --prefix apps\api run build` 通过。
6. 页面访问验证通过：`/login`、`/check-in`、`/review`、`/assistant`、`/status` 返回 `200`。
7. 真实链路验证通过：邮箱发码、验证码登录、建档、获取今日计划、打卡提交、周复盘生成、AI 会话创建与消息发送均成功。

## 当前遗留

1. 真实邮件发送依赖外部 SMTP 配置，仓库只提供接入能力与配置模板，不包含实际账号。
2. 真实 AI 提供方依赖 `AI_OPENAI_BASE_URL` 和 `AI_OPENAI_API_KEY`，当前本地默认仍建议使用 mock。
3. AI 服务目录仍在 `apps/ai-service`，尚未收敛到文档里规划的 `services/ai-service`。
4. 真正的浏览器自动化端到端测试仍未引入，现阶段以 smoke、build 与真实 HTTP 调用为主。

## 下一步建议

1. 引入浏览器级端到端测试，覆盖登录、建档、打卡、复盘和 AI 助手。
2. 如果准备对外试运行，优先接入真实 SMTP、风控限流和日志监控。
3. 再决定是否把 AI 服务目录正式迁移到 `services/ai-service`。

## 本轮新增

1. 新增系统状态页 `/status`。
2. 首页和导航补齐系统状态入口。
3. 运行状态组件支持手动刷新和最近检查时间展示。
4. `scripts/web-http-smoke.ps1` 增加 `/status` 返回 200 校验。