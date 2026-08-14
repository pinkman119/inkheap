# 前台知识库页 —— 后端接口冒烟测试 (PowerShell)
# 校验：列表筛选（分类多值 + 搜索 + 组合）、动态列表两页预加载 / 触底翻页（20 条/页）
param(
  [string]$Base = "http://localhost:3000/api/articles"
)

$PASS = 0; $FAIL = 0
function Assert($desc, $cond) {
  if ($cond) { Write-Host "PASS  $desc"; $global:PASS++ }
  else { Write-Host "FAIL  $desc"; $global:FAIL++ }
}
function GetJson($url) {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
  return ($r.Content | ConvertFrom-Json)
}

Write-Host "===== 1. 全量已发布总数（应 >=40，支撑动态分页） ====="
$ALL = GetJson "$Base`?pageSize=200"
$TOTAL = $ALL.total
Assert "published total >= 40 (got: $TOTAL)" ($TOTAL -ge 40)

Write-Host "===== 2. 动态列表分页：page1/2/3 各 20 条，由近及远，无重复 ====="
$P1 = GetJson "$Base`?page=1&pageSize=20"
$P2 = GetJson "$Base`?page=2&pageSize=20"
$P3 = GetJson "$Base`?page=3&pageSize=20"
$L1 = $P1.items.Count; $L2 = $P2.items.Count; $L3 = $P3.items.Count
Assert "page1 items=20 (got: $L1)" ($L1 -eq 20)
Assert "page2 items=20 (got: $L2)" ($L2 -eq 20)
Assert "page3 items=20 (got: $L3)" ($L3 -eq 20)

$D1 = [DateTime]::Parse($P1.items[0].createdAt)
$LAST1 = [DateTime]::Parse($P1.items[19].createdAt)
$FIRST2 = [DateTime]::Parse($P2.items[0].createdAt)
Assert "page1 内 createdAt 递减 ($($D1) >= $($LAST1))" ($D1 -ge $LAST1)
Assert "page1 末条 >= page2 首条 ($($LAST1) >= $($FIRST2))" ($LAST1 -ge $FIRST2)

$slugs = @{}
$dup = 0
foreach ($it in ($P1.items + $P2.items + $P3.items)) {
  if ($slugs.ContainsKey($it.slug)) { $dup++ } else { $slugs[$it.slug] = 1 }
}
Assert "三页 slug 无重复 (dup=$dup)" ($dup -eq 0)
Assert "totalPages >= 3 (got: $($P1.totalPages))" ($P1.totalPages -ge 3)

Write-Host "===== 3. 分类多值筛选：categoryKey=ai 子孙集合 ====="
$CK = "ai-spec-openspec,ai-spec-doc,ai-deploy-infer"
$CAT = GetJson "$Base`?pageSize=100&categoryKey=$CK"
$set = $CK.Split(',')
$bad = 0
foreach ($it in $CAT.items) { if (-not $set.Contains($it.categoryKey)) { $bad++ } }
Assert "分类多值筛选命中 > 0 (got: $($CAT.items.Count))" ($CAT.items.Count -gt 0)
Assert "分类筛选结果均属集合内 (bad=$bad)" ($bad -eq 0)

Write-Host "===== 4. 关键词搜索：search=MySQL ====="
$S = GetJson "$Base`?pageSize=100&search=MySQL"
$hit = 0
foreach ($it in $S.items) {
  $blob = (($it.title) + ($it.summary) + ($it.tags)).ToLower()
  if ($blob.Contains("mysql")) { $hit++ }
}
Assert "搜索 MySQL 命中 > 0 (got: $($S.items.Count))" ($S.items.Count -gt 0)
Assert "搜索结果均含关键词 (ok=$($S.items.Count -eq $hit))" ($S.items.Count -eq $hit)

Write-Host "===== 5. 分类 + 搜索 组合取交集 ====="
$COMBO = GetJson "$Base`?pageSize=100&categoryKey=$CK&search=openSpec"
$ok = $true
foreach ($it in $COMBO.items) {
  $blob = (($it.title) + ($it.summary) + ($it.tags)).ToLower()
  if (-not $set.Contains($it.categoryKey) -or -not $blob.Contains("openspec")) { $ok = $false }
}
Assert "组合筛选命中 >= 0 (got: $($COMBO.items.Count))" ($COMBO.items.Count -ge 0)
Assert "组合结果同时满足条件 (ok=$ok)" ($ok)

Write-Host "===== 6. 公开接口仅返回已发布（status 不可越权） ====="
# 传 status=draft 应被忽略，返回数与全量已发布一致，且不含草稿 slug
$DRAFT = GetJson "$Base`?pageSize=100&status=draft"
$DRAFT_TOTAL = $DRAFT.total
$draftSlugs = @('mock-draft-0','mock-draft-1','mock-draft-2','mock-draft-3','mock-draft-4')
$leaked = 0
foreach ($it in $DRAFT.items) { if ($draftSlugs -contains $it.slug) { $leaked++ } }
Assert "公开接口忽略 draft，返回数=全量已发布 (draft total=$DRAFT_TOTAL, allPublished total=$TOTAL)" ($DRAFT_TOTAL -eq $TOTAL)
Assert "公开接口未泄漏草稿 (leaked=$leaked)" ($leaked -eq 0)

Write-Host ""
Write-Host "===== RESULT: PASS=$PASS FAIL=$FAIL ====="
if ($FAIL -eq 0) { exit 0 } else { exit 1 }
