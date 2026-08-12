## 1. 后端：文件上传模块

- [ ] 1.1 新增 `modules/upload/upload.module.ts`，导入 `AppModule` 中的 `JwtAuthGuard`（或 `AuthModule`）并注册控制器与服务
- [ ] 1.2 新增 `upload.controller.ts`：`POST /api/admin/upload`，使用 `FileInterceptor('file', multerOptions)` 接收文件，字段名 `file`，受 `JwtAuthGuard` 保护
- [ ] 1.3 新增 `upload.service.ts`：基于 `multer` diskStorage 保存到 `files/<YYYY-MM-DD>/<uuid>.<ext>`，首次上传自动 `mkdirSync(recursive)`；保存成功后向 `files` 表写入记录（filename/originalName/url/mimeType/size/relativePath），返回 `{ id, url, filename, size }`
- [ ] 1.4 在 `main.ts` 启用 `NestExpressApplication`（`app.useStaticAssets(path.join(process.cwd(),'files'), { prefix: '/files' })`），暴露静态文件目录
- [ ] 1.5 新增 `DELETE /api/admin/upload/:id`：按 `id` 查 `files` 表得 `relativePath`，`fs.unlink` 删除磁盘文件后 `prisma.file.delete` 删库；记录不存在返回 404，未鉴权返回 401

## 2. 后端：HomePage 头像字段与 files 表

- [ ] 2.1 `prisma/schema.prisma` 新增 `File` model（id/filename/originalName/url/mimeType/size/relativePath/createdAt）与 `HomePage.avatar String? @map("avatar")`，执行 `prisma generate` 与 `prisma db push`
- [ ] 2.2 `update-home-page.dto.ts` 增加可选 `avatar: string` 字段（zod 校验为可选 string）
- [ ] 2.3 `home-page.entity.ts` 增加 `avatar` 响应字段
- [ ] 2.4 `homepage.service.ts` 的 `update` 与 `findOne` 透传 `avatar` 字段（返回即 `/files/...` 路径）
- [ ] 2.5 `homepage.service.ts` 的 `update` 增加"替换删旧"逻辑：比较入参 `avatar` 与库中旧值，若不同且旧值对应 `files` 表记录，则删除旧文件磁盘实体（`relativePath`）与 `files` 表记录后再写入新值；旧值无记录或置空时跳过删除，保证幂等

## 3. 前端：上传与 API 支持

- [ ] 3.1 `useApi.js` 新增 `upload(path, file)` 方法：以 `multipart/form-data`(`FormData`) 发送，不对 `FormData` 强加 JSON `Content-Type`
- [ ] 3.2 后台 `HomePageManageView.vue` 新增头像上传控件：`<input type="file" accept="image/*">`，选中后 `new FormData()` 提交 `POST /api/admin/upload`，暂存返回 `id` 与 `url`
- [ ] 3.3 上传成功后把返回 `url` 写入 `form.avatar` 并暂存 `uploadedFileId`，预览卡片即时回显；"移除头像"时调用 `DELETE /api/admin/upload/:uploadedFileId` 同步删除磁盘与 `files` 表记录，再清空 `form.avatar`
- [ ] 3.4 `HomeView.vue` 用 `public/home-page` 的 `avatar` 字段替换硬编码占位图，缺省/加载失败时使用默认占位图

## 4. 工程化与校验

- [ ] 4.1 仓库根 `.gitignore` 增加 `files/`（避免上传文件入库）
- [ ] 4.2 启动后端验证 `POST /api/admin/upload` 保存文件且写入 `files` 表、未带 token 返回 401、非图片/超大返回拒绝；验证 `DELETE /api/admin/upload/:id` 删除后磁盘文件与 `files` 表记录均消失、记录不存在返回 404
- [ ] 4.3 浏览器验证 `GET /files/<path>` 可公开访问；后台上传并保存头像后，前台首页正确回显头像；移除头像后文件与记录均被同步删除；**替换头像（上传新图并保存）后，旧的 `files` 表记录与磁盘文件被自动清理，仅保留新头像**
