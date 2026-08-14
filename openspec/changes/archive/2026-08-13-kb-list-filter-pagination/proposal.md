## Why

前台知识库页（`/articles`）目前一次性拉取 `GET /articles?pageSize=200`，分类筛选与关键词搜索都在前端内存中完成：左侧点击分类只过滤已加载的 200 条、文章量增长后不准确；"动态"侧栏的 feedItems 仍是 `data/articles.js` 中的静态假数据。后端公开接口 `GET /articles` 已完整支持 `page/pageSize/search/categoryKey/status` 并返回 `{items,total,page,pageSize,totalPages}`，无需后端改动即可让列表筛选与动态列表全部接入后端，保证数据实时、准确并支持真正的分页加载。

## What Changes

- **列表筛选接入后端**：左侧分类点击、关键词搜索改为请求后端 `GET /articles`（复用现有接口），不再做前端内存过滤；筛选条件变化时从第 1 页重新拉取。
- **分类筛选语义对齐**：前端当前按"选中分类含子孙"过滤，后端 `categoryKey` 为精确匹配单层。本次将分类筛选改为携带所选分类及其全部子孙 key 的集合参数（后端按数组匹配），保持"选中父分类显示子孙文章"的既有交互语义。
- **动态列表接入后端**：新增"动态"列表数据源，改为请求后端已发布文章，按时间由近及远排序、每页 20 条。
- **两页预加载 + 触底翻页**：进入页面即同时请求第 1、2 页（预加载两页）；第 1 页返回立即渲染，第 2 页返回后追加；列表滚动到底部时加载第 3 页，之后每触底加载下一页，直至无更多数据。
- **删除静态动态数据**：移除对 `frontend/src/data/articles.js` 中静态 `feedItems` 的依赖。
- **列表下方"回到顶部"**：在文章列表底部新增"回到顶部"按钮，页面滚动超过约 240px 时显示，点击平滑滚动至页面最上方，回顶后自动隐藏。
- **分类展开/收起按钮**：文章管理页顶部"收起"按钮改为"展开/收起"切换（展开显示"收起"、收起显示"展开"）；知识库页分类树标题旁新增同样的"展开/收起"文字按钮。两者均一键全展开/全折叠，文字随状态切换。
- **分类计数统一为 `3 / 10`**：`3`=本分类直接挂载的文章数，`10`=本分类及其所有子分类下文章总数。后端 `category.service.ts` 新增 `articleCountWithChildren`，两个页面的分类节点统一显示 `direct / withChildren`；知识库页移除基于已加载列表的旧前端计数统计。
- **Bug 修复（文章管理）**：「全部」节点此前显示当前筛选条件下的 `total`，点击具体分类后数字会跟随变化甚至归零。改为维护独立的 `allTotal`（仅在选择「全部」时刷新的全库总数），「全部」计数稳定。
- **知识库分类加「全部」**：分类树顶部新增「全部」节点，点击等同于取消分类筛选（显示全部文章），未选中任何分类时高亮，逻辑与文章管理一致。

## Capabilities

### New Capabilities
- `kb-article-list`: 前台知识库文章列表能力，涵盖左侧分类 + 搜索的后端筛选、已发布文章时间倒序的动态列表、以及"两页预加载 + 触底翻页"的无限滚动分页。

### Modified Capabilities
<!-- 无既有 spec 能力需修改（openspec/specs 当前为空） -->

## Mock 数据与冒烟测试

为验证"动态列表两页预加载 + 触底翻页"需要后端存在 **超过 40 条已发布文章**，而当前 seed 仅 6 篇。本次新增一个独立的 mock 数据脚本 `backend-node/prisma/mock-data.ts`：

- **分类**：沿用 `Category` 树（与前端 `categoryTree` 的 key 对齐，如 `nodejs-db-mysql`、`ai-spec-openspec`），保证筛选参数可用。
- **文章**：批量生成 **60 篇已发布文章**，按 `createdAt` 从近到远分散到各分类（含跨层级 key，以便验证"选中父分类含子孙"的多值筛选），`slug` 唯一、`viewCount` 随机、`tags` 为 JSON 串。
- 运行方式：`npx prisma db seed -- --mock`（在现有 `prisma/seed.ts` 基础上扩展 `--mock` 分支，或单独脚本），灌入 `dev.db`，不影响排查环境。

冒烟测试（后端接口层，无需启动前端即可验证契约）：

- **筛选**：`GET /articles?categoryKey=nodejs` 返回该分类及子孙文章；`GET /articles?search=MySQL` 命中标题/摘要；二者组合取交集。
- **动态分页**：`GET /articles?page=1&pageSize=20` 返回最新 20 条且 `total>=60`；`page=2` 返回 20 条；`page=3` 返回剩余；校验 `createdAt` 由近及远、页码连续无重复、末页 `hasMore=false`。
- 用 curl 脚本（`openspec/changes/.../smoke-test.sh`）固化以上断言，运行即出 PASS/FAIL。

## Impact

- 前端（主改动）：`frontend/src/views/ArticleListView.vue`（筛选逻辑改为请求后端、动态列表接入接口、新增预加载 + 触底加载）；`frontend/src/composables/useApi.js` 无需改动（fetch 封装已可用）。
- 后端（无接口改动）：公开接口 `GET /articles` 已支持所需参数；若分类含子孙匹配需后端小幅增强（`categoryKey` 支持数组/子分类集合），详见 design。
- 依赖：无限滚动使用原生 `IntersectionObserver`（或现有滚动事件），无新增第三方库。
- 风险：触底加载需处理请求竞态（快速滚动）、加载态、错误重试与空状态；分类筛选数组参数需与后端对齐后再实施。
