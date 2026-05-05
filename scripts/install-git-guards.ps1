$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$nodeCommand = (Get-Command node -ErrorAction Stop).Source

& $nodeCommand (Join-Path $root 'scripts\repo-guard.mjs') 'install-hooks'
exit $LASTEXITCODE
