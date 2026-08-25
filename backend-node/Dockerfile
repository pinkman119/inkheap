# ====== 构建阶段 ======
FROM node:20-alpine AS builder

WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# 拷贝源码并编译
COPY . .
RUN npm run build

# 单独编译 seed.ts 及其依赖（tsconfig 排除了 prisma 目录）
# 用 typescript 的 transpileModule 把 seed.ts + resume.defaults.ts + xiaoji-seed-data.ts 编译为 JS
RUN node -e "\
const ts = require('typescript'); \
const fs = require('fs'); \
const path = require('path'); \
function transpile(srcPath, outPath) { \
  const src = fs.readFileSync(srcPath, 'utf8'); \
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true } }).outputText; \
  fs.mkdirSync(path.dirname(outPath), { recursive: true }); \
  fs.writeFileSync(outPath, out); \
} \
transpile('prisma/seed.ts', 'dist/seed.js'); \
transpile('prisma/pgvector-init.ts', 'dist/pgvector-init.js'); \
transpile('src/modules/resume/resume.defaults.ts', 'dist/modules/resume/resume.defaults.js'); \
transpile('src/modules/digitallife/digital-life.defaults.ts', 'dist/modules/digitallife/digital-life.defaults.js'); \
transpile('prisma/xiaoji-seed-data.ts', 'dist/xiaoji-seed-data.js'); \
console.log('seed.js transpiled'); \
" && \
sed -i 's|\.\./src/modules/resume/resume\.defaults|./modules/resume/resume.defaults.js|g' dist/seed.js && \
sed -i 's|\.\./src/modules/digitallife/digital-life\.defaults|./modules/digitallife/digital-life.defaults.js|g' dist/seed.js && \
sed -i 's|require("\./xiaoji-seed-data")|require("./xiaoji-seed-data.js")|g' dist/seed.js

# 生成 Prisma Client（含 about 等模型）
RUN npx prisma generate

# ====== 运行阶段 ======
FROM node:20-alpine AS runner

# 安装 OpenSSL（Prisma 运行时依赖）+ wget（健康检查）
RUN apk add --no-cache openssl wget

WORKDIR /app

# 仅安装生产依赖
COPY package*.json ./
RUN npm install --omit=dev

# 拷贝编译产物、Prisma 配置、seed、generated client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# entrypoint 脚本：等待 PG 就绪 → db push → seed → 启动
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 文件上传目录（运行时由 volume 挂载持久化）
RUN mkdir -p /app/files

# 暴露后端端口
EXPOSE 3000

# 健康检查：检查 /api/public/home-page 是否可访问
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/public/home-page || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
