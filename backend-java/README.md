# INKHEAP

个人知识站：**Vue 3 + Vite** 前端，**SpringBoot 3.5.3 + MyBatis-Flex** 后端（`backend-java`），数据库 **PostgreSQL 17 + pgvector**。
`backend-node`（NestJS + Prisma）为旧后端，保留作功能对照，两套后端**不能同时启动**（都占 3000 端口）。

## 目录结构

```
inkheap/
├── frontend/        # Vue 3 + Vite 前端（端口 5173）
├── backend-java/    # SpringBoot 后端（端口 3000，当前主力）
├── backend-node/    # NestJS 后端（端口 3000，旧实现，可选）
├── db/              # 数据库相关脚本
└── docker-compose.yml
```

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | 18+ | 前端构建 |
| JDK | **21**（本机 `D:\Java\jdk-21.0.12.1`） | 后端编译运行，`pom.xml` 指定 release 21 |
| Maven | 3.9+ | 后端构建 |
| PostgreSQL | 17（本机 `D:\PostgreSQL\17`） | 需安装 **pgvector** 扩展 |

---

## 快速开始（三步）

### 1. 数据库（只需执行一次）

确认 PG 服务已启动：

```powershell
Get-Service postgresql-x64-17          # 应为 Running
```

初始化库表（脚本幂等，全部 `IF NOT EXISTS`）：

```powershell
$env:PGPASSWORD='<postgres 密码>'
D:\PostgreSQL\17\bin\psql.exe -U postgres -h 127.0.0.1 -d personal_profile `
  -f d:\IdeaProject\inkheap\backend-java\src\main\resources\db\schema.sql
```

验证扩展与向量表：

```sql
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pgcrypto');
-- vector=0.8.7, pgcrypto=1.3
```

> 默认连接：`jdbc:postgresql://127.0.0.1:5432/personal_profile`，用户 `postgres`，密码默认值见 `backend-java/src/main/resources/application-dev.yml`。

### 2. 启动后端（Java）

```powershell
# 查看当前 JAVA_HOME
$env:JAVA_HOME

# PowerShell 临时设置，只在当前窗口生效
$env:JAVA_HOME='D:\Java\jdk-21.0.12.1'
cd d:\IdeaProject\inkheap\backend-java
mvn spring-boot:run
```

Git Bash / macOS / Linux：

```bash
export JAVA_HOME=/path/to/jdk-21
cd backend-java && mvn spring-boot:run
```

启动成功后日志会打印：

```
Application INKHEAP is running! Access URLs:
Local:    http://localhost:3000/api/public/home-page
Swagger:  http://localhost:3000/doc.html
```

打包后运行（可选）：

```powershell
cd backend-java
mvn clean package -DskipTests
java -jar target\inkheap-java-1.0.0.jar
```

### 3. 启动前端

```powershell
cd d:\IdeaProject\inkheap\frontend
npm install
npm run dev
```

访问 `http://localhost:5173`（Vite 默认端口，`vite.config.js` 已固定 5173）。

> 前端 `src/composables/useApi.js` 在开发环境直连 `http://localhost:3000/api`，**后端必须是 3000 端口**，否则前端需要改这个常量。

---

## 访问地址

| 地址 | 说明 |
|---|---|
| http://localhost:5173 | 前台站点 |
| http://localhost:5173/#/admin/login | 后台登录 |
| http://localhost:3000/api | 后端 API 根路径 |
| http://localhost:3000/doc.html | Knife4j 接口文档 |
| http://localhost:3000/files/... | 上传文件静态访问（**不带 `/api`**） |
| http://localhost:3000/api/feed.xml | RSS 订阅 |

## 常用命令速查

| 操作 | 命令 | 目录 |
|---|---|---|
| 编译后端 | `mvn -DskipTests compile` | `backend-java` |
| 启动后端（热重启） | `mvn spring-boot:run` | `backend-java` |
| 打包后端 | `mvn clean package -DskipTests` | `backend-java` |
| 前端开发 | `npm run dev` | `frontend` |
| 前端构建 | `npm run build` | `frontend` |
| 前端本地预览 | `npm run preview` | `frontend` |
| 旧 Node 后端（可选） | `npm run start:dev` | `backend-node` |

## 配置项（环境变量）

后端所有配置都有本地默认值，需要覆盖时设置环境变量即可：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 后端端口（前端依赖 3000） |
| `PROFILE` | `dev` | `dev` / `prod` |
| `DB_URL` | `jdbc:postgresql://127.0.0.1:5432/personal_profile` | 数据库连接串 |
| `DB_USER` | `postgres` | 数据库用户 |
| `DB_PASSWORD` | 见 `application-dev.yml` | 数据库密码 |
| `JWT_SECRET` | `inkheap-admin-secret-key-2026` | **与旧 Node 后端保持一致**，否则旧 token 失效 |
| `APP_ENCRYPTION_KEY` | 64 位 hex | **必须与旧数据一致**，用于解密访客密码与模型 Key |
| `UPLOAD_DIR` | `./files` | 上传文件落盘目录 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 空 | 邮件功能（注册验证码、找回密码） |
| `REDIS_HOST` / `REDIS_PORT` | `127.0.0.1` / `6379` | 可选，不可用时限流降级 |

PowerShell 示例：

```powershell
$env:DB_PASSWORD='your-password'
$env:PORT='3000'
mvn spring-boot:run
```

## 首次使用：创建管理员账号

`schema.sql` 只建表、不插数据，后台登录前需手动创建管理员（密码用 pgcrypto 生成 bcrypt，与后端校验兼容）：

```sql
INSERT INTO admin_users (username, password, role, status)
VALUES ('admin', crypt('admin123', gen_salt('bf', 10)), 'admin', 'active')
ON CONFLICT (username) DO NOTHING;
```

执行后即可用 `admin / admin123` 登录 `#/admin/login`，登录后请及时改密码。

## 常见问题

**1. 后端启动报 `invalid target release: 21`**
`JAVA_HOME` 仍指向 JDK 17。设置 `$env:JAVA_HOME='D:\Java\jdk-21.0.12.1'`；IDEA 中把 Project SDK 也改成该 JDK。

**2. 端口 3000 被占用**
多为旧 Node 后端或上次未退出的 Java 进程。查占用：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
Get-Process -Id <PID>
```

`backend-java` 与 `backend-node` 只能二选一启动。

**3. 建表报 `type "vector" does not exist`**
pgvector 未安装。确认 `D:\PostgreSQL\17\lib\vector.dll` 与 `share\extension\vector.control` 存在，再执行 `CREATE EXTENSION vector;`。

**4. 前端接口全部 404 或跨域报错**
后端未启动，或端口不是 3000。Vite 已为 `/api`、`/files` 配了代理，但 `useApi.js` 在 5173 下走的是绝对地址 `http://localhost:3000/api`。

**5. 后台登录提示「用户名或密码错误」**
`admin_users` 表为空，按上一节创建管理员；或该账号 `status` 不是 `active`。
