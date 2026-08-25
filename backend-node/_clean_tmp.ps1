$dir = "c:\Users\admin\Desktop\inkheap\backend-node\node_modules\.prisma\client"
Get-ChildItem $dir -Filter "*.tmp*" | Remove-Item -Force
$bak = Join-Path $dir "query_engine-windows.dll.node.bak"
if (Test-Path $bak) { Remove-Item $bak -Force }
Write-Host "CLEANED"
Get-ChildItem $dir -Filter "query_engine*" | Select-Object Name
