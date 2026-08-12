## Why

后台已存在完整的 `Category` 模型与 CRUD API（含三级深度约束、key 唯一约束、树形构建、删除前文章数校验），前台"知识库"列表页也已用 `categoryTree` 渲染三级分类树。但 admin 后台**缺少分类的可视化管理界面**——运营人员无法在后台创建/编辑/组织分类，只能直接调 API。

同时在 admin 侧边栏中，这些功能被归在名为"内容"的分组下。本变更将：
1. 新增一个后台"分类管理"页面，让运营可在后台维护最多三级分类树；
2. 将该分组名由"内容"改为"知识库"，与前端"知识库"语义对齐。

## What Changes

- 新增后台"分类管理"独立页面（路由 `/admin/categories`），位于侧边栏"知识库"分组下、排在"文章管理"上方。
- 分类以**可折叠树形列表**展示，每个节点显示：名称、key、文章数、操作（`+子级` / `编辑` / `删除`）。
- 新建/编辑分类使用 **Modal 弹窗**，字段：名称、key（自动从名称生成、可手改、创建后只读）、父级（下拉，三级时禁用）、排序、图标。
- 前端软约束：第 3 层节点的"添加子级"按钮禁用；后端 `depth <= 3` 校验继续兜底（友好错误提示）。
- 删除有文章的分类时禁用删除按钮并提示（复用后端 409 文案）。
- admin 侧边栏"内容"分组改名为"知识库"，新增"分类管理"菜单项排在"文章管理"之上。**前台文案与路由不改。**
- 后端 `CategoryService.findAll` 为每个分类附带 `articleCount`，供管理页树形节点显示文章数（前端展示需要，做法 2）。
- 本期 `key` 创建后冻结（前端不暴露改 key 入口），不补 key 级联更新逻辑。

## Capabilities

### New Capabilities
- `category-management-ui`: 后台分类管理页面——树形列表展示、Modal 弹窗新建/编辑、父级选择、三级软约束、文章数展示、删除保护。

### Modified Capabilities
- `category-api`: `CategoryService.findAll` 返回值新增 `articleCount` 字段（每个分类下文章数）。属 API 契约小增量，非破坏性。

## Impact

- **前端新增文件**：
  - `frontend/src/views/admin/CategoryManageView.vue`（核心新建）
  - `frontend/src/router/index.js`（新增 `/admin/categories` 路由）
- **前端改动文件**：
  - `frontend/src/layouts/AdminShell.vue`（"内容"→"知识库" 分组改名 + 新增"分类管理"菜单项）
  - 复用现有 `api` 客户端调用已存在的管理端分类接口（`/admin/categories` 等）
- **后端改动文件**：
  - `backend-node/src/modules/category/category.service.ts`（`findAll` 加 `articleCount`）
  - DTO 可选：如需前端展示 `articleCount`，无需改 DTO（附加字段即可）
- **不改动**：`Category` Prisma 模型、三级深度 `model Validation`、key 唯一约束、DELETE 文章数校验逻辑、前台"知识库"展示页、前台路由与文案。
- **依赖**：复用现有 NestJS + Prisma 后端、Vue 3 + naive-ui 前端技术栈，无新增第三方依赖。
