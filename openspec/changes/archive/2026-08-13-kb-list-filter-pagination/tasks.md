## 1. 后端：分类多值筛选支持

- [x] 1.1 修改 `backend-node/src/modules/article/dto/query-article.dto.ts`：为 `categoryKey` 补充注释，声明支持逗号分隔多值（如 `categoryKey=a,b,c`）
- [x] 1.2 修改 `backend-node/src/modules/article/article.service.ts`：拆分 `categoryKey` 为 key 数组，单值走精确匹配、多值走 `{ in: keys }`，保持向后兼容
- [x] 1.3 用 curl/接口测试验证三种调用：`categoryKey=a`、`categoryKey=a,b`、无 `categoryKey`，确认返回符合预期且管理端不受影响

## 2. 前端：主列表筛选接入后端

- [x] 2.1 在 `ArticleListView.vue` 新增 `fetchArticleList({ key, search, page, pageSize })` 封装，复用现有 `useApi` 的 fetch
- [x] 2.2 左侧分类点击改为请求后端：使用 `descendantKeys(key)` 收集选中节点及子孙 key，逗号拼接后作为 `categoryKey` 参数；清空筛选时不携带该参数
- [x] 2.3 搜索框输入增加 300ms 防抖，停顿后携带 `search` 参数重新请求后端
- [x] 2.4 任一筛选条件变化时清空列表、重置到第 1 页，并用递增请求序号守卫丢弃过期响应
- [x] 2.5 删除前端内存过滤逻辑（`searchIndex`、`hiddenFlags` 相关代码）
- [x] 2.6 补齐主列表加载态/空态/错误重试展示（空态沿用"该分类下暂无文章"）
- [x] 2.7 分类树节点计数改为来源 `GET /categories` 的 `articleCount`（替换基于已加载列表的 `countUnder`）

## 3. 前端：动态栏分页加载

- [x] 3.1 新增 `fetchFeedPage(page)` 封装（`pageSize=20`，依赖后端默认 `createdAt desc` 排序）
- [x] 3.2 进入页面并行请求第 1、2 页：第 1 页返回立即渲染 20 条，第 2 页返回后追加至 40 条
- [x] 3.3 动态栏列表底部添加哨兵元素，用 `IntersectionObserver`（root 为 `.timeline` 滚动容器）实现触底加载下一页，并用 `loadingMore` 锁防重复请求
- [x] 3.4 由 `total` 推导 `hasMore`，已加载完时展示"没有更多了"并停止加载
- [x] 3.5 "刷新"按钮改为重载第 1、2 页（沿用既有旋转动效）
- [x] 3.6 移除对 `frontend/src/data/articles.js` 中静态 `feedItems` 的依赖，改用后端数据（日期格式化为 `YYYY-MM-DD`）

## 5. Mock 数据与冒烟测试

- [x] 5.1 新增 `backend-node/prisma/mock-data.ts`：生成 60 篇已发布文章（覆盖各分类 key、createdAt 由近及远、slug 唯一、tags 为 JSON 串、viewCount 随机），含分类树 upsert（与前端 categoryTree key 对齐）
- [x] 5.2 在 `package.json` 中增加 `prisma:mock` 脚本（如 `ts-node prisma/mock-data.ts`），幂等 `upsert`
- [x] 5.3 运行 mock 脚本灌入 `dev.db`，确认 `total>=60`
- [x] 5.4 新增 `openspec/changes/kb-list-filter-pagination/smoke-test.sh`：断言全量 `total>=60`、动态分页 page1/2/3 无重复且递减、分类多值筛选命中、搜索命中、组合交集；输出 PASS/FAIL
- [x] 5.5 运行冒烟脚本，确认全部 PASS

## 6. 列表下方“回到顶部”按钮

- [x] 6.1 在 `ArticleListView.vue` 文章列表（`.article-list`）下方、`</section>` 前新增"回到顶部"按钮，默认隐藏
- [x] 6.2 监听 `window` 滚动：滚动超过约 240px 时显示按钮，回到顶部后自动隐藏
- [x] 6.3 点击按钮平滑滚动到页面最上方（`window.scrollTo({top:0,behavior:'smooth'})`），并在 `onBeforeUnmount` 移除滚动监听
- [x] 6.4 补充 `.back-to-top` 样式（圆角胶囊、hover 高亮、`.hidden` 隐藏）

## 7. 分类展开/收起按钮 + 计数 `3 / 10`

- [x] 7.1 后端 `category.service.ts`：`findAll` 新增 `articleCountWithChildren`（本分类 + 所有子分类文章总数），与直接数 `articleCount` 一并返回（tree 接口继承该字段）
- [x] 7.2 文章管理页（`admin/ArticleListView.vue`）：顶部"收起"按钮改为"展开/收起"切换——`allExpanded` 状态，展开显示"收起"、收起显示"展开"；点击 `toggleExpandAll` 全展开/全折叠
- [x] 7.3 文章管理页：节点计数改为 `node.count / node.countWithChildren`（直接 / 含子孙）
- [x] 7.4 知识库页（`ArticleListView.vue`）：分类树标题旁新增"展开/收起"文字按钮（`toggleExpandAll`，基于 `collapsedKeys` 集合），文字随 `allExpanded` 切换
- [x] 7.5 知识库页 + `CategoryTreeNode.vue`：计数改为 `direct / withChildren`（`3 / 10` 形式），来源后端 `articleCount` / `articleCountWithChildren`；移除旧的前端 `countUnder` 统计
- [x] 7.6 收起按钮旁补充计数标志（节点右侧 `3 / 10` pill，含 hover title 说明）

## 8. Bug 修复：文章管理“全部”计数归零 + 知识库分类加“全部”

- [x] 8.1 文章管理页：新增 `allTotal`（不带分类筛选的全库总数），“全部”节点显示 `allTotal`；仅在 `selectedCategoryKey === null` 且重置加载时刷新，点击具体分类后不再变化（修复点击分类后“全部”数量变 0 的问题）
- [x] 8.2 知识库页：分类树顶部新增“全部”节点，点击等同 `selectCategory(null)`（取消分类筛选显示全部文章），`currentKey === null` 时高亮，样式对齐 `.tree-row`

## 4. 收尾验证

- [x] 4.1 运行前端 `npm run dev` 与后端，无编译错误
- [x] 4.2 手动验证：点击分类、输入搜索、清空条件、动态栏首屏 40 条、触底加载第 3 页直至"没有更多了"、刷新按钮
- [x] 4.3 检查 `frontend/frontend_run.err`、`backend-node/backend_run.err` 无新增报错
