# 评论系统（Comment System）模块 · 清晰需求

> 版本：v0.1（设计阶段，未实现）
> 状态：需求分析完成（含 grill-me 决策拷问），待确认「待确认决策项」后进入 OpenSpec 规格化

---

## 1. 背景与目标

INKHEAP 是一个个人内容站，前台已有知识库文章（`/articles/:slug`）与小记（`/xiaoji/:slug`），但目前内容只有浏览（PV 统计），访客无法表达反馈，缺乏作者与读者的互动闭环。

本模块为内容页引入评论能力，形成互动闭环：

- **核心约束 1：评论必须登录后发表**（登录方式：微信，复用现有 `WechatUser` 用户体系），防止匿名灌水、便于追责与互动关系沉淀
- **核心约束 2：评论浏览完全公开**，不给访客设阅读门槛，评论是内容的延伸而非围墙
- **核心约束 3：登录不新增实现**——现有 `WechatUser` + Mock 微信登录 + `useUserAuth` 登录态已可直接支撑，真实微信扫码在备案完成后平滑切换

## 2. 术语表

| 术语 | 含义 |
|------|------|
| 一级评论 | 直接挂在内容（文章/小记）下的评论 |
| 回复 | 对一级评论的回复（二级），回复不再嵌套 |
| targetType / targetId | 评论挂载目标的多态定位（`article` / `blog` / `note`），使一张评论表服务所有内容 |
| WechatUser | 现有微信用户表（Mock 阶段 `openid` 形如 `mock-xxx`） |
| 用户登录态 | `useUserAuth` 管理的 `dl_user_token` / `dl_user` / `dl_openid`，与数字生命模块共用同一套 |
| 软删除 | 标记 `deletedAt` 而非物理删除，保留回复结构与数据可审计 |

## 3. 角色与权限

| 角色 | 说明 | 能力 |
|------|------|------|
| 访客（未登录） | 任意浏览者 | 查看评论列表；点击发表时弹出微信登录卡片，不可提交 |
| 用户（微信登录） | 评论者 | 发表一级评论、回复、删除自己的评论、查看自己的发言 |
| 管理员（AdminUser） | 站主 | 后台查看全部评论、删除任意评论（软删除）、恢复已删除评论 |

## 4. 功能需求

### FR1 · 评论列表（公开读，无需登录）

- 接口：`GET /api/public/comments?targetType=article&targetId=<id>&page=1&pageSize=20`
- 返回树形结构：一级评论（含作者 `nickname`/`avatar`、`content`、`createdAt`、`likeCount`、`deleted` 标记）+ 各自回复
- 排序：按 `createdAt` 正序（新评论追加在尾部），保证阅读上下文连贯；分页按一级评论维度（每页 N 条一级评论及其回复整体返回）
- 已删除评论占位展示「该评论已删除」（作者与内容隐藏，保留回复可见，回复者昵称保留）
- 有效性校验：`targetType + targetId` 必须存在且内容已发布（`published=true`），否则返回 404

### FR2 · 发表评论（必须登录）

- 接口：`POST /api/user/comments`，请求体 `{ targetType, targetId, content }`
- 鉴权：`UserJwtGuard`（未登录返回 401，由前端捕获后弹登录卡片）
- 校验：
  - `content` 非空、去首尾空白后 `length <= 2000`
  - `targetType` 白名单（`article` / `blog` / `note`），`targetId` 对应内容存在且已发布
  - 同一用户对同一 `targetType+targetId` 的**防刷限流**（见 NFR）
- 成功返回 201 与完整评论对象（含作者信息），前端插入列表

### FR3 · 回复评论（必须登录）

- 接口：`POST /api/user/comments/:id/replies`，请求体 `{ content }`
- 仅允许回复**一级评论**（`parentId` 为空的评论）；对回复再回复一律返回 400
- 校验规则同 FR2（长度、限流）
- 展示：回复以缩进块挂在被回复评论下方，内容前自动拼接 `@<被回复者昵称>`（纯展示，存库不冗余）
- 被回复评论已删除时允许回复（挂载到被删评论下，展示「该评论已删除」占位）

### FR4 · 删除评论

- 作者删除：`DELETE /api/user/comments/:id`（仅可删自己的；否则 403）
- 管理员删除：`DELETE /api/admin/comments/:id`（可删任意）
- 采用**软删除**：置 `deletedAt`，列表渲染「该评论已删除」占位；其下回复不受影响
- 管理员后台提供「恢复」（清空 `deletedAt`）

### FR5 · 评论点赞（本阶段不做，字段与表预留）

- `Comment` 表预留 `likeCount` 字段；预留 `CommentLike` 表（`commentId + userId` 唯一约束）
- 本阶段不做点赞接口与 UI，避免范围膨胀；后续单独立项

### FR6 · 微信登录（复用与演进）

- **本阶段**：直接复用现有 Mock 微信登录（`POST /api/public/wechat/mock-login`，`WECHAT_MOCK=true`），登录卡片的触发、交互与数字生命模块完全一致（复用 `useUserAuth` + `DigitalLifeView` 的登录卡片样式）
- 登录态与数字生命**共用**：同一 `WechatUser`、同一 `dl_user_token`。用户只要在数字生命登录过，评论即已登录，无需二次登录
- **演进（备案完成后，独立排期）**：新增 `POST /api/public/wechat/login`（code 换 openid），响应结构与 `mockLogin` 完全一致，前端无感切换；`mock-` 前缀 openid 用户的身份迁移方案在真实接入时单独评估
- **关键点**：评论系统不感知登录是「Mock 还是真实」，只认「是否持有合法 user JWT」

### FR7 · 后台评论管理

- 后台页面 `CommentManageView.vue`（路由 `/admin/comments`，`meta.auth=true`）
- 功能：全部评论列表（按 `targetType` / 关键词 / 时间筛选）、查看作者昵称与内容、删除任意评论、恢复已删除评论
- 数据展示只读为主，不做回复/编辑（作者自己管理自己的发言）

### FR8 · 前端评论区 UI

- 组件：`CommentSection.vue`，挂载于 `ArticleDetailView.vue`（文章详情正文底部）；（如 D1 选择含小记，则同时挂载 `NoteDetailView.vue`）
- 交互：
  - **未登录**：评论区顶部展示「登录后参与评论」按钮，点击弹微信登录卡片（复用数字生命样式，仅展示微信登录入口）；登录成功后关闭卡片、自动聚焦输入框
  - **已登录**：输入框 + 发送按钮；评论后清空输入框并插入列表；回复他人点击「回复」自动填入 `@昵称`
  - 分页：一级评论分页，底部「加载更多」
  - 错误处理：401 静默弹登录卡片；429 提示「操作太频繁」并禁用按钮；其他错误 toast
  - 内容纯文本渲染（不渲染 HTML / Markdown，见 NFR）
- 头像兜底：`WechatUser.avatar` 为空时显示昵称首字符圆形占位（现有前端样式约定）

## 5. 数据模型变更（Prisma）

新增 `Comment` 模型：

```prisma
model Comment {
  id         String    @id @default(uuid())
  targetType String    // article | blog | note
  targetId   String
  parentId   String?   // 回复的一级评论 id；空 = 一级评论
  authorId   String    // WechatUser.id
  content    String
  likeCount  Int       @default(0) // 预留（点赞本阶段不做）
  deletedAt  DateTime? // 软删除
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  @@index([targetType, targetId, createdAt])
  @@index([parentId])
  @@map("comments")
}
```

新增 `CommentLike` 模型（本阶段仅建表，不做接口）：

```prisma
model CommentLike {
  id        String   @id @default(uuid())
  commentId String   @map("comment_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([commentId, userId])
  @@map("comment_likes")
}
```

说明：

- 评论表只存 `authorId`，作者昵称/头像查询时联表 `WechatUser`，避免冗余与数据不一致
- 多态 `targetType + targetId` 使一张表覆盖文章 / 小记 / 未来任何内容，无需每类内容建一张评论表
- 作者删除自己评论与管理员删除同走软删除，`updatedAt` 记录操作时间

## 6. API 设计

### 公开（无鉴权）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/comments` | 列表，参数 `targetType, targetId, page, pageSize`；返回树形一级评论 |

### 用户（`UserJwtGuard`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/comments` | 发表一级评论 `{ targetType, targetId, content }` |
| POST | `/api/user/comments/:id/replies` | 回复一级评论 `{ content }` |
| DELETE | `/api/user/comments/:id` | 删除自己的评论（软删除） |

### 管理（`AdminJwtGuard`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/comments` | 列表，参数 `page, pageSize, targetType?, keyword?, startDate?, endDate?` |
| DELETE | `/api/admin/comments/:id` | 删除任意评论（软删除） |
| POST | `/api/admin/comments/:id/restore` | 恢复已删除评论 |

统一响应遵循现有 `useApi` 封装约定（`{ data }` 包装、错误 `{ message }`、401/403/404/429 语义一致）。

## 7. 前端交互设计（页面级）

| 场景 | 行为 |
|------|------|
| 文章详情页底部 | 评论区组件展示已有评论；未登录见「登录后参与评论」按钮 |
| 未登录点发表/回复 | 弹出微信登录卡片（复用数字生命卡片样式与 `mockLogin`），成功后自动继续原操作 |
| 已登录发表 | 输入框发送 → 201 后列表局部刷新（插入新评论，不整页刷新） |
| 回复他人 | 点「回复」→ 输入框预填 `@昵称 `；提交 `parentId` |
| 删除自己的评论 | 悬停显示「删除」→ 确认 → 软删除占位 |
| 加载更多 | 一级评论分页，滚动到底/点击按钮加载下一页 |
| 管理后台 | 评论列表页筛选/删除/恢复 |

## 8. 安全与非功能需求

- **XSS 防护**：评论 `content` 一律按纯文本渲染（禁用 `v-html`），不解析 Markdown / HTML / 链接；长度限制 2000 字
- **防刷限流**：发表与回复接口复用现有令牌桶模式（参考 `rate-limit.service.ts`），按 `userId + targetType + targetId` 维度：容量 5、补速 1 个 / 30s；超限返回 429 `{ retryAfter }`，前端禁用按钮并提示
- **鉴权边界**：写接口全部 `UserJwtGuard`；管理接口全部 `AdminJwtGuard`；公开列表只读
- **数据一致性**：删除软删；`CommentLike` 唯一约束防重复点赞
- **数据库迁移**：Prisma migrate；`targetType` 枚举不做 DB 级约束（沿用现有 String + 白名单校验风格），避免迁移成本
- **接口规范**：遵循 `/api` 前缀、`useApi` 封装、错误 `{ message }` 语义
- **性能**：列表按 `(targetType, targetId, createdAt)` 复合索引查询；回复按 `parentId` 索引；单内容评论量级为个人站规模，无需缓存，直接联表查询即可
- **无障碍**：评论输入框有 label；错误提示通过 aria-live 播报（可选增强）

## 9. 范围外（本次不做）

- 真实微信扫码登录实现（受备案进度影响，独立排期；仅预留入口与响应结构一致）
- 评论敏感词过滤 / 内容审核 / 举报
- 评论 Markdown、富文本、图片、表情选择器
- 无限层级嵌套（仅两级）
- 评论点赞接口与 UI（字段/表预留）
- 评论被回复的邮件 / 站内通知
- 「我的评论」个人中心页面
- 热门评论 / 置顶 / 精选排序

## 10. 待确认决策项（grill-me 拷问清单）

以下为需求分析中识别出的关键分叉，均给出推荐项，请确认后进入规格化：

| # | 问题 | 推荐（默认） | 备选 |
|---|------|------------|------|
| D1 | 评论宿主范围 | 本阶段仅知识库文章（`article`）；多态设计天然支持后续扩展 | 文章 + 小记（`blog`）同时上线 |
| D2 | 嵌套深度 | 两级（一级评论 + 回复），实现与 UI 最简 | 无限嵌套（需递归树 + 深度 UI，成本高） |
| D3 | 登录态与数字生命是否共用 | 共用（同一 `WechatUser` + `dl_user_token`），已登录用户零成本进入评论 | 评论独立登录态（不推荐，双 token 复杂度高） |
| D4 | 删除策略 | 软删除 + 「该评论已删除」占位 | 物理删除（回复结构会断裂） |
| D5 | 列表排序 | 时间正序（树形连贯阅读） | 倒序 / 热度（点赞数，需点赞功能支撑） |
| D6 | 评论长度上限 | 2000 字 | 500 / 5000 |
| D7 | 点赞功能 | 本阶段不做，仅预留字段与表 | 本阶段实现（范围 +1~2 天） |
| D8 | 是否限制登录方式 | 仅微信登录（与站点现状一致，不做邮箱/手机号） | 增加更多登录方式（范围外） |

## 11. 里程碑建议

- **M1 后端**：`Comment` / `CommentLike` 模型 + 迁移；公开列表接口；发表 / 回复 / 删除（用户）；管理端列表 / 删除 / 恢复
- **M2 前端**：`CommentSection.vue` 挂载文章详情页；登录卡片复用与 401/429 联动；分页加载
- **M3 后台**：`/admin/comments` 评论管理页（筛选 / 删除 / 恢复）
- **M4（独立排期）**：备案完成后接入真实微信扫码登录，评论与数字生命同时受益
