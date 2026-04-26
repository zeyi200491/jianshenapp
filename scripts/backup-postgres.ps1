param(
  [string]$OutputDir = ".backups",
  [string]$Container = "jianshenapp-postgres-1"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resolvedOutputDir = Resolve-Path -LiteralPath "." | ForEach-Object { Join-Path $_ $OutputDir }
New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null
$backupPath = Join-Path $resolvedOutputDir "campusfit-$timestamp.dump"

docker exec $Container pg_dump -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Fc | Set-Content -Encoding Byte -Path $backupPath
Write-Host "Postgres backup written to $backupPath"
