# CampusFit AI 生产运行手册

## 上线前条件

- 域名解析完成：`example.com`、`admin.example.com`、`api.example.com`、`ai.example.com` 指向反向代理公网地址。
- TLS 证书放入 `${TLS_CERT_DIR}`，文件名为 `fullchain.pem` 和 `privkey.pem`。
- `.env.production` 不提交到仓库，必须包含 `NODE_ENV=production`、强随机 `JWT_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、数据库连接、CORS 白名单和 AI provider 配置。
- CI 必须通过：`lint`、`format:check`、`typecheck`、根测试、API Jest、Web smoke、AI pytest、build、compose config。

## 部署流程

1. 构建并推送镜像：`API_IMAGE`、`WEB_IMAGE`、`ADMIN_IMAGE`、`AI_SERVICE_IMAGE`。
2. 在服务器写入 `.env.production`，不要把真实密钥写入 Git。
3. 校验编排文件：`docker compose -f infra/compose/docker-compose.prod.yml config -q`。
4. 启动服务：`docker compose -f infra/compose/docker-compose.prod.yml up -d`。
5. 执行数据库迁移：`npm.cmd run prisma:deploy` 或在 API 镜像内执行等价命令。
6. 验证健康检查：`https://api.example.com/api/v1/health` 和 `https://ai.example.com/health`。

## 回滚流程

- 应用回滚：把镜像标签切回上一个已验证版本后执行 `docker compose -f infra/compose/docker-compose.prod.yml up -d`。
- 数据回滚：仅在确认迁移不可逆且业务允许丢弃新数据时，使用 `scripts/restore-postgres.ps1` 从备份恢复。
- 回滚后必须重新验证 Web、Admin、API、AI 健康检查和核心登录流程。

## 备份与恢复

- 每日执行 `scripts/backup-postgres.ps1`，备份文件写入 `.backups` 或对象存储。
- 至少保留 7 天日备份和 4 周周备份。
- 每月至少演练一次恢复，确认备份文件可用。

## 监控与告警

- API、Web、Admin、AI 服务进程必须有存活告警。
- `5xx` 错误率、登录失败峰值、OTP 请求峰值、数据库连接失败、AI provider 不可用必须进入告警。
- 日志不得输出 access token、refresh token、SMTP 密码、OpenAI key、身体数据明细。

## 发布验收

- 公开站：登录、建档、今日计划、打卡、周复盘、AI 助手、个人中心、隐私政策、用户协议、数据删除说明。
- 后台：登录、权限校验、模板管理、食品库、反馈、商品管理。
- 安全：Swagger 生产默认关闭，Cookie 为 HttpOnly，CORS 只允许正式域名。
