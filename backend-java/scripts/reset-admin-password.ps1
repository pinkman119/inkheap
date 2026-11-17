# Reset an admin password to a known value (BCrypt, same format as the Node backend).
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\reset-admin-password.ps1 -Username admin -Password 'NewPass123'
param(
    [Parameter(Mandatory = $true)][string]$Username,
    [Parameter(Mandatory = $true)][string]$Password
)

$ErrorActionPreference = 'Stop'

$javaHome = 'D:\Java\jdk-21.0.13.0.2+1'
$psql = 'D:\pgsql16\pgsql\bin\psql.exe'
$dbUser = 'postgres'
$dbPass = 'postgres'
$dbName = 'personal_profile'

# 1) 用 hutool 生成 BCrypt 哈希（$2a$，Spring Security / bcryptjs 均可校验）
$hutool = (Get-ChildItem "$env:USERPROFILE\.m2\repository\cn\hutool" -Recurse -Filter 'hutool-all-*.jar' |
    Select-Object -First 1).FullName
if (-not $hutool) { throw 'hutool-all jar not found in ~/.m2, build the project first' }

$scriptPath = Join-Path $env:TEMP 'inkheap-hash.jsh'
$escapedPassword = $Password.Replace('\', '\\').Replace('"', '\"')
[System.IO.File]::WriteAllText($scriptPath,
    "System.out.println(`"HASH=`" + cn.hutool.crypto.digest.BCrypt.hashpw(`"$escapedPassword`"));`n/exit`n",
    (New-Object System.Text.UTF8Encoding($false)))

$output = & (Join-Path $javaHome 'bin\jshell.exe') --class-path $hutool -q $scriptPath
Remove-Item $scriptPath -Force -ErrorAction SilentlyContinue
$match = [regex]::Match(($output -join "`n"), 'HASH=(\S+)')
if (-not $match.Success) { throw "hash generation failed: $output" }
$hash = $match.Groups[1].Value

# 2) 更新库里对应账号（账号不存在时直接报错，避免静默失败）
$env:PGPASSWORD = $dbPass
$sql = "UPDATE admin_users SET password = '$hash', updated_at = now() WHERE username = '$Username';"
$result = & $psql -h 127.0.0.1 -U $dbUser -d $dbName -t -A -c $sql
Write-Host "[reset] UPDATE affected rows: $($result.Trim())"
Write-Host "[reset] username=$Username password reset done"
