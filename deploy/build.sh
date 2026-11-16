#!/bin/sh
# INKHEAP 本地构建脚本：构建镜像 + 导出部署包到 deploy/ 目录
#
# 用法（本地开发机上执行，需已安装 Docker）：
#   sh deploy/build.sh           # 只导出前后端；基础镜像 tar 已存在则跳过
#   sh deploy/build.sh --all     # 强制全量导出（含 pgvector / redis）
#
# 完成后把整个 deploy/ 目录传到服务器，在服务器上执行 sh deploy.sh 即可一键启动
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# 是否强制全量导出基础镜像
FORCE_ALL="no"
[ "$1" = "--all" ] && FORCE_ALL="yes"

# 检测可用的 compose 命令（插件版或独立版）
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "[build] 错误：未找到 docker compose（插件或独立版）" >&2
    exit 1
fi

# 计算需要拉取 / 导出的基础镜像（tar 已存在则跳过，体积大且很少变动）
PULL_LIST=""
NEED_PG="yes"
NEED_REDIS="yes"

if [ "$FORCE_ALL" = "no" ]; then
    [ -f deploy/pgvector-pg16.tar ]   && NEED_PG="no"
    [ -f deploy/redis-7-alpine.tar ]  && NEED_REDIS="no"
fi

[ "$NEED_PG" = "yes" ]    && PULL_LIST="$PULL_LIST postgres"
[ "$NEED_REDIS" = "yes" ] && PULL_LIST="$PULL_LIST redis"

if [ -n "$PULL_LIST" ]; then
    echo "[build] 拉取基础镜像（$PULL_LIST）..."
    $COMPOSE pull $PULL_LIST 2>/dev/null || true
else
    echo "[build] 基础镜像 tar 已存在，跳过拉取"
fi

echo "[build] 构建 backend / frontend 镜像..."
$COMPOSE build

echo "[build] 导出前后端镜像到 deploy/ ..."
docker save -o deploy/inkheap-backend.tar  inkheap-backend:latest
docker save -o deploy/inkheap-frontend.tar inkheap-frontend:latest

# 基础镜像：仅首次或 --all 时导出
if [ "$NEED_PG" = "yes" ]; then
    echo "[build] 导出 pgvector 镜像..."
    docker save -o deploy/pgvector-pg16.tar pgvector/pgvector:pg16
else
    echo "[build] pgvector-pg16.tar 已存在，跳过导出"
fi

if [ "$NEED_REDIS" = "yes" ]; then
    echo "[build] 导出 redis 镜像..."
    docker save -o deploy/redis-7-alpine.tar redis:7-alpine
else
    echo "[build] redis-7-alpine.tar 已存在，跳过导出"
fi

echo "[build] 复制 docker-compose.yml ..."
cp docker-compose.yml deploy/docker-compose.yml

echo ""
echo "[build] 完成！deploy/ 目录内容："
ls -lh deploy/
echo ""
echo "下一步："
echo "  1. 把整个 deploy/ 目录传到服务器，例如："
echo "       scp -r deploy user@your-server:/opt/inkheap"
echo "  2. 在服务器上执行："
echo "       cd /opt/inkheap && sh deploy.sh"
