## Context

后台已存在完整的分类基础设施，但运营人员缺少可视化入口：

- **后端**（`backend-node/src/modules/category/`）：`Category` Prisma 模型（`key`, `name`, `parentKey`, `sortOrder`, `icon`），`depth` 由 `@@validate(depth <= 3)` 约束（三级限制）。`CategoryController` 已实现 `GET /admin/categories`、`GET /admin/categories/tree`、`POST /admin/categories`、`PUT /admin/categories/:id`、`DELETE /admin/categories/:id`。`findTree()` 构建层级树；`remove()` 在有关联文章时返回 409 禁止删除。`key` 有唯一约束。
- **前端**：`ArticleListView.vue`（前台"知识库"）已用 `categoryTree` 渲染三级分类树。admin 侧边栏（`AdminShell.vue:44`）将文章管理归在"内容"分组下，无分类管理入口。

本设计的任务是补齐**后台管理 UI** 与少量**后端展示字段**，并把分组名对齐为"知识库"。

## Goals / Non-Goals

**Goals:**
- 提供一个树形分类管理页面，支持最多三级分类的创建、编辑、查看、删除。
- 通过侧边栏独立菜单项访问，位于"知识库"分组、排在文章管理之上。
- 前端软约束三级深度 + 后端 `depth <= 3` 校验兜底。
- 管理页树节点展示每类文章数（依赖后端新增 `articleCount`）。

**Non-Goals:**
- 不改动 `Category` Prisma 模型结构、三级深度约束、key 唯一约束。
- 不改动前台"知识库"展示页、前台路由与文案。
- 不支持 key 创建后修改（本期冻结），不实现 key 级联更新。
- 不做分类拖拽排序（仅用 `sortOrder` 字段，手填数字排序）。
- 不处理分类批量导入/导出。

## Decisions

### D1. 分类管理为独立路由 + 侧边栏菜单项（方案 B）
- **选择**：`/admin/categories` 独立路由，侧边栏"知识库"分组下新增"分类管理"，位于"文章管理"上方。
- **理由**：用户明确选择方案 B；分类与文章是不同管理对象，独立页面职责清晰；与现有"文章管理"同级菜单一致。
- **替代**：方案 A（文章管理页内分区）被否——会模糊两个对象的边界，且文章页已较重。

### D2. 新建/编辑用 Modal 弹窗，而非独立编辑页
- **选择**：点击"新建/编辑"弹出 Modal，字段含父级下拉。
- **理由**：分类字段少（名称/key/父级/排序/图标），弹窗就地操作更轻；与 `ArticleListView` 已用的 Teleport Modal 删除确认风格一致；可在弹窗内直接选定父级新建子分类。
- **替代**：独立 `CategoryEditView` 路由页——被否，跳转过重。

### D3. key 创建后冻结
- **选择**：前端不暴露"修改 key"入口；`CreateCategoryDto` 仍允许 key 字段，但本期 UI 不编辑它。
- **理由**：改 key 需级联更新子分类 `parentKey` 与文章 `categoryKey`，破坏性大；本期需求不要求改 key。
- **替代**：允许改 key 并后端级联——推迟到后续变更。

### D4. 前端软约束 + 后端兜底三级限制
- **选择**：第 3 层节点的"添加子级"按钮禁用；同时保留后端 `depth <= 3` 校验，前端对返回的校验错误做友好提示。
- **理由**：避免依赖后端 500/校验异常作为主路径，提升体验；后端约束作为最终防线。
- **注意**：当前后端 `create` 不在入口校验父级存在性与层级，三级限制靠 DB `model Validation` 在保存时触发。前端软约束可避免绝大多数违规；极端情况下（绕过 UI 直接调 API）后端仍会拦截。

### D5. 后端 `findAll` 附带 `articleCount`
- **选择**：在 `CategoryService.findAll` 中为每个分类统计文章数并随列表返回，管理页树节点展示 `(N)`。
- **理由**：前端一次性拿到树与计数，避免每个节点分别调接口；复用后端已实现的计数逻辑（与 `remove` 同源）。
- **替代**：前端分别调计数接口——被否，N+1 请求过多。

## Risks / Trade-offs

- **[风险] 后端 `create` 不校验父级存在性**：若父级 key 无效，可能创建出孤儿节点（parentKey 指向不存在的 key）。
  → 缓解：前端父级下拉只列出真实存在的分类；后端兜底可在后续补充父级存在性校验。本期接受。
- **[风险] 三级限制依赖 DB Validation 返回非友好错误**：直接调 API 越级时返回 500/校验错误。
  → 缓解：前端软约束覆盖 UI 路径；本期不强化 API 入口校验（记录为后续项）。
- **[权衡] 冻结 key**：牺牲灵活性换取安全性，改 key 需后续变更。
- **[权衡] 不实现拖拽排序**：用 `sortOrder` 数字手填，体验略弱但实现简单。

## Migration Plan

1. 后端：`CategoryService.findAll` 增加 `articleCount`（附加字段，向后兼容，不影响现有 `/tree` 与 `ArticleListView`）。
2. 前端：新增 `CategoryManageView.vue`、路由、侧边栏菜单项与分组改名。
3. 验证：访问 `/admin/categories` 可建三级树；第 3 层禁用"+子级"；有文章的分类禁用删除；树节点显示文章数。
4. 回滚：均为新增/小改，回滚只需还原文件，无数据迁移。

## Open Questions

- 父级下拉在多级时是否做分组缩进显示（如 `前端开发 / Vue`）？建议做，待实现时确认。
- `articleCount` 是否计入子分类文章（仅直接归属 or 含子孙）？建议仅直接归属，与 `remove` 校验口径一致。
