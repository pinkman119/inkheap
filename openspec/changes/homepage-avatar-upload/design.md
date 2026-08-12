## Context

项目为 INKHEAP 个人站点，后端 NestJS（Express 平台，`@nestjs/platform-express` 已含 `multer`） + Prisma(SQLite) + 前端 Vue 3。当前：

- 首页头像在 `HomeView.vue` 中硬编码为远程占位图 `https://picsum.photos/seed/cat/400/400`，不读取后台配置。
- 后台"首页管理"（`HomePageManageView.vue`）仅能配置 `siteName`、`personTitle`、`codeContent`，通过 `PUT /api/admin/home-page` 保存，无图片字段。
- `HomePage` 模块已有 public（`GET /api/public/home-page`）与 admin（`GET/PUT /api/admin/home-page`）接口，数据存于 `home_page` 表。
- `main.ts` 使用默认 `NestFactory.create(AppModule)`，全局前缀 `/api`，未暴露任何静态文件目录。

目标：支持本地上传图片并保存到服务器 `files/`，在后台首页管理上传头像，前台首页回显。

## Goals / Non-Goals

**Goals:**
- 提供受保护的图片上传接口，保存到服务器 `files/` 目录并返回可访问 URL。
- 将 `files/` 以静态资源对外暴露（公开可读），供前台 `<img>` 直接使用。
- `HomePage` 增加 `avatar` 字段，后台上传后保存，前台读取回显，缺失时回退默认占位图。

**Non-Goals:**
- 不做图片裁剪/压缩/水印处理（仅做类型与大小校验）。
- 不做对象存储（S3 等），仅本地磁盘存储。
- 不做多图/图库管理，仅单张首页头像。
- 不修改除首页头像外的其他模块。

## Decisions

### 1. 静态文件服务方式：使用 `NestExpressApplication` + `useStaticAssets`
- 将 `main.ts` 的类型改为 `NestExpressApplication`，调用 `app.useStaticAssets(path.join(process.cwd(), 'files'), { prefix: '/files' })`。
- 理由：Express 平台原生支持，零额外依赖；`/files/*` 路径下文件公开可读，正好满足前台图片回显。
- 替代方案：单独写一个 `Get('/files/*')` 控制器用 `res.sendFile` 流式返回 —— 更多样板代码，没必要。

### 2. 上传实现：独立 `upload` 模块 + `multer` diskStorage + `files` 表
- 新增 `modules/upload`，控制器 `POST /api/admin/upload`（受 `JwtAuthGuard` 保护），字段名 `file`，使用 `FileInterceptor('file', multerOptions)`。
- `destination` 为 `files/<YYYY-MM-DD>/`，文件名用 `uuid + 原扩展名`（防止同名覆盖与中文名问题）。
- 校验：`fileFilter` 仅允许 `image/*`（png/jpeg/gif/webp）；`limits.fileSize` 限制为 5MB。
- **落库**：保存到磁盘后，在 `files` 表写入一条记录（字段见决策 6），并返回 `{ id, url, filename, size }`（`id` 供前端后续删除使用）。
- 理由：复用后端既有的 JWT 鉴权；磁盘存储最简单且文件可直接被静态路由暴露；同步落库便于审计、去重与删除时定位磁盘文件。

### 3. 头像字段存储：仅存 URL 路径 + 替换时删除旧文件
- `HomePage` 模型新增 `avatar String? @map("avatar")`，存相对路径如 `/files/2026-08-12/uuid.png`。
- `HomePageService.findOne` 在返回时把 `avatar` 原样返回（已是 `/files/...` 形式，前台直接当 `src` 使用）；`update` 接受 `avatar` 可选字段。
- **替换即删旧**：`update` 执行前，比较入参 `avatar` 与库中现有 `avatar`；若两者不同且旧值非空，则根据旧 `avatar` 路径在 `files` 表找到对应记录（按 `url` 匹配），删除其磁盘文件（`fs.unlink` 其 `relativePath`）并 `prisma.file.delete` 删库，再写入新值。若入参 `avatar` 置空（移除），同样删除旧记录。
- 理由：存可访问路径，前台无需拼接，且静态路由前缀统一；替换时清理旧文件避免磁盘与 `files` 表无限增长、产生孤儿文件。
- 注意：删除旧文件以 `files` 表记录为准；若旧 avatar 在表中无记录（如历史硬编码占位图），跳过删除、仅更新字段，保证幂等不报错。

### 4. 前台上传请求：`useApi` 增加 `upload` 方法
- `useApi.js` 新增 `upload: (path, file) => request(path, { method: 'POST', body: file, headers: {} })` —— 注意不上 `Content-Type`，让浏览器自行设置 `multipart/form-data; boundary=...`，`request` 内部对 `FormData` 不加 JSON 头。
- 后台 `HomePageManageView.vue`：新增头像上传区域（`<input type="file" accept="image/*">`），选中后 `new FormData()` 提交 `/api/admin/upload`，成功后把返回 `url` 写入 `form.avatar` 并即时在预览卡片回显；可"移除头像"恢复默认。
- `HomeView.vue`：`profile.avatar` 初始默认占位图，从 `public/home-page` 取 `avatar` 字段覆盖；加载失败时回退占位图。

### 5. 磁盘目录与 `.gitignore`
- `files/` 在服务器运行目录创建（首次上传时 `mkdirSync(recursive:true)`），加入 `.gitignore`。

### 6. `files` 数据库表与删除同步
- 新增 Prisma model `File`（表 `files`）：
  - `id String @id @default(uuid())`
  - `filename String`（磁盘文件名，如 `uuid.png`）
  - `originalName String?`（上传时的原始文件名）
  - `url String`（可访问路径，如 `/files/2026-08-12/uuid.png`）
  - `mimeType String?`
  - `size Int`
  - `relativePath String`（磁盘相对路径，如 `2026-08-12/uuid.png`，用于删除时定位 `files/` 下的实体文件）
  - `createdAt DateTime @default(now())`
- 上传成功后写入该表一条记录；返回体含 `id`。
- 新增 `DELETE /api/admin/upload/:id`（受 `JwtAuthGuard` 保护）：先按 `id` 查库得到 `relativePath`，用 `fs.unlink` 删除磁盘文件，再 `prisma.file.delete` 删除数据库记录；任一步失败做补偿（磁盘不存在也允许删库，避免脏数据残留）。删除成功返回 200。
- 理由：数据库作为上传文件的"账本"，删除接口以 DB 记录为准删除磁盘实体，保证两者一致；`relativePath` 让删除不依赖 URL 前缀拼接。
- 后台"移除头像"流程改为：调用 `DELETE /api/admin/upload/:id` 删除旧文件记录（连带磁盘），再清空 `HomePage.avatar` 字段。

## Risks / Trade-offs

- [风险] 文件命名/目录权限：Windows 与 Linux 路径分隔符差异 → 缓解：用 `path.join` 与 `moment`/`Date` 生成日期目录，Node 跨平台处理。
- [风险] `multer` 大文件占用内存：已设 `limits.fileSize=5MB`，超界返回 413，由前端提示。
- [风险] 静态目录暴露任意上传文件：仅允许 `image/*` 上传，且目录限定在 `files/`，风险可控；如需更强隔离可后续加签名 URL（本期不做）。
- [权衡] 直接存相对路径而非绝对 URL：部署路径变化时更灵活，但要求静态前缀固定为 `/files`，已在 design 决策 1 固定。

## Migration Plan

1. `prisma/schema.prisma` 增加 `File` model（见决策 6）与 `HomePage.avatar` 列，执行 `prisma generate` 与 `prisma db push`（SQLite，无破坏性迁移）。
2. 部署后端：新上传接口与静态路由随启动生效；首次上传自动创建 `files/`。
3. 部署前端：后台上传 UI 与首页回显逻辑生效。
4. 回滚：移除上传/静态路由代码、回退 `avatar` 字段（SQLite 列可保留或手动删除），前台回退到硬编码占位图。

## Open Questions

- 是否需要限制单用户总上传体积/数量？本期不做，后续可加。
- 是否要支持替换头像时删除旧文件？本期保留旧文件，仅更新字段（避免误删），后续可优化。
