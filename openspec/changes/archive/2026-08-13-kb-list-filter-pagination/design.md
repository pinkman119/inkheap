## Context

前台知识库页（`frontend/src/views/ArticleListView.vue`）已接入后端公开接口 `GET /articles`，但存在三个问题：

1. **列表筛选在前端内存中完成**：进入页面一次性拉取 `?pageSize=200`，左侧分类点击（`hiddenFlags` 计算属性）与关键词搜索（`searchIndex`）都是对已加载的 200 条做前端过滤，数据量大后不准确，且与后端数据状态脱节。
2. **"动态"栏是静态假数据**：右侧 `feedList` 来自 `frontend/src/data/articles.js` 的 `feedItems`，不是接口数据。
3. **无任何分页/滚动加载机制**。

后端公开接口 `GET /articles`（`article-public.controller.ts` 强制 `status='published'`）已支持 `page/pageSize/search/categoryKey/status`，查询按 `createdAt desc` 排序（`article.service.ts`），返回 `{items,total,page,pageSize,totalPages}`。分类树接口 `GET /categories/tree`、`GET /categories`（含 `articleCount`）已存在。**后端能力基本齐备，本次以前端改造为主，仅需一处极小的后端增强（多分类值）。**

## Goals / Non-Goals

**Goals:**

- 左侧分类点击、关键词搜索改为请求后端 `GET /articles`（复用现有接口），删除前端内存过滤逻辑。
- 分类筛选保持"选中分类含子孙"的既有交互语义。
- 右侧"动态"栏改为后端已发布文章，按时间由近及远排序、每页 20 条，进入页面预加载第 1、2 页（第 1 页返回即渲染），触底加载第 3 页及后续页码。
- 移除静态 `feedItems` 依赖。
- 处理加载态、空态、错误重试、请求竞态。

### 7. 列表下方"回到顶部"

- 在 `.article-list` 之后、`</section>` 前新增 `<button class="back-to-top">`，默认 `.hidden`（`display:none`）。
- 监听 `window` 滚动（passive），当 `scrollY >= 240` 时显示、否则隐藏；`onBeforeUnmount` 移除监听。
- 点击调用 `window.scrollTo({ top: 0, behavior: 'smooth' })` 平滑回到页面最上方。
- 注：当前布局列表随页面整体滚动（`.article-list` 非独立滚动容器），故用 `window` 而非元素滚动。

**Non-Goals:**

- 主文章列表的分页/触底加载（需求中的分页行为仅针对"动态"栏；主列表沿用 `pageSize=200` 一次加载，保持现状）。
- 管理端文章列表的改造（属于 `article-admin-left-category-filter` 变更）。
- 后端新增独立 feed 端点（`GET /articles` 已完全满足契约，不重复造接口）。
- 关键词高亮、搜索历史等搜索增强。

## Decisions

### 1. 复用 `GET /articles`，不新增后端端点

两个"接口"均由现有 `GET /articles` 承担，前端新增两个薄封装函数：

- `fetchArticleList({ key, search, page, pageSize })` → 主列表筛选
- `fetchFeedPage(page)` → 动态栏分页（`pageSize=20`）

**备选方案**：为动态栏新增独立端点（如 `GET /articles/feed`）。**否决**：与现有接口参数/排序/返回结构完全重复，属于过度设计。

### 2. 分类筛选含子孙：后端 `categoryKey` 支持逗号分隔多值

当前后端 `categoryKey` 是精确匹配单层（`where.categoryKey = categoryKey`），而前端既有的"选中父分类显示其子孙文章"需要集合匹配。做法：

- **后端（极小改动）**：`QueryArticleDto.categoryKey` 保持 `string`，`article.service.ts` 中按逗号拆分：单个值走 `= 精确匹配`，多个值走 `{ in: keys }`。向后兼容（旧调用传单个 key 行为不变）。
- **前端**：沿用现有 `descendantKeys(key)` 从分类树收集选中节点及全部子孙 key，`join(',')` 后作为 `categoryKey` 参数。

**备选方案**：改为精确匹配单层（后端零改动）。**否决**：文章通常挂在叶子分类下，选中父分类会得到空列表，破坏既有交互。**备选方案**：新增 `categoryKeys[]` 数组参数。**否决**：逗号分隔对现有 DTO 改动最小，无需新增参数校验管道。

### 3. 列表筛选：防抖 + 重置分页

- 搜索框输入 **300ms 防抖**后再请求；分类点击立即请求。
- 任一筛选条件变化即清空列表、重置到第 1 页。
- 并发请求用 **递增请求序号（token）** 守卫：仅应用最后一次条件发起的响应，丢弃过期响应，避免快速切换分类/关键词时旧数据覆盖新数据。

### 4. 动态栏：两页预加载 + 触底翻页

进入页面时：

```js
const p1 = fetchFeedPage(1)   // 先发起
const p2 = fetchFeedPage(2)   // 并行发起（预加载）
const first = await p1
feedList.value = first        // 第 1 页返回立即渲染
const second = await p2
feedList.value.push(...second) // 第 2 页返回后追加
```

- 触底加载：在动态栏列表底部放一个哨兵元素（sentinel），用 `IntersectionObserver` 观察，`root` 设为动态栏滚动容器（`.timeline`）。哨兵可见且 `hasMore` 且非加载中 → 请求第 3 页，之后每触底请求下一页。
- `hasMore` 由后端 `total/totalPages` 推导：`feedList.length < total`。
- 加载过程中用 `loadingMore` 锁防重复请求。
- "刷新"按钮改为重载第 1、2 页（沿用既有旋转动效）。

### 5. 分类树计数改为后端 `articleCount`

筛选改为后端后，前端不再持有全量列表，现有 `countUnder()`（基于已加载列表统计）会失真。分类树节点计数改为来源 `GET /categories` 返回的 `articleCount`（直接归属统计），保持与后台一致的计数语义。

### 6. 状态与错误处理

- 主列表：首屏 loading、空态（沿用"该分类下暂无文章"）、错误提示 + 重试按钮。
- 动态栏：首屏 loading、触底 loading 行（"加载中…"）、无更多时显示"没有更多了"、请求失败显示重试。

## Risks / Trade-offs

- **快速切换筛选导致旧响应覆盖** → 请求序号 token 守卫，仅应用最新一次请求的结果。
- **动态栏内部滚动 vs 页面滚动** → `IntersectionObserver` 的 `root` 绑定 `.timeline` 滚动容器（`max-height + overflow-y:auto`）；若某屏高下动态栏被拉长，需确保哨兵仍处于容器内。
- **`categoryKey` 逗号分隔改动影响旧调用方** → 单值行为不变、完全向后兼容，管理端不受影响。
- **搜索匹配范围** → 后端 `search` 用 `contains` 匹配 `title/summary/tags`（tags 为 JSON 字符串，contains 对原始串匹配，个别标签文本可能出现模糊命中，可接受）。
- **主列表 `pageSize=200` 上限** → 单分类超过 200 条时仅展示前 200 条，与现状一致；若后续需要可在动态栏同款机制上扩展（非本次目标）。

## Migration Plan

1. 先后端小改动（`categoryKey` 多值支持）并验证：单值、多值、空值三种调用。
2. 前端改造 `ArticleListView.vue`（列表筛选 + 动态栏分页），可独立部署。
3. 后端与前端同时发布；回滚只需还原前端页面文件（后端改动向后兼容，无需回滚）。

## 分类展开/收起按钮与计数 `3 / 10`

### 1. 展开/收起文字按钮

- **文章管理页**：原顶部"收起"按钮（`cat-collapse-all`）改为"展开/收起"切换。维护 `allExpanded`（默认 `true`，默认全展开）；按钮文字随状态切换——展开时显示"收起"、收起时显示"展开"。`toggleExpandAll()` 展开时将全部含子节点的 key 放入 `expandedKeys`、收起时清空。
- **知识库页**：在分类树标题区新增"展开/收起"文字按钮（`.tree-expand-all`）。沿用既有的"折叠集合"`collapsedKeys` 模型（在集合中=折叠，默认空=全展开）。`toggleExpandAll()`：展开时清空集合（全展开）、收起时把所有含子节点的节点 key 加入集合（全折叠）。文字同样随 `allExpanded` 切换。

### 2. 计数 `3 / 10`

语义：`3` = 直接挂载到本分类的文章数；`10` = 本分类 + 其所有子分类下文章总数。

- **后端**：`category.service.ts` 的 `findAll` 在已有 `articleCount`（直接数）基础上新增 `articleCountWithChildren`：利用 `childrenMap` 递归求和（直接数 + 全部后代直接数）。`/categories/tree` 由 `findAll` 构建，自动继承这两个字段。
- **文章管理页**：`flatNodes` 取 `c.articleCount`（直接）与 `c.articleCountWithChildren`（含子孙），节点右侧渲染 `{{ node.count }} / {{ node.countWithChildren }}`。
- **知识库页**：删除原前端 `countUnder`（基于已加载列表统计，列表接入后端后会失真）；改为 `countInfo(key)` 从 `categoryTree` 取节点的 `articleCount` / `articleCountWithChildren`，`provide('catCountInfo', ...)` 注入递归组件 `CategoryTreeNode.vue`，渲染 `direct / withChildren`，并加 `title` 提示。
- 两个页面的计数统一为同一后端数据源，前端不再各自统计。

### 3. 「全部」节点计数修复（文章管理）

问题：`total` 在 `loadArticles` 中始终被赋值为**当前筛选条件下**的后端返回总数，「全部」节点又直接显示 `total`。点击具体分类后，`loadArticles` 带 `categoryKey` 重新请求，返回的 `total` 是该分类的数量（可为 0），导致「全部」数字被覆盖甚至变 0。

修复：新增独立的 `allTotal`（全库文章总数）。仅在 `selectedCategoryKey === null` 且 `reset` 加载时（即处于「全部」视图）刷新 `allTotal`；点击具体分类（`selectedCategoryKey !== null`）时 `allTotal` 保持不变。「全部」节点显示 `allTotal`，列表自身的 `total`/`totalPages`/`hasMore` 仍随筛选变化。

### 4. 知识库分类树顶部「全部」节点

在 `<nav class="tree">` 内、递归组件之前插入一个「全部」`<li>`，点击调用 `selectCategory(null)`（即 `currentKey = null`，取消分类筛选、显示全部文章），`currentKey === null` 时高亮（`.tree-row--active`）。交互与文章管理「全部」一致；样式对齐 `.tree-row`，并补充键盘可达（Enter/Space 选中）。

## Mock 数据设计

为冒烟测试提供可控数据，新增 `backend-node/prisma/mock-data.ts`（复用 `PrismaClient`，通过 `package.json` 的 `prisma.seed` 或独立 `ts-node` 运行）：

- 分类：从前端 `data/articles.js` 的 `categoryTree` 提取全部 leaf key，转成 `Category` 行（含 `parentKey` 三层结构），与前端 `descendantKeys()` 的祖先/子孙关系一致，确保多值筛选可命中。
- 文章：循环生成 **60 篇** `published=true` 文章，`createdAt` 按 `now - i*offset` 递减（i=0 最新），均匀分布到各 leaf key，`slug` 用 `mock-<i>` 保证唯一，`tags` 序列化为 JSON 字符串，`viewCount` 随机 200–2000，`featured` 部分置真。
- 幂等：`slug` 做 `upsert`，重复运行可安全刷新。
- 与现有 `seed.ts` 解耦：mock 脚本只负责"造足够多的已发布文章"，不改动管理员/分类基础数据（分类用 `upsert` 补齐即可）。

## 冒烟测试设计

在 `openspec/changes/kb-list-filter-pagination/smoke-test.sh` 固化接口断言（curl + `jq`）：

1. `total` 断言：未带分页的全量请求 `items` 长度 ≥ 60，确认 mock 生效。
2. 动态分页链：依次请求 `page=1/2/3`，断言 `pageSize=20`、三页包含 60 条且 `slug` 集合无交集、各页 `createdAt` 递减、第 3 页 `hasMore=false`（或 `totalPages=3`）。
3. 分类筛选：随机取一个父分类 key（如 `ai`），请求 `categoryKey=ai-spec-openspec,ai-spec-doc,ai-deploy-infer`（子孙集合），断言返回条数 > 0 且每条 `categoryKey` 均在该集合内。
4. 搜索：`search=MySQL` 断言至少命中 1 条且标题/摘要包含关键词。
5. 组合：父分类 + 搜索取交集，断言结果集为两者子集。

输出 `PASS/FAIL` 汇总，方便 `/opsx:apply` 完成后回归。

## Open Questions

- 主列表是否也要在后续改为分页/触底加载？（本次明确不做，若需要可作为独立变更。）
- 动态栏刷新后是否重置到第 1 页？——设计上取"重载第 1、2 页"，与首次进入行为一致。
