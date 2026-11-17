# Build helper: always uses JDK 21 + Maven installed under D:\Java.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\build.ps1              # mvn -B -DskipTests package
#   powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Goals "compile"
#   powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Goals "spring-boot:run"
param(
    [string]$Goals = '-DskipTests package'
)

$ErrorActionPreference = 'Stop'

$env:JAVA_HOME = 'D:\Java\jdk-21.0.13.0.2+1'
$env:Path = "$env:JAVA_HOME\bin;D:\Java\apache-maven-3.9.9\bin;$env:Path"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $projectRoot
try {
    $arguments = @('-B') + $Goals.Split(' ')
    & 'D:\Java\apache-maven-3.9.9\bin\mvn.cmd' @arguments
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
