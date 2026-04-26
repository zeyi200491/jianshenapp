# P0 鉴权与安全基线设计

## 目标

在不同时推进部署链路、合规与大规模产品改版的前提下，完成一轮可以直接支撑生产上线前联调的鉴权与安全基线改造。改造后，公开 Web、运营后台、API 与 AI 服务需要满足以下目标：

- Web 不再将 `accessToken` / `refreshToken` 持久化到浏览器可读存储中。
- Admin 不再使用 mock 登录，接入真实后端鉴权。
- API 统一采用基于 `HttpOnly` Cookie 的会话鉴权，同时保留短期兼容能力，避免一次性切断现有前端。
- 生产环境必须显式提供安全配置，禁止默认弱密钥继续兜底。
- Swagger、CORS、运行状态暴露等生产敏感能力必须可按环境收口。

## 范围

### 本轮纳入

- `apps/web` 的登录态读写与登录流程改造
- `apps/admin` 的登录、受保护布局、后端代理鉴权改造
- `apps/api` 的登录响应、当前用户接口、登出接口、统一鉴权入口、环境变量强校验、Swagger 开关
- `apps/ai-service` 的 CORS 白名单改造
- 与以上改造直接相关的测试与构建验证

### 本轮不纳入

- Nginx、HTTPS、域名、灰度发布、回滚、监控告警平台接入
- 隐私政策、用户协议、数据删除流程页面
- 全量 E2E 测试体系重建
- 多租户、细粒度 RBAC、复杂运营权限矩阵

## 方案选择

本轮采用“后端 Cookie 会话化 + 兼容式迁移”的方案。

推荐理由：

1. 安全边界最清晰。前端 JS 不再直接接触长期令牌，XSS 后的可窃取面显著缩小。
2. 能同时解决 Web 与 Admin 的问题。两端都可以统一到同一条鉴权链路上。
3. 可以平滑迁移。API 在短期内同时支持旧 `Authorization: Bearer` 与新 Cookie，会让改造风险更可控。

不采用“继续保留前端可读 JWT”的原因是，这只能算止血，不能算上线基线。

## 总体架构

### 1. API 负责会话签发与校验

邮箱验证码登录成功后，API 除保留原有响应体结构外，新增设置一组 Cookie：

- `campusfit_access_token`
- `campusfit_refresh_token`

Cookie 属性规则：

- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- `Secure` 在生产环境开启，本地开发默认关闭
- `Max-Age` 与现有 token 生命周期保持一致

API 的鉴权守卫调整为：

1. 优先读取 `Authorization: Bearer <token>`
2. 如不存在，再读取 `campusfit_access_token`
3. 二者都不存在则判定未登录

这样可以保证旧前端在迁移窗口内仍能工作。

### 2. Web 改为只依赖 Cookie 会话

Web 端不再存储完整会话令牌，不再保留 `localStorage` 中的登录态对象。前端只保留最小用户态缓存，来源改为：

- 登录后立即调用受保护接口确认登录状态
- 刷新页面时通过 `fetch` 携带浏览器自动附带的 Cookie 访问 `/users/me`

Web 的跳转依据从“本地 token 是否存在”改成“后端是否确认当前会话有效”。这样可以同步解决：

- 本地脏状态导致的假登录
- token 过期但前端仍认为已登录
- onboarding 状态和实际后端状态不一致

### 3. Admin 去掉 mock，改为真实后端登录

Admin 登录页改为调用 API 的真实后台登录接口。本轮不做复杂权限系统，但至少落一层明确角色边界：

- Admin 登录成功后，后端返回带 `role` 的用户信息
- 受保护布局不能只看 cookie 是否存在，必须请求一个受保护的“当前后台用户”接口
- 当角色不满足时返回 403，而不是继续渲染页面

如果现有 API 还没有专门的后台账号体系，本轮采用“最小可上线前基线”：

- 增加后台登录入口
- 通过环境变量配置一组后台账号或后台访问密钥
- 后端生成受限角色会话

这不是最终运营权限系统，但足以替换当前 mock。

### 4. 启动时强制配置校验

API 在启动阶段增加配置校验，规则如下：

- `NODE_ENV=production` 时，若 `JWT_SECRET` 缺失或仍为默认开发值，启动直接失败
- `AUTH_EMAIL_PROVIDER=smtp` 时，缺少 SMTP 必填项则启动失败
- 会话 Cookie 的 `Secure` 策略由显式配置控制，并在生产环境默认要求开启
- Swagger 是否启用由显式环境变量控制，默认在生产关闭

AI 服务同样改为：

- 从环境变量读取允许的 CORS Origin 列表
- 未配置时仅允许本地开发白名单
- 生产环境禁止 `*`

## 关键模块改造

### Web

涉及文件预计包括：

- `apps/web/lib/auth.ts`
- `apps/web/lib/api.ts`
- `apps/web/app/login/page.tsx`
- `apps/web/app/onboarding/page.tsx`
- `apps/web/app/today/page.tsx`
- `apps/web/app/check-in/page.tsx`
- `apps/web/app/review/page.tsx`
- `apps/web/app/assistant/page.tsx`
- 可能新增 `apps/web/lib/session.ts` 或类似会话查询辅助文件

改造原则：

- 删除 `localStorage` 中的 token 读写逻辑
- `fetch` 默认开启 `credentials: 'include'`
- 页面加载时通过后端确认登录态
- 登出动作需要调用后端登出接口并清除 Cookie

### Admin

涉及文件预计包括：

- `apps/admin/components/admin/login-form.tsx`
- `apps/admin/app/login/page.tsx`
- `apps/admin/app/(admin)/layout.tsx`
- `apps/admin/lib/api-client.ts`
- `apps/admin/app/api/v1/admin/auth/login/route.ts`
- 可能新增 `apps/admin/app/api/v1/admin/auth/me/route.ts`

改造原则：

- 去掉 mock token 返回
- 登录接口转发到真实 API
- 保护布局通过服务端接口验证当前后台会话与角色
- 未登录跳转与无权限提示分开处理

### API

涉及文件预计包括：

- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/modules/users/users.controller.ts`
- 可能新增 Cookie 处理辅助与配置校验模块

改造原则：

- 登录成功时设置 Cookie
- 新增登出接口，统一清空鉴权 Cookie
- 鉴权守卫支持 Bearer 与 Cookie 双通道
- 当前用户接口返回前端所需最小用户态
- 生产配置不安全时直接拒绝启动

### AI Service

涉及文件预计包括：

- `apps/ai-service/app/main.py`
- `apps/ai-service/app/core/config.py`

改造原则：

- 通过配置加载允许的 Origin 列表
- 不再使用 `allow_origins=["*"]`
- 配置异常时给出清晰、无乱码的错误信息

## 数据流

### Web 登录流

1. 用户在 Web 提交邮箱验证码
2. API 验证成功
3. API 返回登录响应，并在响应头中设置会话 Cookie
4. Web 不写入本地 token，仅根据响应与后续 `/users/me` 确认状态
5. Web 根据当前用户的 onboarding 状态进行跳转

### Admin 登录流

1. 用户在 Admin 提交后台凭证
2. Admin 的内部 route handler 转发到真实 API
3. API 验证成功并设置后台会话 Cookie
4. Admin 保护布局请求“当前后台用户”接口
5. 后端确认角色后允许进入后台页面

### 会话失效流

1. 任何页面请求后端返回 401
2. 前端清理最小本地状态
3. 调用登出接口或直接跳回登录页
4. 后端清除会话 Cookie

## 错误处理

### 必须保证的行为

- 未登录：统一返回 401，前端跳登录
- 已登录但无后台权限：返回 403，前端显示无权限提示
- 配置缺失：服务启动失败，不允许带病启动
- SMTP 或 AI Provider 未准备好：通过健康检查给出明确状态，但不泄露敏感值

### 文案要求

- 修掉当前关键启动配置与健康检查中的乱码提示
- 面向用户的错误信息要可理解
- 面向开发的日志要能定位问题，但不能回显密钥

## 测试策略

本轮至少覆盖以下验证：

### API

- 登录成功时返回 Cookie
- 鉴权守卫能从 Cookie 读取 token
- 登出接口会清空 Cookie
- 生产模式下默认 JWT 密钥会导致启动失败
- Swagger 在生产默认关闭

### Web

- 不再使用 `localStorage` 持久化登录 token
- 登录后基于后端状态跳转
- 401 时能够回到登录页

### Admin

- 登录不再返回 mock token
- 保护布局会做真实登录态检查
- 无权限时不会直接渲染后台

### AI Service

- CORS 配置按环境变量加载
- 非开发环境禁止通配符

## 迁移与风险控制

为避免一次性切断现有逻辑，按以下顺序实施：

1. API 先支持 Cookie + Bearer 双通道
2. Web 切换到 Cookie 会话
3. Admin 切换到真实后端登录
4. 收口生产配置校验、Swagger、AI CORS
5. 在确认前端已不依赖旧 token 后，再考虑移除 Bearer 兼容路径

主要风险：

- 前端页面较多，若统一会话查询做得不好，容易引入重复请求
- Admin 当前是演示态，接入真实鉴权后可能暴露更多缺失的后台接口
- 生产配置校验过严会在本地开发造成摩擦，因此必须明确区分 `development` / `test` / `production`

对应控制措施：

- 尽量抽一层统一会话查询封装
- 后端接口优先保证最小闭环，不扩散到完整后台能力重构
- 使用显式环境变量和默认开发值分离策略

## 验收标准

满足以下条件视为本轮设计达成：

1. Web 与 Admin 都不再依赖浏览器可读的长期 token 存储
2. Admin mock 登录被真实后端登录替换
3. API 能通过 Cookie 识别登录态
4. 生产环境不能再用默认 JWT 密钥启动
5. Swagger 与 AI CORS 能按环境收口
6. 相关关键测试可以证明以上行为成立

## 本轮不解决的问题

这些问题明确留到后续迭代，不在本轮夹带：

- 复杂权限矩阵
- 监控与告警平台接入
- 上云部署脚本
- 法务文档和用户协议页面
- 全链路自动化回归体系
