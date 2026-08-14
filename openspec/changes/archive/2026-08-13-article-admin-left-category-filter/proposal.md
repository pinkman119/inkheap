## Why

后台文章管理页当前用"顶部分类 Tab + 上一页/下一页按钮"的组织方式，分类切换与列表分离、分类入口不直观，且分页在文章量大时交互繁琐。为提升运营效率，需要将分类管理前置为左侧栏（点击即筛选右侧列表），并把搜索、状态、分类三类筛选统一收敛到同一个后端列表接口，同时改用"默认 50 条 + 滚动加载"的分页模式，使整个文章管理页与后端数据保持一致、操作更连贯。

## What Changes

- 移除文章管理页上方的分类标签栏（"全部、12、AI工程化…"），改为页面左侧的**分类管理侧栏**：展示分类树，点击分类节点即筛选右侧文章列表。
- 左侧分类栏支持"分类管理"能力：可查看分类，并作为筛选入口联动右侧列表。
- 搜索框与状态筛选复用现有 `/admin/articles` 接口，并与左侧分类筛选**共用同一接口参数**（新增/保留 `search`、`status`、`categoryKey`），不再分接口。
- 文章列表分页改为 `pageSize=50` 的滚动加载（infinite scroll）：首屏加载 50 条，滚动到底部自动加载下一页，直至数据耗尽。
- 整个文章管理页接入后端数据（`/admin/articles` + `/admin/categories`），保持新建/编辑/删除等既有写操作不变。

> 后端 `GET /admin/articles` 已支持 `search`、`categoryKey`、`status`、`page`、`pageSize` 参数并返回 `{items,total,page,pageSize,totalPages}`，分类接口 `/admin/categories`、`/admin/categories/tree` 已存在，本次前端改造可直接复用，无需后端改动。

## Capabilities

### New Capabilities
- `article-admin`: 后台文章管理页能力，涵盖左侧分类管理侧栏、分类/搜索/状态共用同一列表接口的筛选、以及 50 条/页的滚动加载分页。

### Modified Capabilities
<!-- 无既有 spec 能力需修改（仓库尚无 article-admin 相关 spec） -->

## Impact

- 前端文件：`frontend/src/views/admin/ArticleListView.vue`（主改动：移除顶部分类 Tab、新增左侧分类侧栏、整合筛选、改滚动分页）。
- 可参考/复用：`frontend/src/views/admin/CategoryManageView.vue`（既有分类树渲染）、`frontend/src/views/admin/components/`（既有列表/搜索/状态子组件）、`frontend/src/api/admin.js`（既有 `getArticles`/`getCategories` 调用）。
- 后端：无改动（接口契约已满足），仅前端按现有参数调用。
- 依赖：滚动加载可用现有前端栈实现，无需新增第三方库（如需可选用轻量 IntersectionObserver，无新依赖）。
- 风险：移除顶部分类 Tab 属于交互结构变更，需在 design 中明确"全部"入口改为左侧"全部"节点保留；滚动加载需处理加载态、错误重试与空状态。
