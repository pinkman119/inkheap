## Why

当前首页头像（HomeView）写死为远程占位图 `https://picsum.photos/seed/cat/400/400`，后台"首页管理"只能配置名称、人物 title 和代码框内容，无法上传并展示自己的头像。用户希望从本地上传图片保存到服务器，并在后台首页管理中支持上传头像，上传后的头像能回显到前台首页。

## What Changes

- 新增本地图片上传能力：前端选择文件 → 后端接收并保存到服务器 `files/` 目录（按日期分目录存储），返回可访问的文件 URL。
- 后端将上传文件目录 `files/` 以静态资源形式对外提供（如 `/files/<path>`），无需鉴权即可读取。
- 首页配置（HomePage）新增 `avatar` 字段，用于保存头像相对/绝对 URL。
- 后台"首页管理"页面新增头像上传控件，支持选择本地图片、即时预览、随配置一起保存。
- 前台首页（HomeView）读取后台配置的 `avatar` 字段并回显；若未配置则回退到默认占位图。

## Capabilities

### New Capabilities
- `file-upload`: 本地图片上传与静态文件服务。包含上传接口、服务器本地存储（`files/` 目录）、文件类型/大小校验、以及静态资源访问路由。
- `homepage-avatar`: 首页头像配置与回显。包含 HomePage 的 `avatar` 字段、后台上传与保存、前台回显及默认占位回退。

### Modified Capabilities
<!-- 无既有 spec 需要修改 -->

## Impact

- 后端：新增 `modules/upload`（或复用现有模块）上传控制器与服务；`main.ts` 配置 `useStaticAssets`/`ExpressAdapter` 暴露 `files/`；`HomePage` 模块 DTO/Entity/Service 增加 `avatar` 字段；`schema.prisma` 新增 `File` 模型（`files` 表）与 `HomePage.avatar` 列并执行迁移（或 `prisma db push`）；新增 `DELETE /api/admin/upload/:id` 删除接口，同步删除磁盘文件与 `files` 表记录。
- 前端：`useApi.js` 需支持 `multipart/form-data` 上传请求；`HomePageManageView.vue` 增加头像上传与预览；`HomeView.vue` 将硬编码占位图替换为后台 `avatar`。
- 依赖：`@nestjs/platform-express` 已包含 `multer`，无需新增依赖（文件上传基于 `multer` diskStorage）。
- 存储：服务器运行目录新增 `files/` 目录（需加入 `.gitignore`）。
