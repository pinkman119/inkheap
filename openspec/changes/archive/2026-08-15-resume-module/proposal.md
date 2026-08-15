## Why

当前「首页-简历」页面（`ResumeView.vue`）基于旧的 mock 数据结构手写样式，与设计团队提供的最新原型 `resume.html` 差距较大：缺少锚点导航、关于我/教育背景/技术与能力等区块的布局与视觉均不符合新原型，且页面数据完全来自前端硬编码的 mock 文件，无法通过后台管理进行替换。

同时后台目前没有任何简历管理入口，运营无法修改前台展示的简历内容。需要按新原型重做简历页面，并建立「简历管理」后台模块，将简历数据存储到数据库，实现前台展示与后台管理的前后端联通。

## What Changes

- **替换前端原型文件**：将 `frontend/prototypes/resume.html` 更新为设计团队提供的最新原型（新布局、新样式、锚点导航）。
- **重构前台简历页面**：严格按新原型 `resume.html` 的布局与样式重写 `ResumeView.vue`：
  - Hero 区（姓名、handle、tagline、下载按钮、隐私提示图标）
  - 页面内锚点导航（关于我 / 教育背景 / 技术与能力 / 项目经历 / 工作经历），滚动监听高亮
  - 关于我：lead-text 段落 + callout 引用块
  - 技术与能力：`tech-cat` + `tech-list` + `tech-item`（名称 + 描述）展示，替代旧的可折叠 skill-category 卡片
  - 项目经历：`proj` 卡片（标题 + 年份 + 描述 + 标签）
  - 工作经历：`exp` 时间线
  - 侧边栏：个人信息（邮箱 / 微信 / 意向城市 / 政治面貌 / 在职状态）、教育背景、资质/证书标签组
  - 响应式布局与打印样式
- **后台新增「简历模块-简历管理」**：新建管理页面，可编辑前台简历页展示的全部内容（基本信息、个人信息、教育背景、技术与能力、项目经历、工作经历、资质证书），编辑后提供即时的简历预览效果。
- **前后端联通**：后端新增简历模块（Prisma 模型 + Module/Controller/Service），提供简历查询与更新 API；前台简历页通过 API 获取数据，后台通过 API 保存修改。
- **Mock 数据入库**：将当前 `frontend/src/data/resume.js` 中的简历 mock 数据迁移为数据库种子数据，前端不再硬编码。
- **多版本管理**：后端与后台支持简历多版本管理——可创建多个简历版本、为版本命名、编辑任意版本、删除版本，并可切换「当前生效版本」；前台始终展示当前生效版本。种子数据作为初始版本（默认激活）。

## Capabilities

### New Capabilities

- `resume-page`: 前台简历展示页面。按新原型布局与样式渲染简历，通过后端 API 获取「当前生效版本」数据，支持锚点导航、响应式与打印。
- `resume-api`: 简历后端 API。提供简历数据模型（Prisma，多版本 + 激活标记）、查询当前生效版本、版本列表/详情/新建/更新/删除/切换激活的接口，供前台页面与后台管理共用。
- `resume-admin`: 后台简历管理能力。提供「简历模块-简历管理」页面，支持版本列表与切换、编辑简历各区块内容并在保存前预览。
- `resume-versions`: 简历多版本管理能力。支持创建/命名/编辑/删除简历版本，切换当前生效版本；前台仅展示生效版本，删除/切换遵循单活跃版本约束。

### Modified Capabilities

<!-- 现有 specs 中无简历相关能力，无既有需求变更 -->

## Impact

- **前端**：
  - `frontend/prototypes/resume.html`（替换为最新原型）
  - `frontend/src/views/ResumeView.vue`（按原型重写）
  - `frontend/src/data/resume.js`（mock 数据改为从接口获取，原数据转为种子数据）
  - 新增 `frontend/src/views/admin/ResumeManageView.vue` 及路由
  - `frontend/src/composables/useApi.js`（新增 resume API 方法）
  - 后台侧边栏导航（`AdminShell`/路由）新增简历管理入口
- **后端**：
  - `backend-node/prisma/schema.prisma`（新增 Resume 模型）
  - `backend-node/prisma/seed.ts`（简历种子数据）
  - 新增 `backend-node/src/modules/resume/`（module / controller / service / dto）
  - `backend-node/src/app.module.ts`（注册 ResumeModule）
- **数据**：新增 `Resume` 数据库表（每条记录为一个版本，含名称、`content` JSON 与激活标记 `isActive`），需要执行 Prisma migration；种子数据创建初始版本并标记为激活。
