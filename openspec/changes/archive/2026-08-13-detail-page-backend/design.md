## Context

前台知识库列表（`ArticleListView`）已改为调用后端 `GET /api/articles`。但详情页 `ArticleDetailView.vue`（`/articles/:slug`）仍从 `src/data/articleContent.js` 读取硬编码正文。

后端现状：
- `ArticleService` 已有 `findOne(id)`，但公开路由 `PublicArticleController`（`/articles`）只暴露了列表，详情接口未公开。
- 数据库 `Article` 表含 `slug`（唯一）、`content`、`coverImage`、`published` 等字段。
- 小记（笔记）目前只有前端 `notes.js` / `noteContent.js` 静态数据，后端无对应表。

本次目标：**只把知识库文章详情接入后端**。同时为统一数据模型，在 `Article` 表加 `type` 字段区分「知识库文章」(`article`) 与「小记」(`note`)，小记的接口与前端改造留待后续变更，本次不实现。

前端 `useApi()` 已封装 `get()` 与 `assetUrl()`，详情页可直接复用。

## Goals / Non-Goals

**Goals:**
- `Article` 模型新增 `type` 字段（默认 `article`），用于区分知识库文章与小记。
- 文章详情页按 `slug` 走后端 `GET /api/articles/slug/:slug`，仅取 `published=true` 且 `type=article` 的文章。
- `GET /api/articles` 列表默认仅返回 `type=article`（防止后续小记入库污染知识库列表）。
- `ArticleDetailView.vue` 改为异步取数渲染，移除对静态 mock 的强依赖（保留为降级兜底）。

**Non-Goals:**
- **不实现小记的接口与前端**（本次只加 `type` 字段区分，不做 `note` 的详情/列表接口、不建独立表）。
- 不改动知识库列表页既有渲染逻辑（除列表查询加 `type` 过滤外）。
- 不做浏览量自增统计（沿用 `viewCount` 展示，写入增量留待后续）。
- 不引入富文本格式变更，正文沿用现有字符串（Markdown/HTML）存储。

## Decisions

1. **单表 + `type` 字段区分，而非独立 `Note` 表**
   - 理由：用户明确要求「在数据库中增加一个字段来区分小记和知识库文章」。小记与文章字段高度重合（标题、摘要、正文、封面、标签、时间），共用 `articles` 表 + `type` 字段最简洁，后续小记只需以 `type=note` 入库即可复用同一套列表/详情接口，无需新建 module。
   - 实现：`Article` 模型增加 `type String @default("article")`，取值 `article` / `note`。

2. **知识库文章详情按 `slug` 暴露公开接口**
   - 理由：前台路由已是 `/articles/:slug`，slug 更利于 SEO；列表返回已带 `slug`，前端无需改路由。
   - 实现：`PublicArticleController` 新增 `@Get('slug/:slug')`，调用新增的 `ArticleService.findOneBySlug(slug, { publishedOnly: true })`，查询条件加 `type: 'article'`。

3. **列表接口隐式按 `type=article` 过滤**
   - 理由：现有知识库列表只应展示文章；小记后续以 `type=note` 入库，若不加过滤会串入知识库列表。
   - 实现：`findAll` 查询 `where` 增加 `type: 'article'`（保持对外字段不变）。

4. **详情页取数失败降级到静态数据**
   - 理由：避免后端异常时页面空白；`catch` 中回退到 `@/data/articleContent`。

## Risks / Trade-offs

- **[风险] 列表加 `type` 过滤后，若既有 dev.db 文章无 `type` 值** → 因字段默认 `article`，`db push` 后存量记录会被赋默认值，不影响现有列表。
- **[风险] `slug` 路由与潜在 `:id` 路由冲突** → 公开详情用 `slug/:slug` 路径段，与管理端 `:id` 隔离，避免冲突。
- **[权衡] 详情接口不校验权限** → 仅返回 `published` 且 `type=article`，草稿与小记不会泄露；符合前台公开阅读定位。
- **[风险] SQLite 需迁移字段** → 新增 `type` 字段需 `npx prisma db push`（开发库 sqlite），在 tasks 中标注。

## Migration Plan

1. 后端：`prisma/schema.prisma` 的 `Article` 增加 `type` 字段 → `npx prisma db push` 同步 dev.db（存量记录默认 `article`）。
2. 后端：`ArticleService` 新增 `findOneBySlug` 方法（含 `type` 过滤）。
3. 后端：`article-public.controller` 增加 `slug` 详情路由；`findAll` 列表查询加 `type=article` 过滤。
4. 前端：`ArticleDetailView.vue` 改造为异步取数 + 降级。
5. 验证：启动前后端，点击知识库列表项进入详情，确认内容来自后端；验证小记（type=note）不出现在知识库列表。
6. 回滚：前端保留静态兜底；后端路由/字段为新增或默认值，移除不影响既有列表（但 `type` 字段保留）。

## Open Questions

- 小记后续是否复用 `/articles` 列表接口（加 `type=note` 参数）还是独立路由？待小记变更时再定，本次仅预留 `type` 字段。
- 文章详情是否需要在打开时自增 `viewCount`？本次只读不写，留待单独需求。
