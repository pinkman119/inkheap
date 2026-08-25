# ====== 构建阶段：编译前端 ======
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ====== 运行阶段：Nginx 托管静态文件 + 反代后端 ======
FROM nginx:alpine AS runner

# 拷贝构建产物到 nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 拷贝自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
