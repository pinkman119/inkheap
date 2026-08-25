## Context

数字生命模块现状与约束：

- **前台**：`frontend/src/views/DigitalLifeView.vue` 为纯前端原型（规则匹配模拟回复、单一持续会话、16ms 打字机），文案为占位「数字林深」；页面结构、滚动策略、气泡样式可保留，仅替换对话数据源与登录交互。
- **后端**：NestJS + Prisma + PostgreSQL（compose 中 `postgres:16-alpine`，无 pgvector）；已有公开接口 `public/*` + 管理接口 `admin/*` + `JwtAuthGuard`（admin role）双控制器模式；JWT payload 已含 `role` 字段，`JwtStrategy.validate` 查 `admin_users` 表。
- **前端 API 层**：`useApi` 组合式函数从 `useAdminAuth` 取 token，且 401 时清 admin token 并跳转 admin 登录页——不能直接用于前台访客请求，需独立的用户态请求逻辑。
- **人格素材**：`.codebuddy/skills/muztagh-cat`（PART A 工作能力 + PART B 人物性格）本身就是写给 AI 的人格指令，可直接作为人格 prompt，无需二次蒸馏。
- **数据源**：8 张表——`Article`（知识库）、`Blog`（小记）、`Resume`（多版本 JSON）、`AboutProfile` / `AboutRing` / `AboutFootprint` / `AboutTravel` / `AboutEvent`（关于我）。
- **模型**：仅接 GLM 系（智谱），chat 与 embedding 共用同一 API Key。智谱提供 OpenAI 兼容端点 `https://open.bigmodel.cn/api/paas/v4/`（chat/completions 与 embeddings 均兼容），可用 `@langchain/openai` 的 `ChatOpenAI` / `OpenAIEmbeddings` + `configuration.baseURL` 直连。

## Goals / Non-Goals

**Goals:**

- 访客经 Mock 微信登录后可与数字生命流式对话（SSE），回复基于人格 + RAG 检索的站长内容，未命中时凭人格回答但不编造。
- 聊天记录入库，重新登录/刷新可续聊；最近 10 轮作为上下文。
- RAG 训练：8 张表手动/批量训练进 pgvector，数据编辑自动失效重训，`trainType` 全程可观测。
- 后台管理：模型（GLM 系 + 自定义名）、API Key（AES-256-GCM 加密）、人格（可编辑、可重置默认）、训练页（状态、单条、批量、进度）。
- Redis 令牌桶限流：每用户 5 次/分钟。
- 基础设施变更全部落 docker-compose。

**Non-Goals:**

- 不做真实微信扫码登录（备案后接入，本次仅 mock 开关 + 预留接口形态）。
- 不接入 GLM 以外的模型厂商（架构上模型名可自定义已为后续预留，但不做厂商路由）。
- 不做会话多开/会话列表管理（对齐原型「单一持续会话」）。
- 不做训练定时任务/自动全量重训（手动触发足够）。
- 不做回复的 Markdown 渲染（沿用现有纯文本气泡）。

## Decisions

### 1. 总体架构

```
访客浏览器 ──(JWT role=user)──▶ /api/user/digital-life/chat (SSE)
                                   │  ① Redis 令牌桶限流(5/min)
                                   │  ② 存用户消息
                                   │  ③ embedding-3 向量化问题 → pgvector top-5
                                   │  ④ system = 人格库 + 称呼 + RAG片段 + 反编造规则
                                   │  ⑤ history = 最近10轮
                                   │  ⑥ ChatOpenAI(baseURL=智谱) 流式生成
                                   └─ SSE: delta… delta… done(入库)
管理员 ──(JWT role=admin)──▶ /api/admin/digital-life/*
       model(模型/Key) │ persona(人格) │ training(训练)

训练管道：源表行 → 拼装文本 → TextSplitter(800/100) → embedding-3(1024维)
        → dl_vectors(替换写入) + trainType=1
```

### 2. 数据模型

**Prisma（常规表）：**

```prisma
model WechatUser {
  id        String   @id @default(uuid())
  openid    String   @unique
  nickname  String   @default("微信用户")
  avatar    String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("wechat_users")
}

model ChatMessage {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  @@index([userId, createdAt])
  @@map("chat_messages")
}

// 模型配置（单条，id 固定 "default"）
model DlModelConfig {
  id          String   @id @default("default")
  chatModel   String   @default("glm-4.6") @map("chat_model")
  embeddingModel String @default("embedding-3") @map("embedding_model")
  apiKeyEnc   String?  @map("api_key_enc") // AES-256-GCM 密文
  updatedAt   DateTime @updatedAt @map("updated_at")
  @@map("dl_model_config")
}

// 人格（单条，id 固定 "default"）
model DlPersona {
  id        String   @id @default("default")
  content   String   // 人格 prompt 全文（初始 = muztagh-cat skill 全文）
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("dl_persona")
}
```

**8 张源表新增字段**（`Article` / `Blog` / `Resume` / `AboutProfile` / `AboutRing` / `AboutFootprint` / `AboutTravel` / `AboutEvent`）：

```prisma
trainType Int @default(0) @map("train_type") // 0未训练 1已训练 2已移除训练
```

存量数据迁移后自动为 0（未训练），符合预期。

**pgvector 表（Prisma 不支持 `vector` 列，走原生 SQL migration）：**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE dl_vectors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_type    TEXT NOT NULL,   -- article|blog|resume|about_profile|about_ring|about_footprint|about_travel|about_event
  ref_id      TEXT NOT NULL,
  chunk_index INT  NOT NULL,
  content     TEXT NOT NULL,
  embedding   VECTOR(1024) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ref_type, ref_id, chunk_index)
);
CREATE INDEX dl_vectors_embedding_idx ON dl_vectors USING hnsw (embedding vector_cosine_ops);
```

- 单表 + `ref_type` 区分来源，删除/替换按 `(ref_type, ref_id)` 精确操作。
- 检索用手写 SQL（Prisma `$queryRaw`），不引入 PGVectorStore——表结构（ref_type/ref_id 元数据列）自控，且省一个 `pg` 连接池。
- embedding-3 固定 1024 维（`dimensions=1024`）。

### 3. 认证：双 JWT 角色隔离

现有 `JwtStrategy` 查 `admin_users`、`JwtAuthGuard` 用于 admin 接口，全部不动。新增：

- `UserJwtStrategy`（passport 策略名 `user-jwt`）：同 secret，`validate` 查 `wechat_users` 表；payload `{ sub: userId, role: "user" }`。
- `UserJwtAuthGuard`：挂到聊天/历史接口。
- 交叉访问天然被拒：user token 在 admin strategy 下查不到 adminUser → 401；admin token 在 user strategy 下查不到 wechatUser → 401。

**Mock 登录**：`POST /api/public/wechat/mock-login`，body 可选 `{ openid }`：

- `WECHAT_MOCK=false` → 403（模拟登录未开启）。
- `WECHAT_MOCK=true` → 有 `openid` 则 upsert 复用（前端 localStorage 记住，刷新/重登续同一身份、保留聊天历史），无则生成 `mock-<随机>` 新用户，昵称「微信用户xxxx」。返回 `{ accessToken, user }`。
- 真实微信登录接入点预留：未来同 controller 增加 `POST /api/public/wechat/login`（携 code 换 openid），前端仅换接口不换交互与 token 结构。

### 4. 模型接入（LangChain + 智谱 OpenAI 兼容端点）

- 依赖：`@langchain/core`、`@langchain/openai`、`@langchain/textsplitters`、`ioredis`。
- Chat：`ChatOpenAI({ model: chatModel, apiKey, configuration: { baseURL: "https://open.bigmodel.cn/api/paas/v4" }, streaming: true })`。
- Embedding：`OpenAIEmbeddings({ model: "embedding-3", apiKey, configuration: { baseURL: 同上 }, dimensions: 1024 })`。
- API Key 运行时从 `DlModelConfig` 解密取得；未配置 Key 时聊天/训练接口返回明确业务错误（HTTP 409，提示「后台未配置模型 API Key」）。
- Key 加密：AES-256-GCM（Node `crypto`），密钥 = env `APP_ENCRYPTION_KEY`（32 字节 hex）；未设置该 env 时后端启动即报错退出（fail-fast，杜绝明文降级）。返回前端仅 `sk-****last4` 脱敏形式。

### 5. RAG 管道

**文本拼装规则（每行数据 → 一段输入文本）：**

| ref_type | 拼装 |
|---|---|
| article | `【知识库文章】{title}\n{summary}\n\n{content}` |
| blog | `【小记】{title}\n{summary}\n{quote}\n{location} {date}\n\n{content}` |
| resume | 解析 content JSON → `【简历】区块名：值` 逐行序列化（仅 `isActive=true` 版本参与） |
| about_profile | `【关于我·个人简介】\n{lede}\n「{evaluationQuote}」—— {evaluationBy}` |
| about_ring | `【关于我·年轮】{year} {title}：{desc}` |
| about_footprint | `【关于我·足迹】{province}·{place}（{time}，{location}，海拔{elevation}）：{note}` |
| about_travel | `【关于我·旅行】{place}（{meta}）：{note}` |
| about_event | `【关于我·事件】{date} {title}：{desc}` |

- 切分：`RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 })`（中文友好，分隔符含 `\n\n`、`\n`、`。`、`；`）。
- 训练（幂等替换）：读行 → 拼装 → 切分 → `embedDocuments` → 事务内 `DELETE WHERE ref_type+ref_id` → 批量 INSERT → 源表 `trainType=1`。重复训练同一条不产生孤儿向量。
- 移除训练：删向量 + `trainType=2`。
- 检索：问题向量化后 `ORDER BY embedding <=> $1 LIMIT 5`（余弦距离），结果按 score 降序注入 system prompt；空命中也正常回答（仅人格 + 历史）。
- **无 published 过滤**：草稿同样可训练（训练列表与训练管道均不做发布状态过滤）；Resume 例外——仅 isActive 版本出现在训练列表与管道中。

**编辑重置钩子**：`article` / `xiaoji` / `resume` / `about` 各模块的 update 服务方法中，保存成功后若该行 `trainType=1` → 删除其向量并置 `trainType=0`（数据变更需重新训练）。

### 6. 人格系统

- `DlPersona.content` 初始值 = muztagh-cat skill 全文（常量存 `digital-life.defaults.ts`，seed 写入），后台人格编写页可在线编写调整、可一键「重置为默认」。
- System prompt 组装（人格 + 动态段）：

```
{DlPersona.content}

【补充规则】
- 你的对外称呼是「{HomePage.siteName}」，这是你在墨堆站点上的名字。
- 以下是从站长知识库/小记/简历/关于我中检索到的资料片段，回答时优先依据资料：
{top-5 chunks，标注来源}
- 资料未覆盖的信息，按你的人格规则诚实说明「这块我还没有告诉过你」，不要编造细节。
```

### 7. 聊天接口与 SSE

`POST /api/user/digital-life/chat`（`UserJwtAuthGuard`），body `{ content }`：

1. 限流（见 §8），超限直接 HTTP 429 JSON `{ message, retryAfterSeconds }`（非 SSE）。
2. 用户消息先入库。
3. `@Res()` 手写 SSE：响应头 `Content-Type: text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`（Nginx 不缓冲）。
4. 事件协议：
   - `event: delta` `data: {"text": "…"}`（逐 token）
   - `event: done` `data: {"messageId", "content"}`（完整回复，同时入库 assistant 消息）
   - `event: error` `data: {"message"}`（流中异常：已生成部分入库后发 error）
5. 历史上下文：最近 20 条（10 轮）`ChatMessage`。

`GET /api/user/digital-life/messages`：返回该用户最近 100 条（时间正序），前端进入页面时渲染。

前端流式读取：`fetch` POST + `ReadableStream` reader 解析 SSE（`EventSource` 不支持 POST）。

### 8. 限流：Redis 令牌桶

- docker-compose 新增 `redis:7-alpine`（healthcheck，不对外暴露端口）；后端 `ioredis` 连接 `REDIS_URL`。
- 令牌桶：容量 5，速率 5 个/60s，按 `userId` 维度，key `rl:dl:chat:{userId}`。
- 原子性：Lua 脚本（hash 存 `{tokens, lastRefillTs}`，EVAL 原子执行），返回 `{ allowed, retryAfterMs }`。
- **降级**：Redis 不可用时放行并记 warn 日志（可用性优先，个人站点可接受）。

### 9. 后台管理（前端）

新增路由（`layout-admin` + `auth: true`）与 `AdminShell`「数字生命」分组：

- `/admin/digital-life/model`：模型下拉（glm-4.7 / glm-4.6 / glm-4.5 / glm-4.5-air / glm-4.5-flash / glm-4-flash）+ 自定义模型名输入；API Key 输入框（保存后脱敏显示）；「测试连接」按钮（后端用当前配置发一次最小 completion，返回成功/失败与耗时）。
- `/admin/digital-life/persona`（人格编写页）：专门用于编写并调整 muztagh-cat 人格——
  - **编写**：大文本域承载人格 prompt 全文（初始值 = muztagh-cat skill 全文），实时字符数统计（提示安全范围），未保存离开提示（脏检查）。
  - **试聊验证**：页内「试聊」面板，输入测试问题调用 `POST /api/admin/digital-life/persona/test-chat`（body `{ content, useDraft, draftPersona }`）；`useDraft=true` 时后端用**草稿人格**组装 prompt（不落库、不影响线上），支持"先试后存"的编写闭环；走与真实聊天相同的链路（人格 + RAG 检索 + 动态称呼），以流式/一次性返回均可（后台场景简化为一次性返回）。试聊消息不入 `ChatMessage`（不污染用户数据），后端直接返回回复文本。
  - **保存**：`PUT /admin/digital-life/persona`，保存后对下一次真实聊天即时生效。
  - **重置默认**：恢复 skill 原文，二次确认。
  - 不做多套人格/版本管理（单管理员单人格场景，重置默认已是兜底）。
- `/admin/digital-life/training`：按数据源 tab（文章/小记/简历/关于我）；列表列 = 标题/摘要、更新时间、`trainType` 徽标（未训练灰 / 已训练绿 / 已移除橙）；操作 = 「训练」（0/2 → 1）、「移除训练」（1 → 2）；「一键训练全部未训练」= 前端串行循环调用单条训练接口，逐条更新进度条，失败跳过继续，结束汇总成功/失败数。

### 10. 前台聊天页改造

- 保留：页面结构、滚动策略、气泡样式、输入交互。
- 移除：`generateReply` 规则模拟与 16ms 打字机（改为 SSE 增量直接渲染）。
- 登录态：`useUserAuth`（token/user 存 localStorage，key `dl_user_token` / `dl_user`，独立于 admin）。未登录可看欢迎态与历史（本地无），**点击发送时弹登录卡片**（mock 模式显示「模拟微信扫码登录」按钮）；登录成功自动继续发送。
- 已登录：输入区上方显示昵称 + 退出。
- 429：气泡内提示 + 发送按钮倒计时禁用。
- 称呼：复用公开接口 `GET /api/public/home-page` 取 `siteName`，欢迎文案/placeholder 动态引用；`data/digitalLife.js` 的欢迎语与快捷问题更新为慕士塔格猫人格向（登山、inkheap、数字生命）。

### 11. 基础设施与部署

- `docker-compose.yml`：`postgres` 镜像 → `pgvector/pgvector:pg16`（同 PG16，pgdata 卷兼容，仍要求升级前备份）；新增 `redis` 服务；`backend` depends_on redis，env 增加 `REDIS_URL` / `WECHAT_MOCK` / `APP_ENCRYPTION_KEY`。
- Nginx（frontend）：`location /api` 增加 `proxy_read_timeout 120s`（SSE 长连接），配合后端 `X-Accel-Buffering: no`。
- 迁移：`prisma migrate dev --create-only` 后手工在迁移 SQL 追加 pgvector 扩展与 `dl_vectors` 建表（Prisma schema 不含该表，需在 migration 中以注释标明手写部分）。
- Seed：`DlPersona` 无记录时写入 skill 全文；`DlModelConfig` 无记录时写入默认记录（`glm-4.6`，无 Key）。

## Risks / Trade-offs

- **pgdata 卷随镜像切换**：同为 PG16 大版本数据目录兼容，但要求部署前 `docker compose down` + 备份卷，回滚成本低。
- **SSE 经 Nginx 反代**：靠 `X-Accel-Buffering: no` + `proxy_read_timeout 120s` 覆盖；若未来仍有中间层问题，需检查代理链路。
- **Redis 单点**：限流降级放行——被滥用风险换取可用性，个人站点可接受；后续可换「降级拒绝」。
- **令牌桶在多实例下的一致性**：Redis 集中式实现本身支持横向扩展，当前单实例无影响。
- **训练串行调 embedding API**：个人站数据量小（百级行），同步完成足够；「一键训练」由前端串行驱动，天然带进度反馈；若未来量级上来再做队列。
- **智谱 OpenAI 兼容端点**：个别参数（如部分 sampling 参数）兼容性以实测为准，`测试连接` 功能用于第一时间暴露问题。
- **人格 prompt 过长**：skill 全文约 2k 中文字符，处于 system prompt 安全范围，无风险。
- **ChatMessage 无限增长**：个人站访问量小；上下文仅取最近 10 轮，全量历史仅前端分页展示，暂不清理。
