<!-- managed-by: setup-rtk-project -->
# RTK 项目级配置

当前仓库在 Windows + Codex 环境下使用仓库内的 RTK 包装脚本，避免全局目录中的二进制因沙箱限制无法直接执行，同时将统计数据库写入仓库内的 `.rtk/history.db`。

## Windows 限制

RTK 在当前原生 Windows 环境下只适合代理真实可执行文件，不适合代理 PowerShell 别名或内建命令。

适合走 RTK：

```powershell
git
npm
pnpm
cargo
pytest
python
docker
kubectl
rg
```

不要走 RTK：

```powershell
ls
dir
cat
type
Get-ChildItem
Get-Content
Select-String
```

遇到 PowerShell 内建命令时直接原样执行。遇到真实可执行文件且输出可能较大时，优先走 RTK。

## 规则

在仓库根目录下，优先使用下面这个包装脚本：

```powershell
.\rtk.cmd <原命令>
```

如果当前目录不是仓库根目录，则使用绝对路径：

```powershell
& 'E:\Ai jjfajgsw\jianshenapp\third_party\rtk\rtk-local.cmd' <原命令>
```

常见示例：

```powershell
.\rtk.cmd git status
.\rtk.cmd git diff
.\rtk.cmd npm run build
.\rtk.cmd cargo test
.\rtk.cmd pytest -q
.\rtk.cmd docker ps
.\rtk.cmd rg "pattern" .
```

## 元命令

```powershell
.\rtk.cmd gain
.\rtk.cmd gain --history
.\rtk.cmd proxy <cmd>
```

## 验证

```powershell
.\rtk.cmd --version
.\rtk.cmd git status
.\rtk.cmd gain
```
