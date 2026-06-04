# Personal Profile Management System

个人网站管理系统，基于前后端分离架构开发。

## 技术栈

### 前端
- Vue 3.4.21
- TypeScript 5.4.5
- Vite 5.2.9
- Vue Router 4.3.2
- Pinia 2.1.7
- Axios 1.6.7

### 后端
- Spring Boot 3.2.5
- Java 17
- Spring Data JPA
- Spring Security + JWT
- PostgreSQL 16
- Lombok

## 环境要求

- Node.js >= 18.x
- Java 17
- Maven 3.8+
- Docker & Docker Compose（用于启动 PostgreSQL 数据库）

## 项目初始化

### 1. 启动数据库

使用 Docker Compose 启动 PostgreSQL 数据库：

```bash
cd backend
docker-compose up -d
```

数据库配置：
- 主机：localhost:5432
- 数据库名：personal_profile
- 用户名：postgres
- 密码：LXJ520skr

### 2. 后端初始化

```bash
cd backend

# 安装依赖并构建项目
mvn clean install

# 运行项目
mvn spring-boot:run
```

后端服务将在 `http://localhost:8090` 启动。

### 3. 前端初始化

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

## 项目启动说明

### 启动顺序

1. 启动 PostgreSQL 数据库
2. 启动后端服务
3. 启动前端服务

### 停止服务

```bash
# 停止数据库
cd backend
docker-compose down

# 停止后端：Ctrl+C 或关闭终端
# 停止前端：Ctrl+C 或关闭终端
```

## 默认账号

- 管理员用户名：admin
- 管理员密码：admin123

## 其他命令

### 前端

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 后端

```bash
# 打包项目
mvn clean package

# 运行打包后的 jar
java -jar target/personal-website-management-0.0.1-SNAPSHOT.jar
```
