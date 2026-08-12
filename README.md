# INKHEAP

个人知识站项目，包含 Node.js（NestJS）后端与 Vue 3（Vite）前端。

## 环境要求

- Node.js（建议 18+）
- npm

## 启动后端

```bash
cd backend-node
npm install
npm run start:dev      # 开发模式（带热重载）
# 或 npm run start 以普通模式启动
```

后端默认监听 `http://localhost:3000`。

> 说明：后端默认使用 SQLite（`backend-node/.env` 中的 `DATABASE_URL="file:./dev.db"`），无需额外安装数据库即可直接启动。

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

启动后访问终端输出的本地地址（通常为 `http://localhost:5173`）。

## 一键启动外部依赖（可选）

项目默认使用 SQLite，无需数据库容器。如需使用 PostgreSQL 及 pgAdmin，可在项目根目录运行：

```bash
docker compose up -d      # 启动
docker compose down       # 停止（加 -v 可同时删除数据卷）
```

如需后端切换为 PostgreSQL，请参考 `docker-compose.yml` 顶部注释中的步骤。
