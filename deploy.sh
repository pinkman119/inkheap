#!/bin/sh
# 服务器端部署脚本：加载镜像 + 启动
#
# 用法：把 inkheap-backend.tar / inkheap-frontend.tar / postgres-16-alpine.tar /
#      docker-compose.yml 和 deploy.sh 放到同一目录，然后运行 sh deploy.sh
set -e

# 切换到脚本所在目录（确保能找到 docker-compose.yml）
cd "$(dirname "$0")"

# 兼容新版 docker compose（空格）和旧版 docker-compose（连字符）
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "[deploy] 错误：未找到 docker compose 或 docker-compose 命令"
  exit 1
fi

echo "[deploy] 使用命令: $DC"
echo "[deploy] 工作目录: $(pwd)"
echo "[deploy] 配置文件存在: $([ -f docker-compose.yml ] && echo YES || echo NO)"

if [ ! -f docker-compose.yml ]; then
  echo "[deploy] 错误：当前目录下没有 docker-compose.yml"
  echo "[deploy] 请确认文件已上传到同一目录"
  exit 1
fi

echo ""
echo "[deploy] 加载镜像..."
docker load -i inkheap-backend.tar
docker load -i inkheap-frontend.tar
docker load -i postgres-16-alpine.tar

echo ""
echo "[deploy] 启动服务..."
$DC up -d

echo ""
echo "[deploy] 等待服务就绪..."
echo "  - PostgreSQL: 启动中..."
echo "  - 后端: 执行 prisma db push + seed + 启动（约 20-40 秒）"
echo "  - 前端: Nginx 托管 + 反代"
echo ""
echo "查看日志：    $DC logs -f"
echo "查看状态：    $DC ps"
echo ""
echo "服务地址："
echo "  前台首页：    http://服务器IP/"
echo "  关于我：      http://服务器IP/#/about"
echo "  后台管理：    http://服务器IP/#/admin/login  (admin / admin123)"
echo ""
echo "停止服务：    $DC down"
echo "停止并删数据：$DC down -v"
