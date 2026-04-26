# CampusFit AI

CampusFit AI 当前采用“公开网页 + API + 独立 AI 服务”的实现方式，面向所有人提供训练、饮食、打卡、周复盘和 AI 助手能力。

## 当前入口

- Web：`apps/web`
- Admin：`apps/admin`
- API：`apps/api`
- AI 服务：`apps/ai-service`

## 当前默认交付范围与门禁

- 本次正式交付范围固定为 `apps/web`、`apps/admin`、`apps/api`、`apps/ai-service`。
- 根命令 `pnpm build` 与 CI 工作流 `ci.yml` 都以这 4 个应用为默认构建门禁。
- `apps/miniapp` 与 `apps/mobile` 已从当前仓库移除，不属于默认交付面，也不纳入本轮根构建和 CI 质量门禁。
- 后续若要恢复小程序或移动端交付，建议以独立应用重新初始化，并补齐 `lint`、`typecheck`、`test`、`build` 约束后再纳入根脚本与 CI。

## 已实现网页路由

- `/`
- `/login`
- `/onboarding`
- `/today`
- `/check-in`
- `/review`
- `/assistant`
- `/status`

## 环境准备

1. Node.js 20+
2. pnpm 9+
3. Python 3.11+
4. 如果走数据库模式，需要 PostgreSQL；本地联调可先用 `API_DATA_MODE=mock`

## 初始化

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/ai-service/.env.example apps/ai-service/.env
corepack pnpm install
python -m pip install -e apps/ai-service[dev]
```

## 本地开发

### 一键启动

```powershell
pnpm dev
```

### 分开启动

```powershell
pnpm dev:web
pnpm dev:api
pnpm dev:admin
pnpm dev:ai
```

## 推荐的本地可用配置

### 1. Mock 模式

适合前后端联调，不依赖真实数据库和真实邮件。

```env
API_DATA_MODE=mock
AUTH_EMAIL_PROVIDER=mock
AI_PROVIDER=mock
```

说明：
- 邮箱发码接口会返回 `devCode`
- AI 助手使用内置 mock provider
- 可以直接完成登录、建档、今日计划、打卡、周复盘和 AI 对话全链路验证

### 2. 真实邮件 + OpenAI 兼容模型

适合逐步靠近生产环境。

```env
AUTH_EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-account
SMTP_PASSWORD=your-password
SMTP_FROM=CampusFit AI <no-reply@example.com>

AI_PROVIDER=openai_compatible
AI_MODEL=gpt-4.1-mini
AI_OPENAI_BASE_URL=https://api.openai.com/v1
AI_OPENAI_API_KEY=your-api-key
```

说明：
- SMTP 模式下接口不会返回 `devCode`
- AI 服务会走 OpenAI 兼容 `/chat/completions` 接口
- 仓库仍保留 mock 作为开发回退模式

## 验证命令

```powershell
node apps\web\tests\smoke.test.mjs
npm.cmd --prefix apps\api test -- auth.service.spec.ts
npm.cmd --prefix apps\admin run build
npm.cmd --prefix apps\api run build
corepack pnpm build
corepack pnpm --filter @campusfit/web typecheck
corepack pnpm --filter @campusfit/web build
powershell -ExecutionPolicy Bypass -File scripts\web-http-smoke.ps1
```

## 健康检查

- API：[http://127.0.0.1:3000/api/v1/health](http://127.0.0.1:3000/api/v1/health)
- AI：[http://127.0.0.1:8001/health](http://127.0.0.1:8001/health)
- Web：[http://127.0.0.1:3200/login](http://127.0.0.1:3200/login)
- Status：[http://127.0.0.1:3200/status](http://127.0.0.1:3200/status)
- Swagger：[http://127.0.0.1:3000/docs](http://127.0.0.1:3000/docs)

## 当前重点

1. 网页主链路已经跑通，并补齐打卡页、周复盘页、AI 助手页和系统状态页。
2. API 已支持邮箱验证码登录的冷却时间、错误次数限制，以及 SMTP 邮件发送配置。
3. AI 服务已支持 `mock` 和 `openai_compatible` 两种 provider。
4. 建议先在本地用 mock 模式联调，再切换真实邮件和真实模型。

## 本轮补充

- 新增 `/status` 页面，用于集中查看 API、邮件提供方和 AI 提供方状态。
- 站点导航和首页已补系统状态入口。
- `smoke:web` 现在会额外验证 `/status` 页面返回 200。
- 运行状态组件支持手动刷新和最近检查时间展示。
