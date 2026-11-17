# Admin smoke test: logs in, then checks the admin endpoints (read-only).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\smoke-admin.ps1 [-Base http://localhost:3000]
param(
    [string]$Base = 'http://localhost:3000',
    [string]$Username = 'admin',
    [string]$Password = 'admin123'
)

$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json -Compress
$loginFile = [System.IO.Path]::GetTempFileName()
# 必须写无 BOM 的 UTF-8：带 BOM 时 Jackson 解析请求体会失败
[System.IO.File]::WriteAllText($loginFile, $loginBody, (New-Object System.Text.UTF8Encoding($false)))

$loginRaw = & curl.exe -s -X POST ($Base + '/api/admin/auth/login') -H 'Content-Type: application/json' --data-binary ('@' + $loginFile)
Remove-Item $loginFile -Force
Write-Host ("login => " + ($loginRaw -replace '\s+', ' ').Substring(0, [Math]::Min(120, $loginRaw.Length)))

$token = $null
if ($loginRaw -match '"accessToken"\s*:\s*"([^"]+)"') { $token = $Matches[1] }
if (-not $token) { Write-Host 'login failed, stop'; exit 1 }

$paths = @(
    '/api/admin/auth/me',
    '/api/admin/articles?status=all&page=1&pageSize=2',
    '/api/admin/xiaoji?page=1&pageSize=2',
    '/api/admin/categories',
    '/api/admin/categories/recent',
    '/api/admin/footer-links',
    '/api/admin/footer-config',
    '/api/admin/home-page',
    '/api/admin/site-config',
    '/api/admin/resume',
    '/api/admin/about/profile',
    '/api/admin/about/footprints',
    '/api/admin/contact?page=1&pageSize=2',
    '/api/admin/contact/stats',
    '/api/admin/comments?page=1&pageSize=2',
    '/api/admin/friend-links',
    '/api/admin/friend-applications',
    '/api/admin/friend-applications/stats',
    '/api/admin/dashboard/stats',
    '/api/admin/dashboard/article-ranking',
    '/api/admin/dashboard/visits-trend?period=7',
    '/api/admin/dashboard/visit-logs',
    '/api/admin/dashboard/users',
    '/api/admin/users',
    '/api/admin/digital-life/models',
    '/api/admin/digital-life/personas',
    '/api/admin/digital-life/training/article?page=1&pageSize=2',
    '/api/admin/digital-life/sessions?page=1&pageSize=2'
)

foreach ($path in $paths) {
    $tmp = [System.IO.Path]::GetTempFileName()
    $status = & curl.exe -s -o $tmp -w '%{http_code}' -H ("Authorization: Bearer " + $token) ($Base + $path)
    $preview = (Get-Content $tmp -Raw -ErrorAction SilentlyContinue)
    if ($preview) { $preview = $preview.Substring(0, [Math]::Min(90, $preview.Length)) }
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    Write-Host ("{0,4}  {1}  {2}" -f $status, $path, ($preview -replace '\s+', ' '))
}

# 404 message contract
$tmp = [System.IO.Path]::GetTempFileName()
$status = & curl.exe -s -o $tmp -w '%{http_code}' ($Base + '/api/articles/slug/not-exists')
$body = Get-Content $tmp -Raw
Remove-Item $tmp -Force
Write-Host ("{0,4}  /api/articles/slug/not-exists  {1}" -f $status, ($body -replace '\s+', ' '))
