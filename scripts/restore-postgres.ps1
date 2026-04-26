param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$Container = "jianshenapp-postgres-1"
)

$ErrorActionPreference = "Stop"
$resolvedBackup = Resolve-Path -LiteralPath $BackupPath

Get-Content -Encoding Byte -Path $resolvedBackup | docker exec -i $Container pg_restore -U $env:POSTGRES_USER -d $env:POSTGRES_DB --clean --if-exists
Write-Host "Postgres restore completed from $resolvedBackup"
