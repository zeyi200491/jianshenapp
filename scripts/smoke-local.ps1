$ErrorActionPreference = 'Stop'

$nodeCommand = (Get-Command node -ErrorAction Stop).Source
$pythonCommand = (Get-Command python -ErrorAction Stop).Source
$root = Split-Path -Parent $PSScriptRoot

if (Test-Path Env:PATH) {
  Remove-Item Env:PATH -ErrorAction SilentlyContinue
}

if (-not $env:API_DATA_MODE) { $env:API_DATA_MODE = 'database' }
if (-not $env:AI_SERVICE_BASE_URL) { $env:AI_SERVICE_BASE_URL = 'http://127.0.0.1:8001' }

if ($env:API_DATA_MODE -ne 'mock') {
  & $nodeCommand (Join-Path $root 'scripts\db-init.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $nodeCommand (Join-Path $root 'scripts\db-seed.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$api = $null
$ai = $null

function Wait-HttpJson {
  param([string]$Url,[int]$Retries = 20,[int]$DelaySeconds = 1)
  for ($i = 0; $i -lt $Retries; $i++) {
    try { return Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5 } catch { Start-Sleep -Seconds $DelaySeconds }
  }
  throw "Timed out waiting for service: $Url"
}

try {
  $ai = Start-Process $pythonCommand -ArgumentList '-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8001' -WorkingDirectory (Join-Path $root 'apps\ai-service') -PassThru
  $api = Start-Process $nodeCommand -ArgumentList 'apps/api/node_modules/ts-node/dist/bin.js','apps/api/src/main.ts' -WorkingDirectory $root -PassThru

  $aiHealth = Wait-HttpJson -Url 'http://127.0.0.1:8001/health'
  $apiHealth = Wait-HttpJson -Url 'http://127.0.0.1:3000/api/v1/health'

  $requestCode = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/auth/email/request-code' -Method Post -ContentType 'application/json' -Body (@{ email = 'smoke@campusfit.local' } | ConvertTo-Json)
  $login = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/auth/email/verify-code' -Method Post -ContentType 'application/json' -Body (@{ email = 'smoke@campusfit.local'; code = $requestCode.data.devCode } | ConvertTo-Json)
  $headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
  $todayDate = (Get-Date).ToString('yyyy-MM-dd')

  $null = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/profiles/onboarding' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    gender = 'male'; birthYear = 2003; heightCm = 178; currentWeightKg = 76; targetType = 'cut'; activityLevel = 'moderate'; trainingExperience = 'beginner'; trainingDaysPerWeek = 4; dietScene = 'canteen'; dietPreferences = @('high_protein'); dietRestrictions = @(); supplementOptIn = $true
  } | ConvertTo-Json -Depth 5)

  $generate = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/plans/generate' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ date = $todayDate; force = $true } | ConvertTo-Json)
  $today = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/today?date=$todayDate" -Method Get -Headers $headers
  $dailyPlanId = $today.data.dailyPlanId
  $dietPlanId = $today.data.dietPlan.id
  $trainingPlanId = $today.data.trainingPlan.id

  $null = Invoke-RestMethod -Uri ('http://127.0.0.1:3000/api/v1/diet-plans/' + $dietPlanId) -Method Get -Headers $headers
  $null = Invoke-RestMethod -Uri ('http://127.0.0.1:3000/api/v1/training-plans/' + $trainingPlanId) -Method Get -Headers $headers
  $products = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/products?category=supplement' -Method Get -Headers $headers
  $null = Invoke-RestMethod -Uri ('http://127.0.0.1:3000/api/v1/products/' + $products.data.products[0].id) -Method Get -Headers $headers

  $null = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/check-ins' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
    dailyPlanId = $dailyPlanId; checkinDate = $todayDate; dietCompletionRate = 88; trainingCompletionRate = 80; waterIntakeMl = 2400; stepCount = 9200; weightKg = 75.6; energyLevel = 4; satietyLevel = 4; fatigueLevel = 2; note = 'smoke-local'
  } | ConvertTo-Json -Depth 5)
  $todayAfter = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/today?date=$todayDate" -Method Get -Headers $headers
  $review = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/weekly-reviews/generate' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ weekStartDate = '2026-03-30' } | ConvertTo-Json)
  $conversation = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/ai/conversations' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ title = 'smoke-local'; context = @{ dailyPlanId = $dailyPlanId; dietPlanId = $dietPlanId; trainingPlanId = $trainingPlanId } } | ConvertTo-Json -Depth 5)
  $message = Invoke-RestMethod -Uri ("http://127.0.0.1:3000/api/v1/ai/conversations/$($conversation.data.id)/messages") -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ content = 'How should I execute the plan today?' } | ConvertTo-Json)

  [ordered]@{
    apiDataMode = $apiHealth.data.dataMode
    aiProvider = $aiHealth.data.provider
    authMode = 'email_otp'
    dailyPlanId = $generate.data.dailyPlanId
    dietMeals = $today.data.dietPlan.meals.Count
    trainingItems = $today.data.trainingPlan.items.Count
    productCount = $products.data.products.Count
    hasCheckedInAfter = $todayAfter.data.checkInStatus.hasCheckedIn
    weeklyReviewId = $review.data.id
    aiAnswerPreview = $message.data.assistantMessage.content.Substring(0, [Math]::Min(80, $message.data.assistantMessage.content.Length))
  } | ConvertTo-Json -Depth 6
}
finally {
  if ($api -and !$api.HasExited) { Stop-Process -Id $api.Id -Force }
  if ($ai -and !$ai.HasExited) { Stop-Process -Id $ai.Id -Force }
}