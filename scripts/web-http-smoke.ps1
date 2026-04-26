$ErrorActionPreference = 'Stop'

function Assert-StatusCode {
  param(
    [string]$Url,
    [int]$Expected = 200
  )

  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
  if ($response.StatusCode -ne $Expected) {
    throw "Unexpected status for ${Url}: $($response.StatusCode)"
  }
}

Assert-StatusCode 'http://127.0.0.1:3200/login'
Assert-StatusCode 'http://127.0.0.1:3200/check-in'
Assert-StatusCode 'http://127.0.0.1:3200/review'
Assert-StatusCode 'http://127.0.0.1:3200/assistant'
Assert-StatusCode 'http://127.0.0.1:3200/status'

$apiHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/health' -Method Get -TimeoutSec 5
$aiHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/health' -Method Get -TimeoutSec 5

$requestCode = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/auth/email/request-code' -Method Post -ContentType 'application/json' -Body (@{ email = 'web-http-smoke@campusfit.local' } | ConvertTo-Json)
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/auth/email/verify-code' -Method Post -ContentType 'application/json' -Body (@{ email = 'web-http-smoke@campusfit.local'; code = $requestCode.data.devCode } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.data.accessToken)" }
$todayDate = (Get-Date).ToString('yyyy-MM-dd')

$null = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/profiles/onboarding' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
  gender = 'male'
  birthYear = 2004
  heightCm = 181
  currentWeightKg = 78
  targetType = 'cut'
  activityLevel = 'moderate'
  trainingExperience = 'beginner'
  trainingDaysPerWeek = 4
  dietScene = 'canteen'
  dietPreferences = @('high_protein')
  dietRestrictions = @()
  supplementOptIn = $true
} | ConvertTo-Json -Depth 6)

$today = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/today?date=$todayDate" -Method Get -Headers $headers
$checkIn = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/check-ins' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{
  dailyPlanId = $today.data.dailyPlanId
  checkinDate = $todayDate
  dietCompletionRate = 85
  trainingCompletionRate = 90
  waterIntakeMl = 2200
  stepCount = 9800
  weightKg = 77.6
  energyLevel = 4
  satietyLevel = 4
  fatigueLevel = 2
  note = 'web-http-smoke'
} | ConvertTo-Json -Depth 6)
$review = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/weekly-reviews/generate' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ weekStartDate = '2026-03-30' } | ConvertTo-Json)
$conversation = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/ai/conversations' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ title = 'web-http-smoke'; context = @{ dailyPlanId = $today.data.dailyPlanId; dietPlanId = $today.data.dietPlan.id; trainingPlanId = $today.data.trainingPlan.id } } | ConvertTo-Json -Depth 6)
$message = Invoke-RestMethod -Uri ("http://127.0.0.1:3000/api/v1/ai/conversations/$($conversation.data.id)/messages") -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ content = 'How should I execute the plan today?' } | ConvertTo-Json)

[ordered]@{
  api = $apiHealth.data.service
  apiDataMode = $apiHealth.data.dataMode
  authEmailProvider = $apiHealth.data.authEmail.provider
  authEmailReady = $apiHealth.data.authEmail.ready
  ai = $aiHealth.data.service
  aiProvider = $aiHealth.data.provider
  aiProviderReady = $aiHealth.data.providerReady
  dailyPlanId = $today.data.dailyPlanId
  checkedIn = [bool]$checkIn.data.record.id
  weeklyReviewId = $review.data.id
  assistantPreview = $message.data.assistantMessage.content.Substring(0, [Math]::Min(60, $message.data.assistantMessage.content.Length))
} | ConvertTo-Json -Depth 6