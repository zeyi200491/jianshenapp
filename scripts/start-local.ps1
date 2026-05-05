param(
  [switch]$NoOpen,
  [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'

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

function Set-ProcessEnvValue {
  param(
    [string]$Key,
    [string]$Value
  )

  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    Set-Item -Path "Env:$Key" -Value $Value
  }
}

function New-DevJwtSecret {
  return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

function New-DevServiceToken {
  return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

function New-DevAdminPassword {
  return "Dev!" + [guid]::NewGuid().ToString('N').Substring(0, 16) + "9a"
}

$generatedJwtSecret = $false
$generatedAiServiceAuthToken = $false
$generatedAdminPassword = $false

$apiHost = Get-EnvValue -Key 'API_HOST' -Fallback '127.0.0.1'
$apiPort = [int](Get-EnvValue -Key 'API_PORT' -Fallback '3050')
$webPort = [int](Get-EnvValue -Key 'WEB_PORT' -Fallback '3200')
$aiHost = Get-EnvValue -Key 'AI_SERVICE_HOST' -Fallback '127.0.0.1'
$aiPort = [int](Get-EnvValue -Key 'AI_SERVICE_PORT' -Fallback '8001')
$nodeEnv = Get-EnvValue -Key 'NODE_ENV' -Fallback 'development'
$jwtSecret = Get-EnvValue -Key 'JWT_SECRET' -Fallback ''
$aiServiceAuthToken = Get-EnvValue -Key 'AI_SERVICE_AUTH_TOKEN' -Fallback ''
$databaseUrl = Get-EnvValue -Key 'DATABASE_URL' -Fallback "postgresql://campusfit:campusfit_dev@127.0.0.1:5432/campusfit_ai"
$postgresHost = Get-EnvValue -Key 'POSTGRES_HOST' -Fallback '127.0.0.1'
$postgresPort = Get-EnvValue -Key 'POSTGRES_PORT' -Fallback '5432'
$postgresUser = Get-EnvValue -Key 'POSTGRES_USER' -Fallback 'campusfit'
$postgresPassword = Get-EnvValue -Key 'POSTGRES_PASSWORD' -Fallback 'campusfit_dev'
$postgresDb = Get-EnvValue -Key 'POSTGRES_DB' -Fallback 'campusfit_ai'
$aiServiceBaseUrl = Get-EnvValue -Key 'AI_SERVICE_BASE_URL' -Fallback "http://${aiHost}:${aiPort}"
$adminEmail = Get-EnvValue -Key 'ADMIN_EMAIL' -Fallback 'admin@campusfit.local'
$adminPassword = Get-EnvValue -Key 'ADMIN_PASSWORD' -Fallback ''
$apiHealthUrl = "http://${apiHost}:${apiPort}/api/v1/health"
$webUrl = "http://127.0.0.1:${webPort}"
$docsUrl = "http://${apiHost}:${apiPort}/docs"
$aiHealthUrl = "http://${aiHost}:${aiPort}/health"
$webApiBaseUrl = "http://${apiHost}:${apiPort}/api/v1"
$edgeProfileDir = Join-Path $root '.tmp/edge-local-profile'
$rebuiltServices = [System.Collections.Generic.HashSet[string]]::new()

if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
  $jwtSecret = New-DevJwtSecret
  $generatedJwtSecret = $true
}

if ([string]::IsNullOrWhiteSpace($aiServiceAuthToken)) {
  $aiServiceAuthToken = New-DevServiceToken
  $generatedAiServiceAuthToken = $true
}

if ($aiServiceAuthToken -eq $jwtSecret) {
  $aiServiceAuthToken = New-DevServiceToken
  $generatedAiServiceAuthToken = $true
}

if ([string]::IsNullOrWhiteSpace($adminPassword)) {
  $adminPassword = New-DevAdminPassword
  $generatedAdminPassword = $true
}

Set-ProcessEnvValue -Key 'NODE_ENV' -Value $nodeEnv
Set-ProcessEnvValue -Key 'API_HOST' -Value $apiHost
Set-ProcessEnvValue -Key 'API_PORT' -Value "$apiPort"
Set-ProcessEnvValue -Key 'WEB_PORT' -Value "$webPort"
Set-ProcessEnvValue -Key 'AI_SERVICE_HOST' -Value $aiHost
Set-ProcessEnvValue -Key 'AI_SERVICE_PORT' -Value "$aiPort"
Set-ProcessEnvValue -Key 'AI_SERVICE_BASE_URL' -Value $aiServiceBaseUrl
Set-ProcessEnvValue -Key 'AI_SERVICE_AUTH_TOKEN' -Value $aiServiceAuthToken
Set-ProcessEnvValue -Key 'JWT_SECRET' -Value $jwtSecret
Set-ProcessEnvValue -Key 'DATABASE_URL' -Value $databaseUrl
Set-ProcessEnvValue -Key 'POSTGRES_HOST' -Value $postgresHost
Set-ProcessEnvValue -Key 'POSTGRES_PORT' -Value $postgresPort
Set-ProcessEnvValue -Key 'POSTGRES_USER' -Value $postgresUser
Set-ProcessEnvValue -Key 'POSTGRES_PASSWORD' -Value $postgresPassword
Set-ProcessEnvValue -Key 'POSTGRES_DB' -Value $postgresDb
Set-ProcessEnvValue -Key 'ADMIN_EMAIL' -Value $adminEmail
Set-ProcessEnvValue -Key 'ADMIN_PASSWORD' -Value $adminPassword

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

function ConvertTo-CmdEnvPrefix {
  param([hashtable]$EnvironmentOverrides)

  if (-not $EnvironmentOverrides -or $EnvironmentOverrides.Count -eq 0) {
    return ''
  }

  $segments = foreach ($entry in $EnvironmentOverrides.GetEnumerator()) {
    $rawValue = $entry.Value
    if ($null -eq $rawValue) {
      $rawValue = ''
    }

    $escapedValue = $rawValue.ToString().Replace('"', '\"')
    "set `"$($entry.Key)=$escapedValue`""
  }

  return ($segments -join ' && ')
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

function Get-ListeningProcessStartTimeUtc {
  param([int]$Port)

  $listeningPid = Get-ListeningProcessId -Port $Port
  if (-not $listeningPid) {
    return $null
  }

  try {
    return (Get-Process -Id $listeningPid -ErrorAction Stop).StartTime.ToUniversalTime()
  }
  catch {
    return $null
  }
}

function Get-FileWatchUtc {
  param([string[]]$Paths)

  $latestUtc = $null

  foreach ($path in $Paths) {
    if ([string]::IsNullOrWhiteSpace($path) -or (-not (Test-Path -LiteralPath $path))) {
      continue
    }

    $item = Get-Item -LiteralPath $path -ErrorAction Stop
    if ($item.PSIsContainer) {
      $latestChild = Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\__pycache__\\|\\.pytest_cache\\|\\.mypy_cache\\|\\logs\\' } |
        Sort-Object -Property LastWriteTimeUtc -Descending |
        Select-Object -First 1

      if ($latestChild -and (($latestUtc -eq $null) -or ($latestChild.LastWriteTimeUtc -gt $latestUtc))) {
        $latestUtc = $latestChild.LastWriteTimeUtc
      }

      continue
    }

    if (($latestUtc -eq $null) -or ($item.LastWriteTimeUtc -gt $latestUtc)) {
      $latestUtc = $item.LastWriteTimeUtc
    }
  }

  return $latestUtc
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
    [string]$ArtifactPath,
    [string]$FingerprintPath,
    [string]$Fingerprint
  )

  if (-not (Test-Path -LiteralPath $ArtifactPath)) {
    return $true
  }

  if ($FingerprintPath -and $Fingerprint) {
    if (-not (Test-Path -LiteralPath $FingerprintPath)) {
      return $true
    }

    $storedFingerprint = (Get-Content -LiteralPath $FingerprintPath -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($storedFingerprint -ne $Fingerprint) {
      return $true
    }
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
    [string]$ArtifactPath,
    [string]$FingerprintPath,
    [string]$Fingerprint,
    [hashtable]$EnvironmentOverrides,
    [string]$BuildCommand = 'npm.cmd run build'
  )

  if ((-not $Rebuild) -and (-not (Test-RebuildRequired -Workdir $Workdir -ArtifactPath $ArtifactPath -FingerprintPath $FingerprintPath -Fingerprint $Fingerprint))) {
    return
  }

  Write-Host "[$ServiceName] Preparing build artifacts..." -ForegroundColor Cyan
  $environmentPrefix = ConvertTo-CmdEnvPrefix -EnvironmentOverrides $EnvironmentOverrides
  $buildCommand = if ([string]::IsNullOrWhiteSpace($environmentPrefix)) {
    $BuildCommand
  } else {
    "$environmentPrefix && $BuildCommand"
  }

  Push-Location $Workdir
  try {
    & cmd.exe /d /s /c $buildCommand
    if ($LASTEXITCODE -ne 0) {
      throw "$ServiceName build failed."
    }

    if ($FingerprintPath -and $Fingerprint) {
      $fingerprintDirectory = Split-Path -Parent $FingerprintPath
      if (-not (Test-Path -LiteralPath $fingerprintDirectory)) {
        New-Item -ItemType Directory -Path $fingerprintDirectory -Force | Out-Null
      }

      Set-Content -LiteralPath $FingerprintPath -Value $Fingerprint -NoNewline
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
    [string]$DesiredDataMode,
    [hashtable]$EnvironmentOverrides,
    [string[]]$WatchFilePaths,
    [int]$StartupRetries = 40,
    [int]$StartupDelaySeconds = 1
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
    elseif ($WatchFilePaths) {
      $currentProcessStartTimeUtc = Get-ListeningProcessStartTimeUtc -Port $Port
      $latestWatchUtc = Get-FileWatchUtc -Paths $WatchFilePaths

      if ($currentProcessStartTimeUtc -and $latestWatchUtc -and ($latestWatchUtc -gt $currentProcessStartTimeUtc)) {
        Write-Host "[$ServiceName] Detected newer watched files, restarting to load latest changes." -ForegroundColor Yellow
      }
      else {
        Write-Host "[$ServiceName] Already running, skipping start." -ForegroundColor DarkGreen
        return
      }
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
  $environmentPrefix = ConvertTo-CmdEnvPrefix -EnvironmentOverrides $EnvironmentOverrides
  $startupSegments = @("cd /d `"$Workdir`"")
  if (-not [string]::IsNullOrWhiteSpace($environmentPrefix)) {
    $startupSegments += $environmentPrefix
  }
  $startupSegments += $StartupCommand
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', ($startupSegments -join ' && ') -WindowStyle Minimized | Out-Null
  Wait-HttpReady -ServiceName $ServiceName -Url $HealthUrl -Retries $StartupRetries -DelaySeconds $StartupDelaySeconds
}

$apiWorkdir = Join-Path $root 'apps/api'
$webWorkdir = Join-Path $root 'apps/web'
$aiWorkdir = Join-Path $root 'apps/ai-service'

if (Get-ListeningProcessId -Port $apiPort) {
  Stop-ListeningProcess -Port $apiPort -ServiceName 'API'
}

Ensure-LocalDatabase
Ensure-BuildArtifacts -ServiceName 'API' -Workdir $apiWorkdir -ArtifactPath (Join-Path $apiWorkdir 'dist/apps/api/src/main.js')
Ensure-BuildArtifacts `
  -ServiceName 'Web' `
  -Workdir $webWorkdir `
  -ArtifactPath (Join-Path $webWorkdir '.next/BUILD_ID') `
  -FingerprintPath (Join-Path $webWorkdir '.next/local-api-base.txt') `
  -Fingerprint $webApiBaseUrl `
  -EnvironmentOverrides @{ NEXT_PUBLIC_API_BASE_URL = $webApiBaseUrl } `
  -BuildCommand 'set NODE_ENV=production && npm.cmd run build'

Start-ManagedService -ServiceName 'AI' -Workdir $aiWorkdir -StartupCommand "python -m uvicorn app.main:app --host $aiHost --port $aiPort" -Port $aiPort -HealthUrl $aiHealthUrl -WatchFilePaths @($envFile, $aiWorkdir)
Start-ManagedService -ServiceName 'API' -Workdir $apiWorkdir -StartupCommand 'set API_DATA_MODE=database && node dist/apps/api/src/main.js' -Port $apiPort -HealthUrl $apiHealthUrl -DesiredDataMode 'database'
Start-ManagedService `
  -ServiceName 'Web' `
  -Workdir $webWorkdir `
  -StartupCommand 'set NODE_ENV=production && npm.cmd run start' `
  -Port $webPort `
  -HealthUrl $webUrl `
  -EnvironmentOverrides @{ NEXT_PUBLIC_API_BASE_URL = $webApiBaseUrl } `
  -WatchFilePaths @($envFile, (Join-Path $webWorkdir '.next/BUILD_ID'), (Join-Path $webWorkdir '.next/local-api-base.txt')) `
  -StartupRetries 90

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

if ($generatedJwtSecret) {
  Write-Host "- JWT_SECRET: auto-generated for this run" -ForegroundColor Yellow
}

if ($generatedAiServiceAuthToken) {
  Write-Host "- AI_SERVICE_AUTH_TOKEN: auto-generated for this run" -ForegroundColor Yellow
}

if ($generatedAdminPassword) {
  Write-Host "- ADMIN_EMAIL: $adminEmail" -ForegroundColor Yellow
  Write-Host "- ADMIN_PASSWORD: $adminPassword" -ForegroundColor Yellow
}

if (-not $NoOpen) {
  Open-LocalUrl -Url $webUrl
  Open-LocalUrl -Url $docsUrl
}
