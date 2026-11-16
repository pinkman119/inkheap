# INKHEAP 墨堆

> 个人知识站 + AI 数字生命 —— 一个完全属于你自己的"墨水堆积之地"

**在线体验：[www.inkheap.com](https://www.inkheap.com)**

INKHEAP（墨堆）是一套开箱即用的个人网站系统：既是博客、小记、简历、友链组成的个人知识站，也内置了一个可训练的 **AI 数字分身**——把你的资料、文章喂给它，访客就能在网站上和"数字版的你"对话，回答风格也由你定义。

```
访客 ──HTTPS──► Nginx (Vue 3 SPA)
                  │  /api/* /files/*  反代
                  ▼
              NestJS 后端
                  │
                  ├──► PostgreSQL + pgvector（业务数据 + RAG 向量）
                  └──► Redis（聊天限流 / 缓存）
```

## ✨ 功能特性

**前台**

- 🏠 首页：站点门面，聚合展示核心内容
- ✍️ 文章：Markdown 写作，支持 GFM、代码高亮、Mermaid 图表
- 📝 小记：轻量的碎片化记录
- 🧾 简历：在线简历页，内容后台可维护
- 🤖 数字生命：可训练的 AI 分身对话（RAG 检索增强 + 流式输出 + 令牌桶限流）
- 🔗 友链 / 📮 留言 / 👤 关于我

**后台管理（`/#/admin/login`）**

- 文章 / 小记 / 简历 / 友链 / 站点配置等全站内容管理
- 数字生命：训练资料管理、人格编写、多模型配置（API Key 加密存储）

## 🧰 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Vue Router，marked / highlight.js / Mermaid / ECharts |
| 后端 | NestJS 11 + Prisma + LangChain（多模型自动切换） |
| 数据库 | PostgreSQL 16（pgvector 扩展，RAG 向量检索）+ Redis 7 |
| 部署 | Docker / docker-compose + Nginx（HTTPS、反代、SSE） |

本地开发无需安装数据库：后端默认使用 SQLite，PostgreSQL / Redis 仅生产部署需要。

## 🚀 本地启动

### 方式一：AI Agent 一键启动

把下面的提示词原样复制给任意 AI 编码助手（CodeBuddy / Cursor / Claude Code 等），即可让它自动完成安装与启动：

```text
请帮我启动当前工作区的 INKHEAP 个人知识站项目，要求如下：
1. 检查环境：确认本机已安装 Node.js（>= 18）与 npm，若未安装请先告诉我如何安装；
2. 启动后端：进入 backend-node 目录，执行 npm install；随后执行 npx prisma generate 生成 Prisma Client，
   再执行 npx prisma db push 初始化 SQLite 数据库（默认 DATABASE_URL="file:./dev.db"，无需额外安装数据库）；
   如项目缺少 .env 文件，请先创建 backend-node/.env 并写入 DATABASE_URL="file:./dev.db"；
   然后运行 npm run start:dev 启动后端，预期监听 http://localhost:3000；
3. 启动前端：另开一个终端，进入 frontend 目录，执行 npm install，然后运行 npm run dev，
   预期监听 http://localhost:5173；
4. 验证：后端就绪后访问 http://localhost:3000/api/public/home-page 确认接口正常，
   前端就绪后用浏览器打开 http://localhost:5173 确认页面可访问；
5. 排障：若端口被占用请告诉我处理建议，若启动报错请阅读报错日志定位原因并修复后再试；
6. 全部完成后，向我汇报前后端的访问地址与启动状态。
```

### 方式二：手动启动

```bash
# 后端（NestJS，默认 SQLite，无需额外数据库）
cd backend-node
npm install
npx prisma generate && npx prisma db push   # 初始化数据库
npm run start:dev                            # http://localhost:3000

# 前端（Vite）
cd frontend
npm install
npm run dev                                   # http://localhost:5173
```

> 如需本地使用 PostgreSQL + Redis，可运行根目录 `docker compose up -d`，并参考 `docker-compose.yml` 顶部注释切换数据源。

## 📦 服务器部署

**推荐配置**（亲测可流畅运行全部服务）：

| CPU | 内存 | 系统盘 | 带宽 |
|-----|------|--------|------|
| 2 核 | 4 GB | SSD 60 GB | 5 Mbps |

部署采用「本地构建镜像 → 上传 → 服务器一键启动」三步走，全部脚本已纳入仓库 `deploy/` 目录：

```bash
# 第 1 步：本地构建（需已安装 Docker）
sh deploy/build.sh

# 第 2 步：上传整个 deploy/ 目录到服务器
scp -r deploy user@your-server:/opt/inkheap

# 第 3 步：服务器上一键启动
ssh user@your-server
cd /opt/inkheap && sh deploy.sh
```

首次启动约 30–60 秒（PostgreSQL 就绪 → 自动建表 → 写入种子数据），完成后即可通过 HTTPS 访问。

**详细文档**：部署脚本的完整说明见 [`deploy/README.md`](deploy/README.md)，架构图、HTTPS 证书配置、`.env` 密钥覆盖、SMTP 邮件配置与故障排查见 [`doc/DEPLOY.md`](doc/DEPLOY.md)。

**上线前安全清单**：

- [ ] 在 `deploy/` 目录创建 `.env`，覆盖 `DB_PASSWORD`、`JWT_SECRET`、`APP_ENCRYPTION_KEY`（32 字节 hex）默认值
- [ ] 登录后台（`/#/admin/login`）修改默认账号 `admin / admin123`
- [ ] 准备自己的 HTTPS 证书 `fullchain.pem` / `privkey.key`（脚本会自动部署到 `/etc/inkheap-certs/`；证书与镜像 tar 已被 `.gitignore` 排除，不会进入仓库）

## 📁 目录结构

```
inkheap/
├── backend-node/     # NestJS 后端（Prisma + LangChain + 各业务模块）
├── frontend/         # Vue 3 前端（前台 + 后台管理）
├── deploy/           # 部署脚本与文档（build.sh / deploy.sh / compose）
├── doc/              # 项目文档（DEPLOY.md 部署指南等）
├── db/               # 数据库脚本
└── docker-compose.yml
```
