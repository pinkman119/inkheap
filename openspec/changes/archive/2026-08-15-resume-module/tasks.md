## 1. 后端：简历模型与种子数据

- [x] 1.1 在 `backend-node/prisma/schema.prisma` 新增 `Resume` 模型（`id` UUID、`name` 版本名称、`content String` JSON 字符串、`isActive` 激活标记、`createdAt`/`updatedAt`），执行 `prisma db push` 生成 `resume` 表
- [x] 1.2 在 `backend-node/prisma/seed.ts` 增加简历种子逻辑：将 mock 内容迁移为 `resume.defaults.ts` 的 `DEFAULT_RESUME_CONTENT`，无记录时创建「默认版本」并 `isActive = true`（已有记录不覆盖、不重复创建）

## 2. 后端：Resume 模块与 API

- [x] 2.1 新建 `backend-node/src/modules/resume/resume.module.ts`（注册 `PrismaModule`，导出 service）
- [x] 2.2 新建 `backend-node/src/modules/resume/resume.service.ts`：`findActive()`（无生效版本时返回默认内容占位）、`list()`、`findById(id)`、`create(dto)`（首个版本自动激活）、`update(id, dto)`、`activate(id)`（事务内其余版本全部置 `isActive=false`）、`remove(id)`（唯一生效版本拒绝删除）
- [x] 2.3 新建 `backend-node/src/modules/resume/dto/resume.dto.ts`：`CreateResumeDto`（name 可选、content `@IsObject()` 必填 + `ResumeContentDto.name` 非空）、`UpdateResumeDto`（name/content 至少一项）
- [x] 2.4 新建 `backend-node/src/modules/resume/resume.controller.ts`：`GET /api/public/resume`（公开）；`@Controller('admin/resume')` + `JwtAuthGuard`：`GET /`（列表）、`GET /:id`（详情）、`POST /`（新建）、`PUT /:id`（更新）、`PUT /:id/activate`（切换激活）、`DELETE /:id`（删除）
- [x] 2.5 在 `backend-node/src/app.module.ts` 注册 `ResumeModule`
- [x] 2.6 启动后端验证：列表/详情/新建/更新/切换/删除均正确，切换后公开接口返回新生效版本，未授权返回 401

## 3. 前端：原型文件替换

- [x] 3.1 将 `C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\prototypes\resume.html` 内容复制到 `frontend/prototypes/resume.html`（MD5 不一致时覆盖）

## 4. 前端：前台简历页重构

- [x] 4.1 将 `frontend/src/data/resume.js` 改造为内置默认数据常量（对齐后端 `DEFAULT_RESUME_CONTENT` 结构），作为接口失败降级数据
- [x] 4.2 新建无状态渲染组件 `frontend/src/components/resume/ResumeContent.vue`：严格按新原型渲染 Hero（avatar/name/handle/tagline/隐私提示）、关于我 lead+callout、技术与能力 tech-cat/list/item、项目经历 proj 卡片、工作经历 exp 时间线、侧栏个人信息/教育/资质证书
- [x] 4.3 在 `ResumeContent.vue` 中实现 sticky 锚点导航与 `IntersectionObserver` 滚动高亮
- [x] 4.4 实现新原型响应式（920px 单栏、720px hero 纵向）与打印样式
- [x] 4.5 重写 `frontend/src/views/ResumeView.vue`：`useApi` 调 `GET /api/public/resume` 获取生效版本数据传入 `ResumeContent.vue`；失败降级默认数据并提示
- [x] 4.6 浏览器对比页面与原型：Hero/锚点/关于我/技术/项目/经历/侧栏逐区块核对通过（无 console/page error）

## 5. 前端：后台简历管理页（含版本管理）

- [x] 5.1 新建 `frontend/src/views/admin/ResumeManageView.vue`：加载版本列表（名称/生效标记/更新时间）与选中版本详情
- [x] 5.2 实现版本操作：切换生效（`PUT /:id/activate`）、新建版本（`POST /`，基于当前编辑内容复制）、删除版本（`DELETE /:id`，生效版本被拒时提示）、点击版本切换编辑对象
- [x] 5.3 分区块表单编辑当前选中版本（版本名称/基本信息/个人信息/关于我/教育背景/技术与能力/项目经历/工作经历/资质证书），列表型区块支持增删
- [x] 5.4 在管理页右侧引入预览区，复用 `ResumeContent.vue` 实时渲染编辑中的表单状态
- [x] 5.5 实现保存：`useApi.put('/api/admin/resume/:id', { name, content })`，成功提示、失败保留编辑内容并展示错误
- [x] 5.6 在 `frontend/src/router/index.js` 增加 `/admin/resume` 路由（`layout-admin` + `auth: true`）
- [x] 5.7 在 `frontend/src/layouts/AdminShell.vue` 侧边栏新增「简历模块 → 简历管理」导航入口

## 6. 联调与验收

- [x] 6.1 前台简历页从接口读取生效版本数据渲染（heroName=林知墨、5 锚点、4 分类、3 项目、3 经历），与原型样式一致
- [x] 6.2 后台修改简历（tagline/新增项目）并保存，`GET /public/resume` 立即返回修改内容（MATCH=true，验证后已恢复）
- [x] 6.3 后台新建第二版本并切换生效，前台刷新展示新版本；切回原版本后前台恢复；删除测试版本成功
- [x] 6.4 后台尝试删除当前生效版本被拒（400）并提示；删除非激活版本成功
- [x] 6.5 后台预览区（previewHeroName）与前台展示一致（同一 ResumeContent 组件）
- [x] 6.6 再次执行 seed：`Resume skipped: 1 version(s) already exist`，不覆盖不重复
- [x] 6.7 未登录访问管理接口返回 401；前台接口失败时降级默认数据并提示（FALLBACK OK=true），不白屏
