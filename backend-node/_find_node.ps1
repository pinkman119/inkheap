Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'node.exe' -and (
    $_.CommandLine -match 'nest' -or
    $_.CommandLine -match 'start:dev' -or
    $_.CommandLine -match 'main.js'
  )
} | ForEach-Object {
  $_.ProcessId.ToString() + ' :: ' + $_.CommandLine
}
