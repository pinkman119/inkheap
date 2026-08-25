$p = Get-CimInstance Win32_Process -Filter "ProcessId = 15252"
if ($p) {
  Write-Host ("FOUND: " + $p.Name + " :: " + $p.CommandLine)
  # 仅当它是 node/nest 后端进程才结束
  if ($p.Name -eq 'node.exe' -and $p.CommandLine -match 'nest|main') {
    taskkill /PID 15252 /F
    Write-Host "STOPPED_15252"
  } else {
    Write-Host "NOT_A_BACKEND_PROCESS"
  }
} else {
  Write-Host "PID_15252_NOT_FOUND"
}
