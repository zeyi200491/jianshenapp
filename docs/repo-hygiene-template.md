# 仓库清洁与分支防护模板

这份模板用于解决两个高频问题：

1. 主分支工作区被直接开发改脏
2. 测试产物、日志文件、旧 worktree 目录残留在仓库里

当前仓库已经落地以下防护，后续新项目可以原样复制。

## 目标

- 主工作区默认只做集成，不做日常开发
- 开发前强制切功能分支或 worktree
- 提交前阻止把常见测试产物和本地产物带进 Git
- 推送前要求工作区干净
- 提供统一的自检与清理入口

## 已落地的文件

- `.githooks/pre-commit`
- `.githooks/pre-push`
- `scripts/repo-guard.mjs`
- `scripts/install-git-guards.ps1`
- `package.json` 中的 `guard:*` 脚本
- `.gitignore` 中的本地产物忽略规则

## 当前仓库的使用方式

首次启用：

```bash
npm run guard:install
```

或在 Windows 上：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-git-guards.ps1
```

日常自检：

```bash
npm run guard:check
```

清理常见产物：

```bash
npm run guard:clean
```

## 行为说明

### pre-commit

- 禁止直接在 `main` / `master` 上做普通提交
- 允许在受保护分支上完成 merge commit
- 阻止提交这些常见本地产物：
  - `test-results/`
  - `playwright-report/`
  - `coverage/`
  - `logs/`
  - `output/`
  - `.local/`
  - `.logs/`
  - `.tmp/`
  - `apps/web/test-results/`
  - `apps/ai-service/logs/`

### pre-push

- 推送前要求工作区干净
- 推送前要求没有常见本地产物残留

### repo-guard check

输出这些信息：

- 当前分支
- 是否受保护分支
- 工作区是否干净
- worktree 列表
- 常见产物残留
- 本地服务端口 `8001 / 3050 / 3200` 是否仍在监听

### repo-guard clean

清理这些常见路径：

- `apps/ai-service/logs`
- `apps/web/playwright-report`
- `apps/web/test-results`
- `playwright-report`
- `test-results`
- `coverage`
- `output`
- `logs`

## 推荐开发纪律

### 主工作区纪律

- 主工作区只做 `pull / merge / push`
- 不在主工作区直接写业务代码
- 不在主工作区做临时实验

### 分支纪律

- 每个任务从功能分支开始
- 长任务优先使用 worktree
- 不允许“先在 main 改，稍后再切分支”

### worktree 清理纪律

删除 worktree 前固定按这个顺序执行：

1. 停掉该 worktree 拉起的服务进程
2. 运行 `npm run guard:check`
3. 确认没有端口和日志文件占用
4. 删除 worktree
5. 删除已合并分支

## 复制到其他项目

复制这些内容即可：

1. `.githooks/`
2. `scripts/repo-guard.mjs`
3. `scripts/install-git-guards.ps1`
4. `package.json` 中的 `guard:install`、`guard:check`、`guard:clean`
5. `.gitignore` 中对应的本地产物规则

复制后执行：

```bash
npm run guard:install
```

如果新项目端口或产物目录不同，只需要调整 `scripts/repo-guard.mjs` 里的：

- `WATCH_PORTS`
- `KNOWN_ARTIFACT_PATHS`
- `FORBIDDEN_STAGE_PATTERNS`
- `PROTECTED_BRANCHES`

## 适用边界

这套模板能显著降低主分支被污染的概率，但它不是替代工程纪律的万能锁。

它能防住：

- 在 `main` 上误提交
- 把常见测试产物提交进仓库
- 推送时带着脏工作区
- 清理前忘记检查残留

它不能完全替代：

- 正确的分支策略
- 对运行中进程的主动管理
- 对不同项目目录结构的定制化调整
