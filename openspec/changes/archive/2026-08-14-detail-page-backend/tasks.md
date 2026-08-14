## 1. 数据库文章模型增加 type 字段

- [x] 1.1 在 `backend-node/prisma/schema.prisma` 的 `Article` 模型新增 `type String @default("article")`（取值 `article` 知识库文章 / `note` 小记）
- [x] 1.2 执行 `npx prisma db push` 同步开发库 `dev.db`，确认存量文章 `type` 默认为 `article`

## 2. 后端知识库文章详情接口（按 slug）

- [x] 2.1 在 `ArticleService` 新增 `findOneBySlug(slug, { publishedOnly })` 方法，复用 Prisma `findUnique({ where: { slug, type: 'article' } })`
- [x] 2.2 在 `article-public.controller.ts` 新增 `GET slug/:slug` 路由，仅返回 `published=true` 且 `type=article` 的文章，未找到/未发布/类型不符返回 404

## 3. 列表接口按 type 过滤（防回归）

- [x] 3.1 在 `ArticleService.findAll`（公开列表）查询 `where` 增加 `type: 'article'`，保持对外字段不变，确保小记不串入知识库列表

## 4. 前端知识库详情页接入

- [x] 4.1 改造 `ArticleDetailView.vue`：移除 `@/data/articleContent` 强依赖，`onMounted` 按 `route.params.slug` 调 `useApi().get('/articles/slug/' + slug)`
- [x] 4.2 渲染标题/元信息/正文/封面（封面经 `useApi().assetUrl()` 补全），取数失败降级到静态数据
- [x] 4.3 处理 loading 与 404（slug 不存在/未发布/类型不符）状态展示

## 5. 联调与验证

- [x] 5.1 启动前后端，从 `/articles` 列表点击进入 `/articles/:slug` 详情，确认内容来自后端
- [x] 5.2 验证未发布文章 slug 与不存在的 slug 均返回 404
- [x] 5.3 （为后续小记预留）手动插入一条 `type=note` 记录，确认其不出现在 `GET /api/articles` 知识库列表、且不会误入知识库详情
