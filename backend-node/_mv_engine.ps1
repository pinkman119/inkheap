$src = "c:\Users\admin\Desktop\inkheap\backend-node\node_modules\.prisma\client\query_engine-windows.dll.node"
$bak = "c:\Users\admin\Desktop\inkheap\backend-node\node_modules\.prisma\client\query_engine-windows.dll.node.bak"
try {
  if (Test-Path $bak) { Remove-Item $bak -Force }
  Move-Item -Path $src -Destination $bak -Force
  Write-Host "MOVED_OK"
} catch {
  Write-Host "MOVE_FAIL: $($_.Exception.Message)"
}
