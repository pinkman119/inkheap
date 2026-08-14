## Why

前台「知识库」列表页已改为从后端 `GET /api/articles` 拉取数据，但用户点击列表项进入的详情页（`ArticleDetailView`）仍然读取前端静态 mock（`@/data/articleContent`），导致列表与详情内容割裂、无法随后台编辑实时更新。需要把知识库文章详情页接入后端，让内容统一管理。

同时，知识库文章与小记（笔记）目前在前端是两个独立数据源，后续小记也要接入后端。为避免将来建两套表/两套接口，本次先在文章数据模型中增加一个 `type` 字段来区分「知识库文章」与「小记」，为后续小记接入铺路；但**本次只实现知识库文章详情**，小记的接口与前端改造不在本次范围。

## What Changes

- **数据库新增 `type` 字段**：在 `Article` 模型增加 `type` 字段（如 `article` = 知识库文章，`note` = 小记），默认 `article`。现有文章数据为知识库类型；小记数据后续以 `type=note` 入库，复用同一张表与接口。
- **新增知识库文章详情公开接口**：`GET /api/articles/slug/:slug`，返回单篇 `published=true` 且 `type=article` 的文章完整正文，复用现有 `ArticleService` 逻辑按 `slug` 查询。
- **改造 `ArticleDetailView.vue`**：移除静态数据依赖，按路由 `slug` 调 `GET /api/articles/slug/:slug` 渲染标题/元信息/正文/封面。
- **列表接口约束（防回归）**：`GET /api/articles` 仅返回 `type=article` 的文章（保持现有知识库列表行为不变）。

## Capabilities

### New Capabilities
- `article-detail-api`: 提供按 slug 获取单篇「知识库文章」详情的公开接口（含正文、封面、作者、标签、浏览量等），并按 `type=article` 过滤。

### Modified Capabilities
- `article-list-api`（既有）: 列表接口补充按 `type` 过滤的隐式约束（默认只返回 `type=article`），确保小记数据入库后不会污染知识库列表。

## Impact

- **后端**：`prisma/schema.prisma` 的 `Article` 模型增加 `type` 字段并 `db push`；`ArticleService` 新增按 slug 查询方法；`article-public.controller` 增加 `slug` 详情路由；列表查询默认加 `type` 过滤。
- **前端**：`ArticleDetailView.vue` 改用 `useApi().get()`，移除 `@/data/articleContent` 依赖（保留为降级兜底）。
- **数据模型**：小记后续以 `type=note` 存入 `articles` 表，本次不写入小记种子、不新建独立表。
- **API 契约**：详情接口字段与现有列表接口保持一致（如 `coverImage` 经 `assetUrl` 补全）。
