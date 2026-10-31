#!/bin/sh
#
# INKHEAP 数据恢复脚本（本地数据 → 正式服）
# ===============================================================
# 作用：清空目标数据库 public schema 下的全部表，再导入同目录的
#       data.sql（本地库 pg_dump --data-only 导出），实现数据整体移植。
#
# 用法：
#   sh restore.sh          # 交互确认后执行
#   sh restore.sh -y       # 跳过确认，直接执行
#
# 可选环境变量：
#   CONTAINER    目标 Postgres 容器名，默认 inkheap-postgres
#   DB_USER      数据库用户，默认 postgres
#   DB_NAME      数据库名，默认 personal_profile
#   DB_PASSWORD  数据库密码（容器内 socket 连接通常无需；走 TCP 时必填）
#   DATA_FILE    数据文件路径，默认同目录 data.sql
#   PGHOST/PGPORT  非 Docker 场景（本机 psql 直连）使用，默认 localhost/5432
#
# 前置条件：
#   目标库表结构已存在（由 deploy.sh 启动后端时的 prisma db push + pgvector-init 建好）。
#   非 Prisma 管理的表（如 schema_migrations）由本脚本自动补齐。
#
# data.sql 如何生成的（如需重新导出，在项目根目录执行）：
#   docker exec inkheap-postgres sh -c "pg_dump -U postgres -d personal_profile \
#     --data-only --no-owner --no-privileges --schema=public -f /tmp/inkheap_data.sql"
#   docker cp inkheap-postgres:/tmp/inkheap_data.sql db/data.sql
#   docker exec inkheap-postgres rm -f /tmp/inkheap_data.sql
#
# ⚠️ 本脚本会清空目标库现有数据，执行前请确认已有备份。
# ===============================================================
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

DATA_FILE=${DATA_FILE:-"$SCRIPT_DIR/data.sql"}
CONTAINER=${CONTAINER:-inkheap-postgres}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-personal_profile}
PGHOST=${PGHOST:-localhost}
PGPORT=${PGPORT:-5432}

AUTO_YES=0
while [ $# -gt 0 ]; do
    case "$1" in
        -y|--yes) AUTO_YES=1 ;;
        -h|--help)
            echo "用法: sh restore.sh [-y]"
            echo "  清空目标库并导入同目录 data.sql（详见脚本头部注释）"
            exit 0
            ;;
        *)
            echo "[restore] 错误：未知参数 $1" >&2
            exit 1
            ;;
    esac
    shift
done

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

# ---------- 1. 选择连接方式 ----------
MODE=""
if command -v docker >/dev/null 2>&1 && \
   docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    MODE="docker"
elif command -v psql >/dev/null 2>&1; then
    MODE="local"
else
    echo "[restore] 错误：未找到运行中的容器 $CONTAINER，且本机没有 psql 客户端。" >&2
    echo "          请确认目标数据库容器已启动（docker compose ps）。" >&2
    exit 1
fi

# psql 统一入口：run_psql [额外参数...]，SQL 从 stdin 读取
run_psql() {
    if [ "$MODE" = "docker" ]; then
        docker exec -i "$CONTAINER" \
            psql -v ON_ERROR_STOP=1 "$@" -U "$DB_USER" -d "$DB_NAME"
    else
        PGPASSWORD=${DB_PASSWORD:-} psql -v ON_ERROR_STOP=1 "$@" \
            -h "$PGHOST" -p "$PGPORT" -U "$DB_USER" -d "$DB_NAME"
    fi
}

# ---------- 2. 前置检查 ----------
if [ ! -f "$DATA_FILE" ]; then
    echo "[restore] 错误：找不到数据文件 $DATA_FILE" >&2
    exit 1
fi

if [ "$MODE" = "docker" ]; then
    echo "[restore] 目标数据库: $DB_NAME (容器 $CONTAINER, user=$DB_USER)"
else
    echo "[restore] 目标数据库: $DB_NAME (psql $PGHOST:$PGPORT, user=$DB_USER)"
fi
echo "[restore] 数据文件  : $DATA_FILE ($(wc -c < "$DATA_FILE" | tr -d ' ') bytes)"

# 依赖后端启动流程建表的表，必须先存在
MISSING_DDL=""
for t in admin_users dl_vectors; do
    found=$(echo "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$t';" | run_psql -tA)
    if [ "$found" != "1" ]; then
        MISSING_DDL="$MISSING_DDL $t"
    fi
done

if [ -n "$MISSING_DDL" ]; then
    echo "[restore] 错误：目标库缺少表结构（缺失:$MISSING_DDL）。" >&2
    echo "          请先执行 deploy.sh 启动后端，等待 prisma db push + pgvector-init 完成建表。" >&2
    exit 1
fi

# ---------- 3. 补齐非 Prisma 管理的表 ----------
# schema_migrations 由 backend-node/prisma/migrate-view-count.ts 在运行时用
# CREATE TABLE IF NOT EXISTS 建出来，不属于 Prisma schema，因此 prisma db push
# 永远不会在正式服创建它；而 data.sql 里带有它的数据。这里按同样的 DDL 补齐，
# 保证「阅读量回填迁移已执行」这条标记能被一起恢复，避免正式服重复跑该迁移。
ENSURE_SQL=$(cat <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL
)
echo "[restore] 补齐非 Prisma 管理的表 (schema_migrations)..."
printf '%s\n' "$ENSURE_SQL" | run_psql

# ---------- 4. 校验 data.sql 涉及的建表在目标库都存在 ----------
# 提前比对，避免导入到一半才报 "relation does not exist"（虽然有事务回滚）
echo "SELECT tablename FROM pg_tables WHERE schemaname='public';" | run_psql -tA \
    | tr -d '\r' | LC_ALL=C sort -u > "$WORKDIR/target_tables.txt"

awk '/^COPY public\./ { t = $2; sub(/^public\./, "", t); print t }' "$DATA_FILE" \
    | tr -d '\r' | LC_ALL=C sort -u > "$WORKDIR/dump_tables.txt"

LC_ALL=C comm -13 "$WORKDIR/target_tables.txt" "$WORKDIR/dump_tables.txt" > "$WORKDIR/dump_only.txt"

if [ -s "$WORKDIR/dump_only.txt" ]; then
    echo "[restore] 错误：data.sql 中有表在目标库不存在：" >&2
    while IFS= read -r t; do
        [ -n "$t" ] && echo "            - $t" >&2
    done < "$WORKDIR/dump_only.txt"
    echo "          请先让目标库建成这些表，或在 data.sql 中移除对应的 COPY 段后再导入。" >&2
    exit 1
fi

# ---------- 5. 二次确认 ----------
if [ "$AUTO_YES" -ne 1 ]; then
    echo ""
    echo "[restore] ⚠️  即将清空 $DB_NAME 的全部数据，并导入本地数据快照。"
    echo "          该操作不可逆，建议先备份："
    echo "          docker exec $CONTAINER pg_dump -U $DB_USER $DB_NAME > backup_\$(date +%F_%H%M).sql"
    printf "[restore] 确认继续？[y/N] "
    read -r ans
    case "$ans" in
        y|Y|yes|YES) ;;
        *) echo "[restore] 已取消"; exit 0 ;;
    esac
fi

# ---------- 6. 清空 + 导入（同一事务，任一步失败自动回滚） ----------
# 动态清空 public 下所有表；RESTART IDENTITY 重置自增，CASCADE 处理外键
TRUNCATE_SQL=$(cat <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
  END LOOP;
END
$$;
SQL
)

echo "[restore] 清空目标库所有表并导入数据..."
{
    printf '%s\n' "$TRUNCATE_SQL"
    cat "$DATA_FILE"
} | run_psql -1

# ---------- 7. 结果汇总 ----------
echo "[restore] 完成，当前各表行数："
cat <<'SQL' | run_psql -q
DO $$
DECLARE r RECORD; n BIGINT;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LOOP
    EXECUTE 'SELECT count(*) FROM public.' || quote_ident(r.tablename) INTO n;
    RAISE NOTICE '  % = %', r.tablename, n;
  END LOOP;
END
$$;
SQL

echo "[restore] 数据移植完成。"
