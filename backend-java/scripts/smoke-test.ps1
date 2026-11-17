# Smoke test: hits the public endpoints and reports HTTP status + short body preview.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\smoke-test.ps1 [-Base http://localhost:3000]
param(
    [string]$Base = 'http://localhost:3000'
)

$paths = @(
    '/api/public/home-page',
    '/api/public/footer-links',
    '/api/public/footer-config',
    '/api/public/resume',
    '/api/articles?page=1&pageSize=2',
    '/api/articles/feed',
    '/api/categories',
    '/api/categories/tree',
    '/api/xiaoji',
    '/api/xiaoji/stats',
    '/api/xiaoji/categories',
    '/api/about/profile',
    '/api/about/footprints',
    '/api/about/travels',
    '/api/about/events',
    '/api/public/friend-links?mode=work',
    '/api/public/friend-applications',
    '/api/public/comments?targetType=friends&targetId=00000000-0000-4000-8000-0000000000fd',
    '/api/feed.xml'
)

foreach ($path in $paths) {
    $tmp = [System.IO.Path]::GetTempFileName()
    $status = & curl.exe -s -o $tmp -w '%{http_code}' ($Base + $path)
    $preview = (Get-Content $tmp -Raw -ErrorAction SilentlyContinue)
    if ($preview) { $preview = $preview.Substring(0, [Math]::Min(90, $preview.Length)) }
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    Write-Host ("{0,4}  {1}  {2}" -f $status, $path, ($preview -replace '\s+', ' '))
}

# 401 check: admin endpoint without token
$status = & curl.exe -s -o NUL -w '%{http_code}' ($Base + '/api/admin/articles')
Write-Host ("{0,4}  /api/admin/articles (no token)" -f $status)
