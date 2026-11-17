# Local PostgreSQL 16 + pgvector helper (Windows portable install).
# Install root : D:\pgsql16\pgsql
# Data dir     : D:\pgsql16\data
# Log file     : D:\pgsql16\logs\server.log
# Endpoint     : 127.0.0.1:5432  user=postgres  password=postgres  db=personal_profile
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-db.ps1 start
#   powershell -ExecutionPolicy Bypass -File scripts\dev-db.ps1 init
#   powershell -ExecutionPolicy Bypass -File scripts\dev-db.ps1 status
#   powershell -ExecutionPolicy Bypass -File scripts\dev-db.ps1 stop
param(
    [ValidateSet('start', 'stop', 'restart', 'status', 'init')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$PgHome = 'D:\pgsql16\pgsql'
$PgData = 'D:\pgsql16\data'
$PgPort = 5432
$DbUser = 'postgres'
$DbPass = 'postgres'
$DbName = 'personal_profile'
$SchemaFile = Join-Path $PSScriptRoot '..\src\main\resources\db\schema.sql'
$DataFile = Join-Path $PSScriptRoot '..\..\db\data.sql'

$Bin = Join-Path $PgHome 'bin'
$Psql = Join-Path $Bin 'psql.exe'
$PgCtl = Join-Path $Bin 'pg_ctl.exe'
$env:PGPASSWORD = $DbPass

function Test-Server {
    & (Join-Path $Bin 'pg_isready.exe') -h 127.0.0.1 -p $PgPort *> $null
    return $LASTEXITCODE -eq 0
}

switch ($Action) {
    'start' {
        if (Test-Server) { Write-Host '[pg] already running on 127.0.0.1:5432'; break }
        New-Item -ItemType Directory -Force -Path 'D:\pgsql16\logs' | Out-Null
        & $PgCtl -D $PgData -l 'D:\pgsql16\logs\server.log' start
        Start-Sleep -Seconds 3
        if (Test-Server) { Write-Host '[pg] started 127.0.0.1:5432' } else { Write-Host '[pg] start failed, see D:\pgsql16\logs\server.log' }
    }
    'stop' {
        & $PgCtl -D $PgData -m fast stop
    }
    'restart' {
        if (Test-Server) { & $PgCtl -D $PgData -m fast stop }
        Start-Sleep -Seconds 2
        & $PgCtl -D $PgData -l 'D:\pgsql16\logs\server.log' start
    }
    'status' {
        if (Test-Server) { Write-Host '[pg] running 127.0.0.1:5432' } else { Write-Host '[pg] stopped' }
    }
    'init' {
        if (-not (Test-Server)) { throw 'PostgreSQL is not running, run start first' }
        Write-Host "[pg] recreating database $DbName ..."
        & (Join-Path $Bin 'dropdb.exe') -h 127.0.0.1 -p $PgPort -U $DbUser --if-exists $DbName
        & (Join-Path $Bin 'createdb.exe') -h 127.0.0.1 -p $PgPort -U $DbUser $DbName
        Write-Host '[pg] creating tables from schema.sql ...'
        & $Psql -h 127.0.0.1 -p $PgPort -U $DbUser -d $DbName -q -v ON_ERROR_STOP=1 -f (Resolve-Path $SchemaFile)
        if (Test-Path $DataFile) {
            Write-Host '[pg] importing db/data.sql ...'
            & $Psql -h 127.0.0.1 -p $PgPort -U $DbUser -d $DbName -q -v ON_ERROR_STOP=1 -f (Resolve-Path $DataFile)
        }
        else {
            Write-Host "[pg] $DataFile not found, skip data import"
        }
        & $Psql -h 127.0.0.1 -p $PgPort -U $DbUser -d $DbName -c 'select relname, n_live_tup from pg_stat_user_tables order by relname;'
    }
}
