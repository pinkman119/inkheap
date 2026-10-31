# INKHEAP 部署指南

## 架构

```
                    ┌─────────────────────────────────┐
                    │         云服务器 (80端口)         │
                    │                                   │
   用户 ────80──────►  inkheap-frontend (Nginx)         │
                    │    │  /        → 静态文件          │
                    │    │  /api/*    → 反代 backend     │
                    │    │  /files/*  → 反代 backend    │
                    │    │                             │
                    │    ▼                             │
                    │  inkheap-backend (NestJS:3000)    │
                    │    │                             │
                    │    ▼                             │
                    │  inkheap-postgres (PG:5432)       │
                    └─────────────────────────────────┘
```

- **PostgreSQL 16-alpine**：数据库，数据持久化到 docker volume
- **inkheap-backend**：NestJS 后端，自动建表 + seed，上传文件持久化到 docker volume
- **inkheap-frontend**：Nginx 托管前端静态文件 + 反代 `/api` 和 `/files` 到后端
- 对外只暴露 **80 端口**，无跨域问题

## 一、本地构建镜像

在项目根目录执行：

```bash
# 构建后端和前端镜像
docker-compose build

# 本地测试（可选）
docker-compose up -d
# 访问 http://localhost/  确认正常后停止
# docker-compose down
```

## 二、导出镜像

```bash
# 导出为 tar 包（导出到当前目录）
sh export-images.sh

# 或导出到指定目录
sh export-images.sh /path/to/output
```

会生成 4 个文件：
- `inkheap-backend.tar`
- `inkheap-frontend.tar`
- `postgres-16-alpine.tar`
- `docker-compose.yml`

## 三、传到云服务器

```bash
# 用 scp 传到服务器（替换为你的服务器地址）
scp inkheap-backend.tar inkheap-frontend.tar postgres-16-alpine.tar docker-compose.yml deploy.sh user@your-server:/opt/inkheap/

# 或用 rsync（更快）
rsync -avz inkheap-*.tar postgres-*.tar docker-compose.yml deploy.sh user@your-server:/opt/inkheap/
```

## 四、服务器部署

```bash
ssh user@your-server
cd /opt/inkheap

# 确认已安装 Docker 和 docker-compose
docker --version && docker-compose --version

# 加载镜像并启动
sh deploy.sh
```

首次启动约需 30-60 秒（PostgreSQL 就绪 + prisma db push 建表 + seed 写入数据）。

查看启动日志：
```bash
docker-compose logs -f backend   # 看到有 "Server running" 表示就绪
```

## 五、访问验证

| 入口 | 地址 | 说明 |
|------|------|------|
| 前台首页 | `http://服务器IP/` | 首页 |
| 关于我 | `http://服务器IP/#/about` | 关于我 |
| 后台管理 | `http://服务器IP/#/admin/login` | 账号 `admin` / 密码 `admin123` |

## 六、常用运维命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f           # 全部
docker-compose logs -f backend   # 仅后端
docker-compose logs -f frontend  # 仅前端

# 重启服务
docker-compose restart backend
docker-compose restart frontend

# 更新代码后重新部署
docker-compose build backend && docker-compose up -d backend

# 停止服务（保留数据）
docker-compose down

# 停止并删除所有数据（慎用！会清空数据库和上传文件）
docker-compose down -v
```

## 七、自定义配置（可选）

在启动前创建 `.env` 文件覆盖默认配置：

```bash
# 在服务器上创建 .env 文件
cat > .env <<EOF
DB_PASSWORD=your_strong_password
JWT_SECRET=your_jwt_secret_here
EOF
```

### 邮件发送（SMTP）——注册验证码 / 密码找回

前台邮箱注册需要通过邮箱验证码验证，忘记密码会把密码发送到注册邮箱，
两者都依赖 SMTP 邮件服务。在 `.env` 中追加以下配置（未配置时相关接口返回
「邮件服务未配置」错误，不影响站点其他功能）：

```bash
cat >> .env <<EOF
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=noreply@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM=墨堆 <noreply@example.com>
EOF
```

说明：
- `SMTP_PORT=465` 走隐式 SSL；`587` 走 STARTTLS（nodemailer 自动协商）
- `SMTP_FROM` 为发件人展示名，格式 `名称 <邮箱地址>`
- 密码找回邮件会包含账号的明文密码（站点采用可逆加密存储，属产品决策），
  请确保 SMTP 账号安全

### 访客账号密码加密密钥（APP_ENCRYPTION_KEY）

`email_users` 表的密码与数字生命模块的 API Key 共用 `APP_ENCRYPTION_KEY`
（32 字节 hex = 64 个字符）。生产环境务必在 `.env` 中覆盖默认值：

```bash
cat >> .env <<EOF
APP_ENCRYPTION_KEY=your_64_hex_chars_here
EOF
```

注意：更换密钥后，旧密文（API Key 与用户密码）将无法解密，找回密码功能
对老用户会失效，请谨慎操作并保留原密钥备份。

## 八、后续加 HTTPS（Let's Encrypt）

1. 准备域名解析到服务器 IP
2. 修改 `frontend/nginx.conf`，加 443 监听 + 证书路径
3. 用 certbot 申请证书，或挂载证书到容器

参考（待加证书时执行）：
```bash
# 在服务器上用 certbot 申请
certbot certonly --standalone -d your-domain.com
# 证书在 /etc/letsencrypt/live/your-domain.com/
# 挂载到 frontend 容器并修改 nginx.conf
```

## 故障排查

**后端启动失败**：
```bash
docker-compose logs backend
# 常见：PostgreSQL 未就绪 → 等待重试即可
```

**前端访问白屏**：
```bash
# 检查后端是否正常
curl http://localhost/api/public/home-page
# 检查 Nginx 日志
docker-compose logs frontend
```

**数据库连接失败**：
```bash
# 进入后端容器测试
docker-compose exec backend node -e "const net=require('net');const s=net.connect({host:'postgres',port:5432});s.on('connect',()=>{console.log('OK');process.exit(0)});s.on('error',e=>{console.log('FAIL',e.message);process.exit(1)})"
```

**重新 seed（清空数据重建）**：
```bash
docker-compose down -v
docker-compose up -d
```
