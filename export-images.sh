#!/bin/sh
# 导出 inkheap 镜像为 tar 包，用于传到云服务器部署
#
# 用法：
#   sh export-images.sh           # 导出到当前目录
#   sh export-images.sh /path/to # 导出到指定目录
set -e

OUT_DIR="${1:-.}"
mkdir -p "$OUT_DIR"

echo "[export] 导出 inkheap-backend:latest..."
docker save -o "$OUT_DIR/inkheap-backend.tar" inkheap-backend:latest

echo "[export] 导出 inkheap-frontend:latest..."
docker save -o "$OUT_DIR/inkheap-frontend.tar" inkheap-frontend:latest

echo "[export] 导出 postgres:16-alpine（如服务器能联网可跳过）..."
docker save -o "$OUT_DIR/postgres-16-alpine.tar" postgres:16-alpine

echo "[export] 复制 docker-compose.yml..."
cp docker-compose.yml "$OUT_DIR/docker-compose.yml"

echo ""
echo "[export] 完成！文件位于 $OUT_DIR："
ls -lh "$OUT_DIR"/inkheap-*.tar "$OUT_DIR"/postgres-*.tar "$OUT_DIR"/docker-compose.yml 2>/dev/null
echo ""
echo "下一步："
echo "  1. 把 $OUT_DIR 下的 4 个文件传到云服务器（scp / rsync）"
echo "  2. 在服务器上运行 sh deploy.sh"
