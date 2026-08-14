# article-detail-api Specification

## Purpose
TBD - created by archiving change detail-page-backend. Update Purpose after archive.
## Requirements
### Requirement: 文章模型区分类型
系统 SHALL 在 `Article` 数据模型中提供 `type` 字段，用于区分内容类型，取值至少包含 `article`（知识库文章）与 `note`（小记），默认值为 `article`。

#### Scenario: 存量文章默认归类为知识库
- **WHEN** 执行数据库迁移且未显式指定 `type`
- **THEN** 现有文章记录的 `type` 默认为 `article`

#### Scenario: 类型可用于过滤
- **WHEN** 查询时按 `type` 过滤
- **THEN** 系统仅返回匹配该类型的记录，使知识库文章与小记互不干扰

### Requirement: 按 slug 获取已发布知识库文章详情
系统 SHALL 提供公开接口 `GET /api/articles/slug/:slug`，返回 slug 匹配、`published = true` 且 `type = 'article'` 的单篇文章完整信息，包含 `id`、`slug`、`title`、`summary`、`content`、`coverImage`、`author`、`tags`、`categoryKey`、`createdAt`、`viewCount`、`type`。

#### Scenario: 正常获取已发布知识库文章
- **WHEN** 客户端请求 `GET /api/articles/slug/:slug` 且该 slug 对应一篇 `published=true` 且 `type=article` 的文章
- **THEN** 系统返回 200 与文章完整对象（含 `content` 正文，`type=article`）

#### Scenario: slug 不存在
- **WHEN** 客户端请求 `GET /api/articles/slug/:slug` 但无匹配记录
- **THEN** 系统返回 404

#### Scenario: 文章未发布不对外暴露
- **WHEN** 客户端请求 `GET /api/articles/slug/:slug` 且该文章 `published=false`
- **THEN** 系统返回 404（不泄露草稿内容）

#### Scenario: 类型为小记的文章不进入知识库详情
- **WHEN** 客户端请求 `GET /api/articles/slug/:slug` 但该记录 `type=note`
- **THEN** 系统返回 404（知识库详情接口仅服务 `type=article`）

### Requirement: 知识库列表仅返回文章类型
系统 SHALL 在 `GET /api/articles` 列表查询中默认按 `type = 'article'` 过滤，确保小记（type=note）不会出现在知识库列表中。

#### Scenario: 列表不含小记
- **WHEN** 数据库中存在 `type=note` 的记录且客户端请求 `GET /api/articles`
- **THEN** 返回列表中不包含该 `type=note` 的记录

### Requirement: 详情接口字段与列表一致
系统 SHALL 确保详情接口返回的文章字段（如 `coverImage`、`tags`、`categoryKey`、`type`）命名与 `GET /api/articles` 列表接口保持一致，便于前端统一渲染与 `assetUrl` 补全封面。

#### Scenario: 封面字段可用 assetUrl 补全
- **WHEN** 详情接口返回 `coverImage` 为相对路径（如 `/files/...`）
- **THEN** 前端通过 `useApi().assetUrl()` 可拼接为可访问的绝对 URL

