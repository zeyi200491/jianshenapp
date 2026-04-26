# RTK Rule Exception Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 RTK 使用规则，避免在 PowerShell 内建命令上错误套用 `rtk`。

**Architecture:** 保留 `rtk` 作为外部可执行文件的默认前缀策略，同时在规则文件中显式排除 PowerShell 内建命令、别名、脚本块与管道表达式。这样能兼顾 token 优化和命令可执行性。

**Tech Stack:** Markdown、PowerShell、Codex 规则文件

---

### Task 1: 更新 RTK 规则说明

**Files:**
- Modify: `C:\Users\19577\.codex\RTK.md`
- Note: `docs/superpowers/plans/2026-04-18-rtk-rule-exception.md`

- [ ] **Step 1: 读取现有规则文件**

Run: `Get-Content -Path 'C:\Users\19577\.codex\RTK.md' -Raw`
Expected: 返回当前 RTK 使用说明，包含“Always prefix shell commands with rtk”。

- [ ] **Step 2: 更新规则文本**

将规则调整为：

```md
## Rule

Use `rtk` for real external executables when available.

Do not force `rtk` onto PowerShell built-in commands, aliases, script blocks, or pipeline expressions.

Preferred with `rtk`: `git`, `npm`, `pytest`, `cargo`, `docker`, `rg`
Usually without `rtk`: `Get-Content`, `Get-ChildItem`, `Select-Object`, `Where-Object`, `ForEach-Object`
```

- [ ] **Step 3: 增补示例与校验说明**

补充两组示例：

```bash
rtk git status
rtk npm run build
rtk pytest -q
rtk cargo test
rtk docker ps
rtk rg "hooks.json"
```

```powershell
Get-Content -Path '.codex\hooks.json' -Raw
Get-ChildItem -Path . -Filter hooks.json -Recurse -File
```

并把校验改成同时检查：

```powershell
rtk --version
Get-Command rtk
```

- [ ] **Step 4: 复查文件内容**

Run: `Get-Content -Path 'C:\Users\19577\.codex\RTK.md' -Raw`
Expected: 新规则明确区分外部可执行文件与 PowerShell 内建命令。
