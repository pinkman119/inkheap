## Context

当前简历模块现状：

- **前台**：`frontend/src/views/ResumeView.vue` 根据旧原型手写，使用 `frontend/src/data/resume.js` 的 mock 数据，缺少新原型中的锚点导航、关于我 callout、技术与能力列表等结构与样式，且数据完全硬编码，无法运营维护。
- **后台**：无任何简历管理入口（`AdminShell` 侧边栏仅有仪表盘、首页管理、分类管理、文章管理）。
- **后端**：已有 HomePage 单记录配置模式（`home_page` 表，单条记录，`home` 为固定 id），以及 `public/*`、`admin/*` 双控制器 + `JwtAuthGuard` 的模式，可作为简历模块的参照。
- **新原型**：`C:\Users\admin\WorkBuddy\2026-08-08-13-51-30\prototypes\resume.html` 提供了最终视觉与结构基准，需要严格还原其布局、样式、锚点导航、响应式与打印样式。
- **版本需求**：运营需要管理多份简历版本并在后台一键切换前台展示的版本（如节日/活动简历、多个候选人简历），因此本变更将简历设计为**多版本 + 单活跃版本**模型。

约束：沿用现有技术栈（Vue 3 + Vite 前端、NestJS + Prisma 后端、SQLite）；后台路由遵循 `layout-admin` + 路由守卫；前端 API 调用统一走 `useApi` 组合式函数（base `http://localhost:3000/api`，自动带 token）。

## Goals / Non-Goals

**Goals:**

- 将新原型文件落地到 `frontend/prototypes/resume.html`。
- 前台简历页严格按新原型重构（结构、样式、锚点导航、响应式、打印），数据来自后端 API 的**当前生效版本**，失败时降级默认数据。
- 后台新增「简历管理」页面：分区块编辑简历全部内容、版本列表与切换、实时预览。
- 后端新增 Resume 模型与模块：支持版本列表/详情/新建/更新/删除/切换激活，前台与后台共用。
- 将现有 mock 数据迁移为种子数据（初始版本，默认激活），写入数据库。

**Non-Goals:**

- 不改动原型本身之外的其它前台页面（首页、文章等）。
- 不做草稿审批流/定时发布等复杂发布流程——「编辑任意版本 + 手动切换生效版本」即可满足需求。
- 不在本次实现富文本编辑器，各区块以结构化表单 + 纯文本/文本域为主。

## Decisions

### 1. Resume 模型采用「多版本 + JSON 内容字段 + 激活标记」

仿照 HomePage 的 JSON 内容存储思路，但将"单条记录"扩展为"每条记录一个版本"，通过 `isActive` 标记当前生效版本，满足多版本管理与一键切换：

```prisma
model Resume {
  id        String   @id @default(uuid())
  name      String   @default("默认版本") // 版本名称，便于后台区分
  content   Json     @default("{}")      // 完整简历 JSON（结构对齐新原型各区块）
  isActive  Boolean  @default(false)     // 是否为当前生效版本（前台展示）
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("resume")
}
```

`content` 为完整简历 JSON（结构对齐新原型各区块与 `resume.js` mock 的字段）。更新接口整体替换 `content`，天然满足"整体替换"语义。版本约束：同一时刻至多一个 `isActive = true`；删除/取消激活唯一生效版本时拒绝操作（保持至少一个生效版本）。

- 备选：拆分为 `resume_profile`、`resume_experience` 等多表 → 需要大量 CRUD，收益低，不采用。
- 备选：单条记录 + content 内嵌版本数组 → 后台列表/切换需解析 JSON、并发覆盖风险高、不利于按版本存储，不采用。

### 2. 后端模块结构对齐 HomePage 模式，接口覆盖版本 CRUD

新建 `backend-node/src/modules/resume/`：

- `resume.module.ts`：注册 `PrismaModule`，导出 service。
- `resume.service.ts`：
  - `findActive()`：返回 `isActive = true` 的版本；不存在时返回 `content = 默认值` 的占位数据（保证前台不崩）。
  - `list()`：返回全部版本（id、name、isActive、createdAt、updatedAt）。
  - `findById(id)`：返回指定版本详情（含 content）。
  - `create(dto)`：新建版本（默认 `isActive = false`；若当前无任何版本，则自动设为 `true`）。
  - `update(id, dto)`：更新指定版本的 name/content。
  - `activate(id)`：事务内将目标版本 `isActive = true`，其余全部置 `false`。
  - `remove(id)`：若目标是唯一生效版本则抛 4xx，否则删除。
- `resume.controller.ts`：
  - `@Controller('public/resume')`：`GET` 公开查询当前生效版本。
  - `@Controller('admin/resume')` + `@UseGuards(JwtAuthGuard)`：`GET /`（列表）、`GET /:id`（详情）、`POST /`（新建）、`PUT /:id`（更新）、`PUT /:id/activate`（切换激活）、`DELETE /:id`（删除）。
- `dto/`：`CreateResumeDto`（name 可选、content `@IsObject()` 必填 + 最小校验如 `name` 非空）、`UpdateResumeDto`（name/content 可选但至少一项）。

在 `app.module.ts` 注册 `ResumeModule`。

### 3. 默认/种子数据结构（对齐新原型区块）

默认数据与种子数据使用同一份结构，字段与 `resume.js` mock 对齐并补充新原型所需字段：

```ts
{
  name, handle, tagline, avatar,
  heroInfo,                      // 隐私提示文案（原型 hero-info）
  basicInfo: { email, wechat, city, politics, workStatus },
  about: { lead, callout },
  education: [{ school, period, degree }],
  skills: [{ category, items: [{ name, desc }] }],
  projects: [{ title, year, desc, tags: [] }],
  experiences: [{ role, period, org, desc }],
  certificates: []               // 资质/证书标签组
}
```

### 4. 前台页面结构：复用渲染逻辑

`ResumeView.vue` 重写为新原型布局；抽取一个无状态渲染组件（如 `ResumeContent.vue`）承载"主内容 + 侧边栏"的完整渲染，前台页面与后台预览区**复用同一组件**，保证预览与前台一致。

- 前台 `ResumeView.vue`：`onMounted` 调 `GET /public/resume`（`useApi`），成功后传数据给渲染组件；失败时使用内置默认数据并提示。
- 锚点导航：顶部 sticky 导航 + `IntersectionObserver` 高亮当前区块（对齐原型脚本）。

### 5. 后台简历管理页（版本列表 + 编辑 + 预览）

新增 `frontend/src/views/admin/ResumeManageView.vue`（路由 `/admin/resume`，`layout-admin` + `auth: true`）：

- **版本列表区**（顶部或左侧）：展示全部版本（名称 / 生效标记 / 更新时间），支持：
  - 点击选中某版本进入编辑；
  - 「切换生效」按钮调用 `PUT /admin/resume/:id/activate`，成功后刷新列表（生效标记移动到新版本）；
  - 「新建版本」调用 `POST /admin/resume`（默认基于当前生效版本内容复制，也可空白新建），出现于列表并可立即编辑命名；
  - 「删除」调用 `DELETE /admin/resume/:id`（生效版本删除被后端拒绝时展示错误提示）。
- **左侧表单区**：分区块编辑当前选中版本（基本信息 / 个人信息 / 关于我 / 教育背景 / 技术与能力 / 项目经历 / 工作经历 / 资质证书），列表型区块支持增删条目。
- **右侧预览区**：复用 `ResumeContent.vue`，绑定表单的响应式状态，实时预览。
- **保存**：`PUT /admin/resume/:id` 提交当前选中版本的整体 content（及名称）；成功提示，失败保留编辑内容并展示错误。
- **入口**：`AdminShell.vue` 侧边栏新增「简历模块 → 简历管理」导航项。

### 6. Mock 数据迁移与种子

`backend-node/prisma/seed.ts` 增加：将 `resume.js` 内容转为 `content` JSON，`upsert` 一条「默认版本」记录并 `isActive = true`（已有记录不覆盖）。前端 `frontend/src/data/resume.js` 中的 mock 转为内置降级数据来源（或移入组件常量），不再作为页面数据源。

## Risks / Trade-offs

- **整体替换 JSON 的并发覆盖** → 版本按记录隔离，后台为单管理员操作，风险低；若未来需要更强历史能力可扩展发布/草稿字段。
- **切换版本的事务一致性** → `activate` 在 Prisma 事务中执行（先全部置 false 再置目标 true），保证至多一个激活版本。
- **严格还原原型样式的工作量** → 通过直接复用原型 HTML 结构与 CSS 变量/类名，配合渲染组件复用，降低两份视图漂移风险。
- **预览与前台样式漂移** → 预览复用同一渲染组件，从设计上消除漂移。
- **迁移 dev.db** → 需执行 `prisma migrate dev`/`db push` 生成 `resume` 表，属向后兼容的新增表，不影响既有数据。
