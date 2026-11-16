#!/bin/sh
# INKHEAP 服务器一键部署脚本
#
# 用法：在 deploy 目录中执行
#   sh deploy.sh
#
# 功能：加载镜像 → 部署 HTTPS 证书 → 启动全部服务 → 等待就绪
set -e

cd "$(dirname "$0")"

# ---------- 1. 检查 Docker ----------
if ! command -v docker >/dev/null 2>&1; then
    echo "[deploy] 错误：未安装 Docker，请先安装" >&2
    exit 1
fi
echo "[deploy] Docker 版本: $(docker --version)"

if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "[deploy] 错误：未找到 docker compose（插件或独立版）" >&2
    exit 1
fi

# ---------- 2. 加载镜像 ----------
# 优先级：本地 tar → 服务器已有镜像 → 联网拉取
load_image() {
    tar="$1"
    image="$2"
    if [ -f "$tar" ]; then
        echo "[deploy] 加载镜像 $tar ..."
        docker load -i "$tar"
    elif docker image inspect "$image" >/dev/null 2>&1; then
        echo "[deploy] 服务器已存在镜像 $image，跳过加载"
    else
        echo "[deploy] $tar 未提供，尝试联网拉取 $image ..."
        docker pull "$image" || echo "[deploy] 警告：拉取 $image 失败，相关服务可能无法启动" >&2
    fi
}

load_image inkheap-backend.tar  inkheap-backend:latest
load_image inkheap-frontend.tar inkheap-frontend:latest
load_image pgvector-pg16.tar    pgvector/pgvector:pg16
load_image redis-7-alpine.tar   redis:7-alpine

# ---------- 3. 部署 HTTPS 证书（nginx 挂载 /etc/inkheap-certs） ----------
CERT_DIR=/etc/inkheap-certs
if [ -f fullchain.pem ] && [ -f privkey.key ]; then
    mkdir -p "$CERT_DIR"
    cp -f fullchain.pem privkey.key "$CERT_DIR/"
    chmod 644 "$CERT_DIR/fullchain.pem"
    chmod 600 "$CERT_DIR/privkey.key"
    echo "[deploy] HTTPS 证书已部署到 $CERT_DIR"
elif [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.key" ]; then
    echo "[deploy] 使用已存在于 $CERT_DIR 的证书"
else
    echo "[deploy] 错误：找不到证书（fullchain.pem / privkey.key）" >&2
    exit 1
fi

# ---------- 4. .env 提示 ----------
if [ ! -f .env ]; then
    echo "[deploy] 提示：未创建 .env，将使用默认 DB_PASSWORD / JWT_SECRET / APP_ENCRYPTION_KEY"
    echo "        生产环境建议在本目录创建 .env 覆盖后再启动"
fi

# ---------- 5. 启动服务 ----------
# 若 postgres/redis 容器已存在（容器名固定），复用旧容器与其数据卷（数据库数据不丢），
# 仅用新镜像重建前后端；否则全量启动。
OVERRIDE=docker-compose.override.yml
pg_exists=$(docker container inspect inkheap-postgres >/dev/null 2>&1 && echo yes || echo no)
rd_exists=$(docker container inspect inkheap-redis >/dev/null 2>&1 && echo yes || echo no)

if [ "$pg_exists" = "yes" ] && [ "$rd_exists" = "yes" ]; then
    echo "[deploy] 检测到已存在的 postgres/redis 容器，复用旧容器与数据卷（不动数据库）"
    for c in inkheap-postgres inkheap-redis; do
        state=$(docker inspect --format '{{.State.Status}}' "$c")
        if [ "$state" != "running" ]; then
            echo "[deploy] 启动已有容器 $c ..."
            docker start "$c" >/dev/null
        else
            echo "[deploy] $c 正在运行，跳过"
        fi
    done

    # 复用旧容器所在网络，并用容器名连接（跨 compose 项目无法用服务名解析）
    NET=$(docker inspect inkheap-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
    echo "[deploy] 前后端将加入网络 $NET"

    # 确定数据库密码：优先 .env → 其次旧 postgres 容器实际使用的密码 → 默认 postgres
    DBPASS=""
    if [ -f .env ]; then
        DBPASS=$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
    if [ -z "$DBPASS" ]; then
        DBPASS=$(docker inspect inkheap-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' \
            | grep -E '^POSTGRES_PASSWORD=' | cut -d= -f2-)
        if [ -n "$DBPASS" ]; then
            echo "[deploy] 已从旧 postgres 容器继承数据库密码"
        fi
    fi
    DBPASS=${DBPASS:-postgres}
    export DB_PASSWORD="$DBPASS"

    cat > "$OVERRIDE" <<EOF
services:
  backend:
    environment:
      DATABASE_URL: "postgresql://postgres:\${DB_PASSWORD}@inkheap-postgres:5432/personal_profile?schema=public"
      DB_HOST: inkheap-postgres
      REDIS_URL: "redis://inkheap-redis:6379"
networks:
  default:
    name: $NET
    external: true
EOF

    # 先用一次性容器将数据库结构与当前镜像的 Prisma schema 对齐（幂等）
    # --accept-data-loss：接受 schema 演进中的破坏性变更（删除废弃列/迁移元数据表等），
    # 部署前请先用 pg_dump 备份数据库
    echo "[deploy] 对齐数据库结构（prisma db push --accept-data-loss）..."
    docker run --rm --network "$NET" \
        --entrypoint npx \
        -e DATABASE_URL="postgresql://postgres:${DBPASS}@inkheap-postgres:5432/personal_profile?schema=public" \
        inkheap-backend:latest prisma db push --accept-data-loss \
        || echo "[deploy] 警告：prisma db push 失败，请查看上方报错" >&2

    # 旧前后端容器若存在需先移除（跨项目无法复用容器名）
    docker rm -f inkheap-backend inkheap-frontend >/dev/null 2>&1 || true
    echo "[deploy] 仅重建前后端容器..."
    $COMPOSE up -d --no-deps --no-build backend frontend

elif [ "$pg_exists" = "no" ] && [ "$rd_exists" = "no" ]; then
    rm -f "$OVERRIDE"
    echo "[deploy] 未检测到旧容器，全新启动全部服务..."
    $COMPOSE up -d --no-build

else
    echo "[deploy] 错误：inkheap-postgres 与 inkheap-redis 只存在其中一个，状态异常，请手动检查：" >&2
    echo "        docker ps -a | grep inkheap" >&2
    exit 1
fi

# ---------- 6. 等待后端健康检查通过 ----------
echo "[deploy] 等待后端就绪（首次启动约 30-60 秒：建表 + seed）..."
i=0
status=""
while [ "$i" -lt 60 ]; do
    status=$(docker inspect --format '{{.State.Health.Status}}' inkheap-backend 2>/dev/null || echo "")
    if [ "$status" = "healthy" ]; then
        echo "[deploy] 后端已就绪"
        break
    fi
    sleep 2
    i=$((i + 1))
done
if [ "$status" != "healthy" ]; then
    echo "[deploy] 警告：等待超时，可执行 $COMPOSE logs -f backend 查看日志排障"
fi

# ---------- 7. 部署结果汇总 ----------
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP" ] && IP="服务器IP"
echo ""
echo "=============================================="
echo "  INKHEAP 部署完成"
echo "=============================================="
echo "  前台首页 : https://$IP/"
echo "  后台管理 : https://$IP/#/admin/login"
echo "  账号     : admin / admin123"
echo "----------------------------------------------"
echo "  常用命令（在 deploy 目录执行）："
echo "    $COMPOSE ps            查看状态"
echo "    $COMPOSE logs -f       查看日志"
echo "    $COMPOSE down          停止前后端（不影响复用的 postgres/redis）"
echo "  注意：任何时候都不要执行 docker volume rm / down -v，数据库数据全在卷里"
echo "=============================================="
