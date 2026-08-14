## Context

后台文章管理页 `frontend/src/views/admin/ArticleListView.vue` 当前采用"顶部分类 Tab + 上一页/下一页按钮"结构：
- 分类切换位于页面顶部（`全部 / 12 / AI工程化 …`），与列表区纵向分离，分类入口不直观，且"全部"之外还需单独管理分类（现有独立页面 `CategoryManageView.vue`）。
- 列表筛选中，搜索与状态（`search`/`status`）已调用 `GET /admin/articles`，但**分类筛选未作为 `categoryKey` 参数传入接口**，因此顶部 Tab 实际是前端本地切换而非后端筛选。
- 分页为按钮式（`prev/next` + `page`），文章量增大时翻页繁琐。

后端契约已满足本次需求：`GET /admin/articles` 支持 `search`、`categoryKey`、`status`、`page`、`pageSize`，返回 `{items,total,page,pageSize,totalPages}`；分类接口 `GET /admin/categories`、`/admin/categories/tree` 已存在。前端通过 `useApi().get(path)` 调用（`frontend/src/composables/useApi.js`）。

本次为纯前端改造，后端无需改动。

## Goals / Non-Goals

**Goals:**
- 将分类管理前置为列表左侧的分类管理侧栏，移除顶部分类 Tab；点击分类即筛选右侧列表。
- 分类、搜索、状态三类筛选统一收敛到同一个 `GET /admin/articles` 接口（参数 `categoryKey`/`search`/`status`）。
- 列表分页改为 50 条/页的滚动加载（infinite scroll），滚动到底自动续拉下一页。
- 保持新建/编辑/删除/发布切换等写操作接入后端不变。

**Non-Goals:**
- 不改动后端接口（契约已满足）。
- 不在本次重写分类的"增删改"管理能力（分类管理以"查看 + 作为筛选入口"为主；既有独立分类管理页保留）。
- 不引入新的分页/无限滚动第三方库（用原生 `IntersectionObserver` 即可）。
- 不改动前台（非 admin）文章列表页 `frontend/src/views/ArticleListView.vue`。

## Decisions

1. **布局改为左栏 + 右栏**
   - 左侧：分类管理侧栏，渲染分类树（`/admin/categories` 或 `/admin/categories/tree`），顶部含"全部"节点（等价 `categoryKey=undefined`）；点击节点设置当前 `categoryKey`。
   - 右侧：搜索框 + 状态下拉 + 文章列表（滚动容器）。
   - 替代方案：保留顶部 Tab 仅改分页 —— 不满足"左侧分类管理"诉求，否决。

2. **分类筛选真正走后端**
   - 点击分类节点时，将 `categoryKey` 作为查询参数传给 `GET /admin/articles`（此前前端仅本地过滤）。任一筛选（分类/搜索/状态）变化即重置 `page=1` 并清空已加载列表后重新拉取。
   - 替代方案：前端本地按分类过滤已加载数据 —— 仅对当前页有效、无法跨页，否决。

3. **滚动加载实现**
   - 右侧列表容器监听滚动（或列表底部哨兵元素 + `IntersectionObserver`）；`pageSize` 固定 50；触底且 `page < totalPages` 时 `page++` 并追加 `items`。
   - 首次进入与筛选重置时加载第一页（`page=1`），替换列表；后续追加。
   - 需在响应中保存 `totalPages` 用于判断是否还有更多。
   - 替代方案：保留按钮分页 —— 不满足"滚动加载"诉求，否决。

4. **加载与空状态**
   - 加载更多时显示"加载中…"；错误时显示重试；无数据时显示空状态；到底显示"没有更多了"。
   - 写操作（删除/发布切换）成功后，刷新当前筛选条件下的第一页（或增量更新对应条目），保持列表与后端一致。

## Risks / Trade-offs

- **[筛选重置丢失滚动位置]** 切换分类/搜索/状态时列表重置 → 滚动容器回到顶部，体验可接受；显式 `scrollTop=0`。
- **[快速连续触发加载]** 滚动事件抖动导致重复请求 → 用 `loading` 锁 + 哨兵 `IntersectionObserver` 仅在下一次加载完成后才重新观察。
- **[移除顶部 Tab 的"全部/计数"信息丢失]** 顶部原显示各分类文章数 → 左侧"全部"节点不显示计数（或可选调用带计数的接口）；本期左侧以分类名为准，必要时"全部"节点显示总计 `total`。
- **[分类树过大]** 分类多时左侧栏可滚动，独立滚动区域不挤压右侧列表。

## Migration Plan

- 纯前端文件改动，仅修改 `frontend/src/views/admin/ArticleListView.vue`（必要时拆分左侧栏为独立组件 `components/AdminCategorySidebar.vue`）。
- 无后端迁移；保留既有 `/admin/articles`、`/admin/categories` 调用。
- 回滚：恢复该 `.vue` 文件至改动前即可，无数据迁移风险。

## Open Questions

- 左侧分类栏是否需要内联"新建/编辑分类"操作，还是仅作为筛选入口（本期仅筛选 + 查看，管理仍走既有 `CategoryManageView`）？
- "全部"节点是否展示文章总数计数？默认展示 `total`，待用户确认。
