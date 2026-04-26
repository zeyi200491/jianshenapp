# Clean Browser Start Local Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `start-local.cmd` 默认在服务启动完成后，用隔离的 Edge profile 打开本地网页，规避缓存、扩展和站点数据导致的白屏。

**Architecture:** 保持现有 `start-local.ps1` 的服务启动链不变，只增强“打开本地 URL”的最后一步。脚本优先探测本机 Edge，命中后使用项目内固定的 `.tmp/edge-local-profile` 作为隔离浏览器配置目录；若未安装 Edge，则回退到系统默认浏览器。

**Tech Stack:** PowerShell、Windows `Start-Process`、Node `node:test`

---

### Task 1: 收紧脚本行为测试

**Files:**
- Modify: `tests/start-local.test.mjs`
- Modify: `tests/start-local-smoke.mjs`

- [x] **Step 1: 写失败测试，表达新默认行为**
- [x] **Step 2: 运行 `node --test tests/start-local.test.mjs`，确认旧脚本不满足新断言**
- [x] **Step 3: 修正旧的硬编码端口断言，让测试只验证真实意图**

### Task 2: 增强 start-local 的浏览器打开逻辑

**Files:**
- Modify: `scripts/start-local.ps1`

- [x] **Step 1: 增加 Edge 可执行文件探测函数**
- [x] **Step 2: 增加固定隔离 profile 目录 `.tmp/edge-local-profile`**
- [x] **Step 3: 让 `Open-LocalUrl` 默认优先使用 `--user-data-dir` 打开本地地址**
- [x] **Step 4: 保留无 Edge 时回退到系统默认浏览器**

### Task 3: 新鲜验证

**Files:**
- Verify only

- [x] **Step 1: 运行 `node --test tests/start-local.test.mjs`，确认定向测试通过**
- [x] **Step 2: 运行 `node tests/start-local-smoke.mjs`，确认 smoke 断言通过**
- [x] **Step 3: 实际执行 `.\start-local.cmd -NoOpen` 与 `.\start-local.cmd`，确认服务仍正常，且默认会拉起隔离 Edge**
