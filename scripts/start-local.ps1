param(
  [switch]$NoOpen,
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Get-EnvValue {
  param(
    [string]$Key,
    [string]$Fallback
  )

  $value = [Environment]::GetEnvironmentVariable($Key)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($Key, 'User')
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = [Environment]::GetEnvironmentVariable($Key, 'Machine')
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    $envFile = Join-Path $root '.env'
    if (Test-Path -LiteralPath $envFile) {
      $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^${Key}=" } | Select-Object -First 1
      if ($line) {
        $value = $line.Substring($Key.Length + 1).Trim()
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Fallback
  }

  return $value
}

$apiHost = Get-EnvValue -Key 'API_HOST' -Fallback '127.0.0.1'
$apiPort = [int](Get-EnvValue -Key 'API_PORT' -Fallback '3050')
$webPort = [int](Get-EnvValue -Key 'WEB_PORT' -Fallback '3200')
$aiHost = Get-EnvValue -Key 'AI_SERVICE_HOST' -Fallback '127.0.0.1'
$aiPort = [int](Get-EnvValue -Key 'AI_SERVICE_PORT' -Fallback '8001')
$apiHealthUrl = "http://${apiHost}:${apiPort}/api/v1/health"
$webUrl = "http://127.0.0.1:${webPort}"
$docsUrl = "http://${apiHost}:${apiPort}/docs"
$aiHealthUrl = "http://${aiHost}:${aiPort}/health"
$edgeProfileDir = Join-Path $root '.tmp/edge-local-profile'
$rebuiltServices = [System.Collections.Generic.HashSet[string]]::new()

function Test-HttpOk {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Get-ApiDataMode {
  param([string]$Url)

  try {
    $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5
    return $response.data.dataMode
  }
  catch {
    return $null
  }
}

function Get-EdgeExecutable {
  $candidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Get-ListeningProcessId {
  param([int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($connection) {
    return $connection.OwningProcess
  }

  $netstatLines = netstat -ano | Select-String -Pattern (":$Port\\s+.*LISTENING\\s+(\\d+)$")
  if ($netstatLines) {
    $match = [regex]::Match($netstatLines[0].Line, '(\\d+)$')
    if ($match.Success) {
      return [int]$match.Groups[1].Value
    }
  }

  return $null
}

function Stop-ListeningProcess {
  param(
    [int]$Port,
    [string]$ServiceName
  )

  $listeningPid = Get-ListeningProcessId -Port $Port
  if (-not $listeningPid) {
    return
  }

  if ($listeningPid -eq $PID) {
    throw "$ServiceName port $Port is owned by the current script."
  }

  Write-Host "[$ServiceName] Releasing port $Port from process $listeningPid..." -ForegroundColor Yellow
  Stop-Process -Id $listeningPid -Force -ErrorAction Stop
  Start-Sleep -Seconds 2
}

function Wait-HttpReady {
  param(
    [string]$ServiceName,
    [string]$Url,
    [int]$Retries = 40,
    [int]$DelaySeconds = 1
  )

  for ($index = 0; $index -lt $Retries; $index++) {
    if (Test-HttpOk -Url $Url) {
      Write-Host "[$ServiceName] Ready: $Url" -ForegroundColor Green
      return
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  throw "$ServiceName start timeout: $Url"
}

function Test-RebuildRequired {
  param(
    [string]$Workdir,
    [string]$ArtifactPath
  )

  if (-not (Test-Path -LiteralPath $ArtifactPath)) {
    return $true
  }

  $artifactTime = (Get-Item -LiteralPath $ArtifactPath).LastWriteTimeUtc
  $latestSource = Get-ChildItem -Path $Workdir -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\.next\\|\\.turbo\\' } |
    Sort-Object -Property LastWriteTimeUtc -Descending |
    Select-Object -First 1

  if (-not $latestSource) {
    return $false
  }

  return $latestSource.LastWriteTimeUtc -gt $artifactTime
}

function Ensure-BuildArtifacts {
  param(
    [string]$ServiceName,
    [string]$Workdir,
    [string]$ArtifactPath
  )

  if ((-not $Rebuild) -and (-not (Test-RebuildRequired -Workdir $Workdir -ArtifactPath $ArtifactPath))) {
    return
  }

  Write-Host "[$ServiceName] Preparing build artifacts..." -ForegroundColor Cyan
  Push-Location $Workdir
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      throw "$ServiceName build failed."
    }
    [void]$rebuiltServices.Add($ServiceName)
  }
  finally {
    Pop-Location
  }
}

function Ensure-LocalDatabase {
  Write-Host "[DB] Initializing local PostgreSQL and schema..." -ForegroundColor Cyan
  Push-Location $root
  try {
    & npm.cmd run db:init
    if ($LASTEXITCODE -ne 0) {
      throw 'Local database initialization failed.'
    }
  }
  finally {
    Pop-Location
  }
}

function Start-ManagedService {
  param(
    [string]$ServiceName,
    [string]$Workdir,
    [string]$StartupCommand,
    [int]$Port,
    [string]$HealthUrl,
    [string]$DesiredDataMode
  )

  if (Test-HttpOk -Url $HealthUrl) {
    if ($rebuiltServices.Contains($ServiceName)) {
      Write-Host "[$ServiceName] Rebuilt in current run, restarting to load latest artifacts." -ForegroundColor Yellow
    }
    elseif ($DesiredDataMode) {
      $currentDataMode = Get-ApiDataMode -Url $HealthUrl
      if ($currentDataMode -eq $DesiredDataMode) {
        Write-Host "[$ServiceName] Already running in $DesiredDataMode mode, skipping start." -ForegroundColor DarkGreen
        return
      }

      Write-Host "[$ServiceName] Running in $currentDataMode mode, restarting into $DesiredDataMode mode." -ForegroundColor Yellow
    }
    else {
      Write-Host "[$ServiceName] Already running, skipping start." -ForegroundColor DarkGreen
      return
    }
  }

  $listeningPid = Get-ListeningProcessId -Port $Port
  if ($listeningPid) {
    Stop-ListeningProcess -Port $Port -ServiceName $ServiceName
  }

  Write-Host "[$ServiceName] Starting..." -ForegroundColor Cyan
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d `"$Workdir`" && $StartupCommand" -WindowStyle Minimized | Out-Null
  Wait-HttpReady -ServiceName $ServiceName -Url $HealthUrl
}

$apiWorkdir = Join-Path $root 'apps/api'
$webWorkdir = Join-Path $root 'apps/web'
$aiWorkdir = Join-Path $root 'apps/ai-service'

if (Get-ListeningProcessId -Port $apiPort) {
  Stop-ListeningProcess -Port $apiPort -ServiceName 'API'
}

Ensure-LocalDatabase
Ensure-BuildArtifacts -ServiceName 'API' -Workdir $apiWorkdir -ArtifactPath (Join-Path $apiWorkdir 'dist/apps/api/src/main.js')
Ensure-BuildArtifacts -ServiceName 'Web' -Workdir $webWorkdir -ArtifactPath (Join-Path $webWorkdir '.next/BUILD_ID')

Start-ManagedService -ServiceName 'AI' -Workdir $aiWorkdir -StartupCommand "python -m uvicorn app.main:app --host $aiHost --port $aiPort" -Port $aiPort -HealthUrl $aiHealthUrl
Start-ManagedService -ServiceName 'API' -Workdir $apiWorkdir -StartupCommand 'set API_DATA_MODE=database && npm.cmd run start' -Port $apiPort -HealthUrl $apiHealthUrl -DesiredDataMode 'database'
Start-ManagedService -ServiceName 'Web' -Workdir $webWorkdir -StartupCommand 'npm.cmd run start' -Port $webPort -HealthUrl $webUrl

function Open-LocalUrl {
  param([string]$Url)

  try {
    $edgeExecutable = Get-EdgeExecutable
    if ($edgeExecutable) {
      New-Item -ItemType Directory -Path $edgeProfileDir -Force | Out-Null
      Start-Process -FilePath $edgeExecutable -ArgumentList @("--user-data-dir=`"$edgeProfileDir`"", $Url) | Out-Null
      return
    }

    Start-Process $Url | Out-Null
  }
  catch {
    Write-Warning "Open failed, visit manually: $Url"
  }
}

Write-Host ''
Write-Host 'Local services are ready:' -ForegroundColor Green
Write-Host "- AI: $aiHealthUrl"
Write-Host "- Web: $webUrl"
Write-Host "- API: $apiHealthUrl"
Write-Host "- Swagger: $docsUrl"

if (-not $NoOpen) {
  Open-LocalUrl -Url $webUrl
  Open-LocalUrl -Url $docsUrl
}
