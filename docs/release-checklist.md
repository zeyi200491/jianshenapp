# CampusFit AI 发布检查清单

## 1. 发布前

- [ ] `README.md` 已更新为当前网页启动方式。
- [ ] `.env.example` 与 `services/ai-service/.env.example` 与最新环境变量保持一致。
- [ ] `docs/progress.md`、`docs/decisions.md`、`docs/assumptions.md` 已同步本次改动。
- [ ] 本次变更范围、回滚方式与已知风险已明确记录。
- [ ] `docs/production-runbook.md` 已按当前部署域名、镜像标签、证书路径复核。
- [ ] `docs/compliance-data-policy.md` 已按当前运营主体和数据处理流程复核。

## 2. 代码与质量

- [ ] `pnpm lint` 通过。
- [ ] `pnpm test` 通过。
- [ ] `pnpm build` 通过。
- [ ] `pnpm --dir apps/api test -- --runInBand` 通过。
- [ ] `python -m pytest apps/ai-service/tests` 通过。
- [ ] `node apps/web/tests/smoke.test.mjs` 通过。
- [ ] 公开网页构建通过：`pnpm --filter web build`。
- [ ] 后台构建通过：`pnpm --filter admin build`。

## 3. 数据库与种子

- [ ] 数据库初始化脚本可重复执行。
- [ ] 种子脚本可重复执行且不会产生冲突。
- [ ] 若修改数据库结构，已同步更新相关文档与迁移说明。
- [ ] `scripts/backup-postgres.ps1` 已生成可恢复备份。
- [ ] `scripts/restore-postgres.ps1` 至少在非生产环境演练过一次。

## 4. 手工验收

- [ ] `GET /api/v1/health` 返回 200 且符合本次发布预期。
- [ ] `GET /health` 返回 200，AI 服务状态正常。
- [ ] 公开网页桌面端和移动端浏览器均可正常访问。
- [ ] 隐私政策、用户协议、数据删除说明页面可访问。
- [ ] 登录用户可在个人中心提交数据删除申请。
- [ ] README 中的本地启动步骤经过实际演练。
- [ ] 已知问题已确认不阻塞当前发布目标。

## 5. AI 与配置

- [ ] 已确认本次运行使用 `mock` 还是正式 `openai_compatible` provider。
- [ ] 若使用正式 provider，`AI_MODEL`、`AI_OPENAI_BASE_URL`、`AI_OPENAI_API_KEY` 已正确配置。
- [ ] 未在仓库中提交任何真实密钥。
- [ ] `SWAGGER_ENABLED=false` 或生产默认关闭已确认。
- [ ] `CORS_ORIGIN`、`AI_CORS_ORIGINS` 只包含正式域名。

## 6. 回滚准备

- [ ] 已确认本次是否变更数据库初始化脚本。
- [ ] 已确认种子数据变化可安全重放或忽略。
- [ ] 若上线后需快速回滚，已准备回滚提交或恢复方案。
