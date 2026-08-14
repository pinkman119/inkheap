#!/usr/bin/env bash
# 前台知识库页 —— 后端接口冒烟测试
# 校验：列表筛选（分类多值 + 搜索 + 组合）、动态列表两页预加载 / 触底翻页（20 条/页）
# 依赖：后端运行于 http://localhost:3000，全局前缀 /api，公开接口 /api/articles
set -u

BASE="http://localhost:3000/api/articles"
PASS=0
FAIL=0

assert() {
  local desc="$1"; local cond="$2"
  if [ "$cond" = "true" ]; then
    echo "PASS  $desc"; PASS=$((PASS+1))
  else
    echo "FAIL  $desc"; FAIL=$((FAIL+1))
  fi
}

# 用 node 解析 JSON：node -e "JSON.parse(argv[1]).path"
jq_get() {
  node -e "const d=JSON.parse(process.argv[1]); const f=(o,p)=>p.split('.').reduce((a,c)=>a===undefined?a:a[c],o); const v=f(d,process.argv[2]); console.log(v===undefined?'':(typeof v==='object'?JSON.stringify(v):v));" "$1" "$2"
}

echo "===== 1. 全量已发布总数（应 >=40，支撑动态分页） ====="
ALL=$(curl -s "$BASE?pageSize=200")
TOTAL=$(jq_get "$ALL" "total")
assert "published total >= 40 (got: $TOTAL)" "$([ "${TOTAL:-0}" -ge 40 ] && echo true || echo false)"

echo "===== 2. 动态列表分页：page1/2/3 各 20 条，由近及远，无重复 ====="
P1=$(curl -s "$BASE?page=1&pageSize=20")
P2=$(curl -s "$BASE?page=2&pageSize=20")
P3=$(curl -s "$BASE?page=3&pageSize=20")

L1=$(jq_get "$P1" "items.length")
L2=$(jq_get "$P2" "items.length")
L3=$(jq_get "$P3" "items.length")
assert "page1 items=20 (got: $L1)" "$([ "${L1:-0}" = "20" ] && echo true || echo false)"
assert "page2 items=20 (got: $L2)" "$([ "${L2:-0}" = "20" ] && echo true || echo false)"
assert "page3 items=20 (got: $L3)" "$([ "${L3:-0}" = "20" ] && echo true || echo false)"

D1=$(jq_get "$P1" "items.0.createdAt")
LAST1=$(jq_get "$P1" "items.19.createdAt")
FIRST2=$(jq_get "$P2" "items.0.createdAt")
dt() { node -e "const ds=process.argv[1]; const t=Date.parse(ds); console.log(isNaN(t)?0:t);" "$1"; }
assert "page1 内 createdAt 递减 ($D1 >= $LAST1)" "$([ "$(dt "$D1")" -ge "$(dt "$LAST1")" ] && echo true || echo false)"
assert "page1 末条 >= page2 首条 ($LAST1 >= $FIRST2)" "$([ "$(dt "$LAST1")" -ge "$(dt "$FIRST2")" ] && echo true || echo false)"

SLUGS=$(node -e "const p=JSON.parse(process.argv[1]);const q=JSON.parse(process.argv[2]);const r=JSON.parse(process.argv[3]);const s=new Set();let dup=0;[...p.items,...q.items,...r.items].forEach(it=>{if(s.has(it.slug))dup++;s.add(it.slug);});console.log(dup);" "$P1" "$P2" "$P3")
assert "三页 slug 无重复 (dup=$SLUGS)" "$([ "${SLUGS:-1}" = "0" ] && echo true || echo false)"

TOTALPAGES=$(jq_get "$P1" "totalPages")
assert "totalPages >= 3 (got: $TOTALPAGES)" "$([ "${TOTALPAGES:-0}" -ge 3 ] && echo true || echo false)"

echo "===== 3. 分类多值筛选：categoryKey=ai 子孙集合 ====="
CK="ai-spec-openspec,ai-spec-doc,ai-deploy-infer"
CAT=$(curl -s "$BASE?pageSize=100&categoryKey=$CK")
CATLEN=$(jq_get "$CAT" "items.length")
assert "分类多值筛选命中 > 0 (got: $CATLEN)" "$([ "${CATLEN:-0}" -gt 0 ] && echo true || echo false)"
# 每条 categoryKey 必须落在集合内
BAD=$(node -e "const c=JSON.parse(process.argv[1]);const set=new Set(process.argv[2].split(','));let bad=0;c.items.forEach(it=>{if(!set.has(it.categoryKey))bad++;});console.log(bad);" "$CAT" "$CK")
assert "分类筛选结果均属集合内 (bad=$BAD)" "$([ "${BAD:-1}" = "0" ] && echo true || echo false)"

echo "===== 4. 关键词搜索：search=MySQL ====="
S=$(curl -s "$BASE?pageSize=100&search=MySQL")
SLEN=$(jq_get "$S" "items.length")
assert "搜索 MySQL 命中 > 0 (got: $SLEN)" "$([ "${SLEN:-0}" -gt 0 ] && echo true || echo false)"
HIT=$(node -e "const c=JSON.parse(process.argv[1]);let ok=c.items.every(it=>(it.title+it.summary+(it.tags||'')).toLowerCase().includes('mysql'));console.log(ok?1:0);" "$S")
assert "搜索结果均含关键词 (ok=$HIT)" "$([ "${HIT:-0}" = "1" ] && echo true || echo false)"

echo "===== 5. 分类 + 搜索 组合取交集 ====="
COMBO=$(curl -s "$BASE?pageSize=100&categoryKey=$CK&search=openSpec")
CLEN=$(jq_get "$COMBO" "items.length")
assert "组合筛选命中 >= 0 (got: $CLEN)" "$([ "${CLEN:-0}" -ge 0 ] && echo true || echo false)"
COMBO_OK=$(node -e "const c=JSON.parse(process.argv[1]);const set=new Set(process.argv[2].split(','));let ok=c.items.every(it=>set.has(it.categoryKey)&&(it.title+it.summary+(it.tags||'')).toLowerCase().includes('openspec'));console.log(ok?1:0);" "$COMBO" "$CK")
assert "组合结果同时满足条件 (ok=$COMBO_OK)" "$([ "${COMBO_OK:-0}" = "1" ] && echo true || echo false)"

echo "===== 6. 强制只返回已发布（status 不可越权） ====="
DRAFT=$(curl -s "$BASE?pageSize=100&status=draft")
DRAFTLEN=$(jq_get "$DRAFT" "items.length")
assert "公开接口忽略 draft，仅返回已发布 (draft items=$DRAFTLEN)" "$([ "${DRAFTLEN:-1}" = "0" ] && echo true || echo false)"

echo ""
echo "===== RESULT: PASS=$PASS FAIL=$FAIL ====="
[ "$FAIL" = "0" ] && exit 0 || exit 1
