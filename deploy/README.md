# INKHEAP 一键部署指南

代码更新 → 删除前后端镜像 -> build.sh（构建镜像 + 导出 tar）→ 上传 deploy/ 到服务器 → deploy.sh（加载 tar + 启动）

## 架构总览

```
用户 ──HTTPS 443──► inkheap-frontend (Nginx)
                      │  /          → 前端静态文件
                      │  /api/*     → 反代 backend
                      │  /files/*   → 反代 backend
                      ▼
                  inkheap-backend (NestJS:3000)
                      │
                      ├──► inkheap-postgres (pgvector/pg16:5432)
                      └──► inkheap-redis (redis:7:6379)
```

- 80 端口自动 301 跳转到 HTTPS 443
- 证书挂载：宿主机 `/etc/inkheap-certs/` → 容器内 `/etc/inkheap-certs/`（只读）
- 首次启动自动执行：等待 PG 就绪 → `prisma db push` 建表 → pgvector 初始化 → seed 演示数据

## deploy 目录文件清单

| 文件 | 说明 |
|------|------|
| `fullchain.pem` | HTTPS 证书（已放入） |
| `privkey.key` | HTTPS 私钥（已放入） |
| `build.sh` | 本地执行：构建镜像并导出部署包到此目录 |
| `deploy.sh` | 服务器执行：加载镜像 → 部署证书 → 一键启动 |
| `inkheap-backend.tar` | 后端镜像（每次构建都会重新生成） |
| `inkheap-frontend.tar` | 前端镜像（每次构建都会重新生成） |
| `pgvector-pg16.tar` | PostgreSQL + vector 镜像（仅首次生成，之后跳过） |
| `redis-7-alpine.tar` | Redis 镜像（仅首次生成，之后跳过） |
| `docker-compose.yml` | 服务编排文件（由 build.sh 复制） |

## 部署三步走

### 第 1 步：本地构建（需已安装 Docker + docker-compose）

```bash
cd ~/Desktop/inkheap
sh deploy/build.sh
```

脚本会：
1. 构建后端（NestJS）和前端（Nginx）镜像
2. 导出前后端镜像 tar + 复制 `docker-compose.yml` 到 `deploy/`
3. **基础镜像（`pgvector/pgvector:pg16`、`redis:7-alpine`）只在首次构建时导出**——
   若 `deploy/` 中已存在对应的 tar，则跳过拉取与导出（这两个约 165MB 且很少变动）

如需强制重新导出基础镜像（例如升级版本）：

```bash
sh deploy/build.sh --all
```

> 即使不传基础镜像 tar 也没关系：服务器上 `deploy.sh` 会依次尝试「本地 tar → 服务器已有镜像 → 联网拉取」。

### 第 2 步：上传到服务器

```bash
# 整个 deploy 目录一起传（替换为你的服务器地址）
scp -r deploy user@your-server:/opt/inkheap

# 或用 rsync（更快）
rsync -avz deploy/ user@your-server:/opt/inkheap/
```

### 第 3 步：服务器一键启动

```bash
ssh user@your-server
cd /opt/inkheap
sh deploy.sh
```

`deploy.sh` 会自动完成：
1. 检查 Docker / docker-compose 环境
2. `docker load` 加载 4 个镜像 tar
3. 把 `fullchain.pem`、`privkey.key` 复制到 `/etc/inkheap-certs/`（私钥权限 600）
4. `docker compose up -d --no-build` 启动全部服务
5. 轮询后端健康检查（最长约 2 分钟），完成后打印访问入口

## 访问入口

| 入口 | 地址 | 说明 |
|------|------|------|
| 前台首页 | `https://服务器IP/` | HTTP 自动跳转 HTTPS |
| 关于我 | `https://服务器IP/#/about` | |
| 后台管理 | `https://服务器IP/#/admin/login` | 账号 `admin` / 密码 `admin123` |

## 安全建议（可选）

`deploy.sh` 启动前可在同目录创建 `.env` 覆盖默认密钥：

```bash
cat > .env <<EOF
DB_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_here
APP_ENCRYPTION_KEY=64位hex字符串（32字节）
EOF
```

> 注意：改密码需在首次启动前进行，否则 PG 卷已用旧密码初始化，需 `docker-compose down -v` 清卷重来。

## 常用运维命令（在服务器 deploy 目录执行）

```bash
docker-compose ps               # 查看服务状态
docker-compose logs -f          # 查看全部日志
docker-compose logs -f backend  # 仅后端（看到 "Server running" 即就绪）
docker-compose restart backend  # 重启后端
docker-compose down             # 停止服务（保留数据）
docker-compose down -v          # 停止并清空所有数据（慎用！）
```

## 更新代码后重新部署

```bash
# 本地
sh deploy/build.sh
scp -r deploy user@your-server:/opt/inkheap

# 服务器
cd /opt/inkheap
sh deploy.sh   # 重新加载镜像并启动
```

## 故障排查

**后端启动失败 / 一直不健康**：
```bash
docker-compose logs backend
# 常见：PostgreSQL 未就绪 → 等待重试；数据库连接失败 → 检查 DB_PASSWORD
```

**前端白屏**：
```bash
curl -k https://localhost/api/public/home-page   # 验证后端 API
docker-compose logs frontend                      # 检查 Nginx 日志
```

**HTTPS 证书报错**：
```bash
ls -l /etc/inkheap-certs/   # 确认 fullchain.pem 和 privkey.key 存在
# 换新证书后重启：docker-compose restart frontend
```

**端口被占用**：
```bash
# 80/443 被占用（如服务器自带 Nginx/Apache）
netstat -tlnp | grep -E ':80|:443'
# 停掉占用进程，或修改 docker-compose.yml 端口映射
```

## 相关文件位置（本地项目）

- `docker-compose.yml` — 服务编排（根目录）
- `backend-node/Dockerfile` — 后端多阶段构建
- `backend-node/entrypoint.sh` — 后端容器启动逻辑（等 PG → 建表 → seed → 启动）
- `frontend/Dockerfile` — 前端构建 + Nginx 运行
- `frontend/nginx.conf` — HTTPS 配置、API 反代、SSE 支持
