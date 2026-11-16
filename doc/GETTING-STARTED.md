# INKHEAP 系统上手指南

> 面向新加入的开发者 / AI Agent 的后端速览：模块职责、主要业务、数据库结构。
> 路径以当前仓库结构为准：后端代码位于 `backend/src/modules`，数据库定义位于 `backend/prisma/schema.prisma`。

## 一、系统概览

INKHEAP（墨堆）= **个人知识站 + AI 数字生命分身**：

- 前台展示：首页、知识库文章、小记、简历、关于我、友链、留言、RSS
- 访客互动：邮箱注册登录、评论、AI 数字分身对话
- 后台管理：全站内容 CRUD、统计仪表盘、数字生命训练/人格/模型配置

```
Vue 3 SPA ──/api──► NestJS 后端（23 个业务模块）
                       │
                       ├──► PostgreSQL 16 + pgvector（业务数据 + RAG 向量）
                       └──► Redis 7（聊天限流 / 最近分类缓存）
```

### 接口与鉴权的三个分区

| 分区 | 前缀 | 鉴权 | 内容 |
|------|------|------|------|
| 公开接口 | `/api/public/*`、`/api/articles`、`/api/xiaoji`、`/api/about` 等 | 无 | 站点内容展示、RSS、访问上报 |
| 访客接口 | `/api/user/*` | 访客 JWT（httpOnly cookie） | 发评论、数字生命聊天、登录态查询 |
| 管理接口 | `/api/admin/*` | 管理员 JWT | 后台所有管理功能 |

**双账号体系**：管理员（`admin_users` 表，账号密码登录）与访客（`email_users` 表，邮箱验证码注册 + cookie 登录）分别走两套 JWT 策略，Guard 按分区复用。

## 二、后端模块速览

### 1. 内容管理域

| 模块 | 作用 | 主要业务 | 涉及表 |
|------|------|----------|--------|
| `article` | 知识库文章 | 后台 CRUD/批量排序/AI 生成摘要；前台已发布列表、slug 详情（计阅读量）、首页动态流 | `articles`、`categories` |
| `xiaoji` | 小记（短内容） | 前台按标签筛选列表、上下篇导航、统计；后台 CRUD/AI 摘要；小记分类维护；与"足迹"1-1 关联 | `blogs`、`blog_categories`、`about_footprints` |
| `category` | 文章分类 | 后台 CRUD/分类树/最近使用分类；前台分类数据 | `categories`、`articles` |
| `resume` | 在线简历 | 多版本管理，后台切换"激活版本"，前台仅展示激活版 | `resume` |
| `about` | 关于我 | 个人简介、足迹地图、旅行卡片、事件年轮（可标记"成就"）四组数据的后台管理与前台只读 | `about_profile`、`about_footprints`、`about_travels`、`about_events` |
| `homepage` | 首页配置 | 站名、头像、社交链接、工作/生活双模式的标题与代码块展示配置 | `home_page` |
| `site-config` | 站点元信息 | 站点地址/名称/描述/作者（RSS 等对外输出使用），仅后台可改 | `site_config` |
| `footer-link` | 页脚 | 页脚导航/外链/社交图标 CRUD 与排序；备案号配置 | `footer_links`、`footer_config` |

### 2. 访客互动域

| 模块 | 作用 | 主要业务 | 涉及表 |
|------|------|----------|--------|
| `comment` | 评论 | 文章/小记下一层盖楼式评论：前台分页浏览，访客发表+回复（触发邮件通知），后台删除 | `comments`、`email_users` |
| `contact` | 联系我 | 前台无鉴权提交来信；后台已读/未读管理、搜索、统计 | `contact_messages` |
| `friend-link` | 友链（邻居） | 前台展示已过审友链+留言墙、提交申请；后台友链 CRUD、申请审核（通过即建链） | `friend_links`、`friend_applications` |
| `email-auth` | 访客账号 | 邮箱验证码注册、14 天 cookie 登录、忘记密码（明文密码邮件找回，带 IP 限流） | `email_users` |

### 3. 账号与鉴权域

| 模块 | 作用 | 主要业务 | 涉及表 |
|------|------|----------|--------|
| `auth` | 管理员登录 + 双 JWT 基础设施 | 管理员登录/身份查询；访客 JWT 策略与两类 Guard 供全局复用 | `admin_users`、`email_users` |
| `admin-user` | 管理员账号管理 | 列表、新增、改密/改备注/改头像、启用/失效 | `admin_users` |

### 4. 数字生命域（AI 分身）

`digitallife` 模块是核心子系统，内部服务分工：

| 服务 | 职责 | 涉及表 |
|------|------|--------|
| `chat.service` | 对话编排：用户消息入库 → RAG 检索 top-5 → 组装 system prompt（人格+基本信息+资料）+ 最近 10 轮历史 → 多模型按序流式生成（失败自动切换） | `chat_messages` |
| `persona.service` | 人格管理：多人格结构化配置（名称/问候语/人格描述/基本信息/风格提示等），聊天取排序最前的一个人格 | `dl_personas` |
| `training.service` | RAG 训练：7 类源数据（文章/小记/简历/简介/足迹/旅行/事件）→ 文本拼装 → 切分 → embedding → 写入向量库；内容被编辑时自动删向量并重置训练标记 | `dl_vectors` + 各内容表 |
| `vector.service` | pgvector 存取：原生 SQL 管理向量表（启动幂等建表 + HNSW 索引），写入与相似度检索 | `dl_vectors` |
| `model-config.service` | 大模型配置：模型 CRUD/启停/连通性测试、embedding 模型绑定，API Key 加密存储 | `dl_models` |
| `rate-limit.service` | Redis Lua 令牌桶限流：每用户容量 5 / 每分钟 5 次；Redis 不可用时降级放行 | —（Redis） |
| `chat-admin.service` | 后台会话管理：会话列表（IP 搜索）、会话明细 | `chat_messages` |

配套的 `mail` 模块（无独立路由）：nodemailer 封装，提供注册验证码、密码找回、评论回复通知三类邮件；SMTP 未配置时 fail-fast。

### 5. 统计域

| 模块 | 作用 | 主要业务 | 涉及表 |
|------|------|----------|--------|
| `view` | 阅读量 | 同一 IP 对同一内容**每天最多计一次**（`content_views` 唯一索引 + skipDuplicates 实现无竞态），成功后自增内容表计数；定时清理过期明细 | `content_views`、`articles`、`blogs` |
| `visit` | 访问量（PV） | 前台上报：按天聚合计数 + 访客明细落库；ip2region 离线库解析 IP 归属地（失败降级"未知"） | `site_visits`、`visit_logs` |
| `dashboard` | 后台仪表盘 | 来信/阅读/访问/用户四指标、文章阅读排行、访问趋势（7/30/90/全部）、最近访问明细 | 跨表聚合 |

### 6. 基础设施域

| 模块 | 作用 | 说明 |
|------|------|------|
| `upload` | 后台图片上传 | ≤5MB（png/jpeg/gif/webp），按日期目录落盘并登记，可按 id 删除；文件表 `files` |
| `proxy` | 图片代理 | `GET /api/proxy/image?url=...`：后端拉取外链图片规避防盗链，仅允许 http/https |
| `feed` | RSS 订阅 | `GET /api/feed.xml` 聚合文章+小记；站点 URL 取 `site_config`，未配置回退请求 Host |
| `prisma` | Prisma 封装 | `PrismaService` 管理连接生命周期，全局注入 |

## 三、数据库表结构

数据库为 PostgreSQL 16（pgvector 扩展），模型定义见 `backend/prisma/schema.prisma`，物理表名以 `@@map` 为准。按业务域分组说明：

### 内容表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `articles` | 知识库文章 | `slug` 唯一标识；`categoryKey` 关联分类；`published`/`featured` 发布与精选；`viewCount` 真实阅读量（IP 按日去重）；`virtualViewCount` 虚拟阅读量（非空时前台展示它）；`sortOrder` 拖拽排序；`trainType` 训练标记（见下） |
| `categories` | 文章分类 | `key` 唯一、`parentKey` 支持两级树；`sortOrder` 排序 |
| `blogs` | 小记 | `slug` 唯一；`type`（默认 album）；`tags`/`photos` 为 JSON 字符串；`viewCount`/`virtualViewCount` 口径同文章；与 `about_footprints` 1-1 绑定（`blogId`） |
| `blog_categories` | 小记分类 | `key` 唯一 |
| `resume` | 简历 | 多版本（`name`），`content` 为 JSON 字符串，`isActive` 激活版本 |
| `home_page` | 首页配置 | 单条记录（id 固定 `home`）；工作/生活双模式各专属标题与代码块，为空回退通用字段；`socialLinks` JSON 字符串 |
| `about_profile` | 关于我·简介 | 单条记录（id 固定 `about`）：kicker/lede/他人评价 |
| `about_footprints` | 关于我·足迹 | 省份/地点/时间/坐标/海拔；`blogId` 唯一外键 → `blogs`（绑定小记，删小记自动置空） |
| `about_travels` | 关于我·旅行卡片 | glyph/place/meta/note，`sortOrder` 排序 |
| `about_events` | 关于我·事件年轮 | `isRing` 标记"写进年轮的成就"；`sortOrder` 排序 |
| `site_config` | 站点元信息 | 单条记录（id 固定 `site`）：站点地址/名称/描述/作者，供 RSS 使用 |
| `footer_links` | 页脚链接 | `type`：nav 导航 / ext 外链 / social 社交图标；`mode` 区分工作/生活模式；`svg` 优先于 `icon` |
| `footer_config` | 页脚配置 | 单条记录（id 固定 `footer`）：备案号及跳转地址 |

### 用户与互动表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `admin_users` | 管理员 | `password`（bcrypt）；`status` 启用/失效；`lastLoginAt` 最后登录 |
| `email_users` | 访客（邮箱注册） | `password` 存 **AES-256-GCM 密文**（`APP_ENCRYPTION_KEY`），支持找回密码时解密明文发邮件；`status`、`lastLoginAt` |
| `wechat_users` | 微信用户 | `openid` 唯一；当前无业务模块直接使用，仅 seed 预置数据 |
| `comments` | 评论 | `targetType`：article / note；`parentId` 为空即顶层，非空指向同 target 的顶层（一层盖楼）；`replyToUserId` 冗余展示"回复 @昵称"；`userId` 关联访客 |
| `contact_messages` | 联系我来信 | `read` 已读标记；`contact` 其他联系方式 |

### 友链表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `friend_links` | 友链（仅已过审） | `status`：active 正常 / dormant 失联（前台置灰保留）；`mode`：0 全模式 / 1 仅工作 / 2 仅生活；`isSelf` 本站高亮；`applicationId` 唯一，记录来源申请（防重复建链） |
| `friend_applications` | 友链申请 | `status`：pending / approved / rejected；通过后写 `linkId` 回链到生成的友链；`remark` 后台备注（拒绝原因） |

### 统计表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `site_visits` | 每日 PV 聚合 | `day` 唯一（Asia/Shanghai 自然日，存 UTC 零点），`count` 当日访问量 |
| `visit_logs` | 访问明细 | 每次 PV 一条：ip（明文，仅后台可见）/ region（ip2region 解析）/ path；保留期由 `VISIT_LOG_RETENTION_DAYS` 控制（默认 180 天，≤0 永久） |
| `content_views` | 阅读去重明细 | 唯一索引 `(targetType, targetId, ip, day)`——同一 IP 同内容同天只计一次；保留期由 `CONTENT_VIEW_RETENTION_DAYS` 控制（默认 90 天） |

### 数字生命表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `dl_personas` | AI 人格配置 | `description` 核心人格文本（system prompt 主体）；`basicInfo` 事实性基本信息（问答必须依据）；`styleHint` 回复风格；聊天取 `sortOrder` 最小的一个 |
| `dl_models` | 大模型配置 | `modelType`：general 对话 / embedding 检索；`apiKeyEnc` API Key 密文；`sortOrder` 决定生成时的尝试顺序 |
| `chat_messages` | 聊天消息 | `userId` 访客标识；`sessionId` 会话；`role`：user / assistant；上下文取最近 20 条（约 10 轮） |
| `dl_vectors` | RAG 向量存储 | **由原生 SQL 管理**（Prisma 不支持 vector 列），启动幂等建表 + HNSW 索引；`embedding` 1024 维向量；`refType`+`refId`+`chunkIndex` 唯一，chunk 切分约 800/100 字符 |

### 文件表

| 表 | 用途 | 关键字段与口径 |
|----|------|----------------|
| `files` | 上传文件登记 | `url` 唯一（`/files/...` 相对路径）；`relativePath` 落盘路径；`size` 字节数 |

## 四、全局约定（速记）

- **trainType 训练标记**（`articles`/`blogs`/`resume`/`about_*` 均有）：`0` 未训练 / `1` 已训练 / `2` 已移除训练。已训练内容被编辑时，自动删除对应向量并重置为 `0`（需重新训练）。
- **阅读量口径**：`viewCount` 为真实值（IP 按日去重），`virtualViewCount` 非空时前台展示虚拟值、真实值仅后台可见。
- **敏感数据加密**：`email_users.password` 与 `dl_models.apiKeyEnc` 共用 `APP_ENCRYPTION_KEY`（32 字节 hex，AES-256-GCM）——**更换密钥旧密文不可解**。
- **数据保留期**：`visit_logs` 默认 180 天、`content_views` 默认 90 天，由环境变量控制。
- **Redis 降级**：限流与"最近分类"缓存均为 Redis 不可用时自动降级，不影响主流程。
- **模式体系**：站点有工作/生活双模式（`mode` 字段：0 通用 / 1 仅工作 / 2 仅生活），首页、页脚、友链均支持按模式差异化展示。
