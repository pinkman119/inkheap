# Run helper: starts the packaged jar on port 3000 with logs under logs\.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1          # start
#   powershell -ExecutionPolicy Bypass -File scripts\run.ps1 -Stop    # stop process on port 3000
param(
    [switch]$Stop,
    [string]$Profile = 'dev'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $projectRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$jar = Join-Path $projectRoot 'target\inkheap-java-1.0.0.jar'

function Get-PortOwner {
    (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess |
        Select-Object -First 1
}

if ($Stop) {
    $owner = Get-PortOwner
    if ($owner) {
        Stop-Process -Id $owner -Force
        Write-Host "[run] stopped process $owner on port 3000"
    }
    else {
        Write-Host '[run] nothing listening on port 3000'
    }
    exit 0
}

$existing = Get-PortOwner
if ($existing) {
    Write-Host "[run] port 3000 already in use by process $existing (use -Stop first)"
    exit 1
}

if (-not (Test-Path $jar)) {
    Write-Host "[run] jar not found: $jar (run scripts\build.ps1 first)"
    exit 1
}

$java = 'D:\Java\jdk-21.0.13.0.2+1\bin\java.exe'
$process = Start-Process -FilePath $java `
    -ArgumentList '-jar', $jar, "--spring.profiles.active=$Profile" `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput (Join-Path $logDir 'app.out.log') `
    -RedirectStandardError (Join-Path $logDir 'app.err.log') `
    -NoNewWindow -PassThru

Write-Host "[run] started pid=$($process.Id), logs: $logDir\app.out.log"
