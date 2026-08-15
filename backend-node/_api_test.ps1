$ErrorActionPreference = 'Stop'
$login = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/auth/login' -Method Post -Body (@{ username = 'admin'; password = 'admin123' } | ConvertTo-Json) -ContentType 'application/json'
$h = @{ Authorization = "Bearer $($login.accessToken)" }

$content = @{
  profile = @{ avatarText = '测'; name = 'TestV2'; handle = 't'; tagline = 't'; heroInfo = 'x' }
  info    = @()
  education = @{ school = ''; period = ''; major = '' }
  certificates = @()
  about   = @{ leads = @(); callout = '' }
  techCategories = @()
  projects = @()
  experiences = @()
}

$c = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/resume' -Method Post -Headers $h -Body (@{ name = 'V2'; content = $content } | ConvertTo-Json -Depth 6) -ContentType 'application/json'
Write-Output "CREATE id=$($c.id) active=$($c.isActive)"

$act = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/resume/$($c.id)/activate" -Method Put -Headers $h
Write-Output "ACTIVATE active=$($act.isActive)"

$pub = Invoke-RestMethod -Uri 'http://localhost:3000/api/public/resume'
Write-Output "PUBLIC name=$($pub.content.profile.name)"

# revert to first version
$v1 = (Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/resume' -Headers $h)[0]
$act2 = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/resume/$($v1.id)/activate" -Method Put -Headers $h
Write-Output "REVERT id=$($act2.id) active=$($act2.isActive)"

$pub2 = Invoke-RestMethod -Uri 'http://localhost:3000/api/public/resume'
Write-Output "PUBLIC2 name=$($pub2.content.profile.name)"

# delete v2
$del = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/resume/$($c.id)" -Method Delete -Headers $h
Write-Output "DELETE success=$($del.success)"

# try delete active -> should fail
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/admin/resume/$($v1.id)" -Method Delete -Headers $h | Out-Null
  Write-Output 'DELETE_ACTIVE: UNEXPECTED SUCCESS'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Output "DELETE_ACTIVE rejected code=$code"
}

# unauthorized check
try {
  Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/resume' | Out-Null
  Write-Output 'UNAUTH: UNEXPECTED SUCCESS'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Output "UNAUTH rejected code=$code"
}
