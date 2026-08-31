#!/bin/sh
set -e

# 等待 PostgreSQL 就绪（用 node 检测 TCP 连通，不依赖 pg_isready）
echo "[entrypoint] waiting for postgres..."
node -e "
const net = require('net');
const host = process.env.DB_HOST || 'postgres';
const port = Number(process.env.DB_PORT || 5432);
function tryConnect() {
  const s = net.connect({ host, port });
  s.on('connect', () => { s.end(); process.exit(0); });
  s.on('error', () => { setTimeout(tryConnect, 2000); });
}
tryConnect();
"

echo "[entrypoint] postgres is ready"

# 同步 schema 到数据库（建表）
echo "[entrypoint] running prisma db push..."
npx prisma db push

# 初始化 pgvector 扩展与数字生命向量表 dl_vectors（幂等）
echo "[entrypoint] running pgvector-init..."
node dist/pgvector-init.js

# 首次部署自动 seed（幂等，已存在的数据会 upsert 跳过）
echo "[entrypoint] running seed..."
node dist/seed.js && echo "[entrypoint] seed done" || echo "[entrypoint] seed skipped or failed (non-fatal)"

# 启动后端
echo "[entrypoint] starting backend..."
exec node dist/main
