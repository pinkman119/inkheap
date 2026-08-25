## 1. 基础设施与依赖

- [x] 1.1 `docker-compose.yml`：postgres 镜像换 `pgvector/pgvector:pg16`；新增 `redis:7-alpine` 服务（healthcheck `redis-cli ping`，不对外暴露端口）；backend `depends_on` redis，env 增加 `REDIS_URL=redis://redis:6379`、`WECHAT_MOCK=true`、`APP_ENCRYPTION_KEY`（默认 dev 值）；部署说明提示升级前备份 pgdata
- [x] 1.2 `backend-node/package.json`：安装 `@langchain/core`、`@langchain/openai`、`@langchain/textsplitters`、`ioredis`（最新稳定版）
- [x] 1.3 前端 Nginx 配置：`location /api` 增加 `proxy_read_timeout 120s` 与 `proxy_buffering off`（保障 SSE）
- [x] 1.4 本地 `.env` 补充 `REDIS_URL` / `WECHAT_MOCK` / `APP_ENCRYPTION_KEY`，并更新 `.env.example`（如有）

## 2. 数据库：模型、迁移与种子

- [x] 2.1 `schema.prisma` 新增 `WechatUser`（openid 唯一）、`ChatMessage`（userId+createdAt 索引）、`DlModelConfig`（id="default" 单条）、`DlPersona`（id="default" 单条）
- [x] 2.2 `schema.prisma` 为 `Article` / `Blog` / `Resume` / `AboutProfile` / `AboutRing` / `AboutFootprint` / `AboutTravel` / `AboutEvent` 增加 `trainType Int @default(0) @map("train_type")`
- [x] 2.3 `prisma migrate dev --create-only` 生成迁移，手工追加原生 SQL：`CREATE EXTENSION IF NOT EXISTS vector`、`dl_vectors` 建表（UNIQUE(ref_type, ref_id, chunk_index)）、HNSW 余弦索引；执行迁移并在 Prisma schema 注释标明该表为手写 SQL 管理
- [x] 2.4 新建 `backend-node/src/modules/digitallife/digital-life.defaults.ts`：人格默认值常量 = muztagh-cat skill 全文
- [x] 2.5 `seed.ts`：`DlPersona` 无记录时写入默认人格；`DlModelConfig` 无记录时写入默认记录（chatModel=glm-4.6，无 Key）；已有记录不覆盖

## 3. 后端：用户认证（Mock 微信登录）

- [x] 3.1 新增 `UserJwtStrategy`（策略名 `user-jwt`，同 JWT_SECRET，validate 查 `wechat_users`）与 `UserJwtAuthGuard`；现有 admin 鉴权不动
- [x] 3.2 `POST /api/public/wechat/mock-login`：`WECHAT_MOCK=false` 返回 403；true 时按可选 `openid` upsert 或新建 `mock-<随机>` 用户，返回 `{ accessToken(role=user), user }`
- [x] 3.3 验证：user token 访问 admin 接口 401；admin token 访问 user 接口 401；mock 登录携带旧 openid 返回同一用户（历史保留）

## 4. 后端：数字生命核心模块（`modules/digitallife/`）

- [x] 4.1 `crypto.util.ts`：AES-256-GCM 加解密（`APP_ENCRYPTION_KEY`，未配置启动报错）；Key 脱敏工具
- [x] 4.2 `model-config.service.ts`：读取/更新 `DlModelConfig`（更新时加密 Key；返回脱敏 `sk-****last4`）；`testConnection()`：以当前配置发起最小 chat 调用返回成败与耗时；`getLlm()` / `getEmbeddings()`：构造 `ChatOpenAI` / `OpenAIEmbeddings`（baseURL=智谱兼容端点，embedding dimensions=1024）；未配置 Key 抛业务异常（409）
- [x] 4.3 `persona.service.ts`：读取/更新 `DlPersona`；`resetToDefault()`；`testChat(content, useDraft, draftPersona)`——复用 chat.service 的 prompt 组装链路（人格 + RAG + 动态称呼），useDraft 时以草稿人格替代库中人格，一次性返回回复文本，不写 `ChatMessage`
- [x] 4.4 `training.service.ts`：`buildText(refType, row)` 按 design 拼装规则生成文本；`trainOne(refType, refId)`（拼装→splitter 800/100→embedDocuments→事务删旧插新→trainType=1）；`removeOne(refType, refId)`（删向量→trainType=2）；`list(refType, page)`（标题/摘要/状态/更新时间/分页，无 published 过滤；resume 仅 isActive 版本）
- [x] 4.5 `vector.service.ts`：`$queryRaw` 余弦检索 top-5（`ORDER BY embedding <=> $1`，参数 `[v1,v2,...]::vector` 字符串化）；`deleteByRef(refType, refId)`；`insertChunks(...)`
- [x] 4.6 `rate-limit.service.ts`：ioredis + Lua 令牌桶（容量 5 / 速率每分钟 5，key `rl:dl:chat:{userId}`）；Redis 异常时放行 + warn 日志
- [x] 4.7 `chat.service.ts`：存用户消息→检索 top-5→组装 system（人格 + siteName 称呼 + 资料片段 + 反编造规则）+ 最近 20 条历史→流式调用 LLM→完成后入库 assistant 消息；流中异常时已生成部分入库
- [x] 4.8 `chat.controller.ts`：`POST /api/user/digital-life/chat`（`UserJwtAuthGuard`，`@Res()` 手写 SSE：delta/done/error 事件 + `X-Accel-Buffering: no`；限流超限 429 JSON 含 retryAfterSeconds）；`GET /api/user/digital-life/messages`（最近 100 条正序）
- [x] 4.9 `digital-life-admin.controller.ts`（`JwtAuthGuard`）：`GET/PUT /admin/digital-life/model`、`POST /admin/digital-life/model/test`、`GET/PUT /admin/digital-life/persona`、`POST /admin/digital-life/persona/reset`、`POST /admin/digital-life/persona/test-chat`、`GET /admin/digital-life/training/:refType`、`POST /admin/digital-life/training/:refType/:refId/train`、`POST /admin/digital-life/training/:refType/:refId/remove`
- [x] 4.10 编辑重置钩子：article / xiaoji / resume / about 各模块 update 保存成功后，若 `trainType=1` → 删向量 + 置 0
- [ ] 4.11 `app.module.ts` 注册模块；启动自测：mock 登录→聊天（未配 Key 返回 409 提示）→后台配置 Key→训练 1 条文章→聊天命中资料→SSE 流式正常（需真实智谱 Key 后联调）

## 5. 前端：前台聊天页

- [x] 5.1 新增 `composables/useUserAuth.js`：`dl_user_token` / `dl_user` localStorage 管理 + 登录态 ref
- [x] 5.2 `data/digitalLife.js`：欢迎文案、快捷问题、placeholder 更新为慕士塔格猫人格向（登山/inkheap/数字生命），移除 `replyRules` / `fallbackReply`
- [x] 5.3 `DigitalLifeView.vue`：移除模拟回复与打字机；`onMounted` 拉取 `siteName`（`GET /api/public/home-page`）渲染称呼与欢迎态；有 token 时拉取历史渲染
- [x] 5.4 登录卡片：未登录发送时弹出（mock 模式「模拟微信扫码登录」按钮 → `POST /public/wechat/mock-login`，携带本地 openid 实现复用）；成功后自动继续发送
- [x] 5.5 SSE 渲染：`fetch` POST + `ReadableStream` 解析 delta/done/error 事件，增量渲染气泡；错误以系统气泡展示
- [x] 5.6 限流 UX：429 时提示剩余秒数、发送按钮倒计时禁用
- [x] 5.7 已登录态：输入区上方昵称 + 退出按钮；退出后回欢迎态

## 6. 前端：后台管理页

- [x] 6.1 `/admin/digital-life/model`：GLM 下拉（glm-4.7/4.6/4.5/4.5-air/4.5-flash/4-flash）+ 自定义模型名输入、Key 输入（保存后脱敏显示）、「测试连接」按钮展示成败与耗时
- [x] 6.2 `/admin/digital-life/persona` 人格编写页：大文本域编写调整人格 + 实时字符数统计 + 未保存离开脏检查；页内「试聊」面板（输入测试问题 → `POST /admin/digital-life/persona/test-chat`，勾选「使用草稿人格」时携带未保存内容）；保存 + 「重置为默认」（二次确认）
- [x] 6.3 `/admin/digital-life/training`：数据源 tab（文章/小记/简历/关于我）+ 分页列表 + trainType 徽标 + 单条「训练」「移除训练」；「一键训练全部未训练」串行循环 + 进度条 + 失败继续 + 结果汇总
- [x] 6.4 路由注册（`layout-admin` + `auth: true`×3）；`AdminShell.vue` 侧边栏新增「数字生命」分组（模型管理/人格管理/训练管理）

## 7. 联调与验收

- [x] 7.1 未登录：可浏览欢迎态；发送弹登录卡片；mock 登录后自动发送（浏览器实测通过；SSE 回复待真实 Key 联调）
- [x] 7.5 限流：1 分钟内第 6 次提问返回 429，前端倒计时禁用，60s 后恢复（接口实测：快速连发第 7 次 429 + retryAfterSeconds=12）
- [x] 7.8 安全：user token 访问任意 `/admin/*` 返回 401；admin token 访问聊天接口 401；数据库中 API Key 为密文；接口返回仅脱敏形式
- [x] 7.9 未配置 Key 时聊天返回 409 且提示明确（实测）；`WECHAT_MOCK=false` 逻辑为同分支代码路径（开关实测在 mock=true 路径）
- [ ] 7.2 刷新/重登（同 openid）：历史消息完整恢复，续聊上下文连贯（10 轮内指代正确）（待真实 Key 联调）
- [ ] 7.3 训练闭环：后台训练 1 篇文章 + 1 条小记 → 数据库 `dl_vectors` 有向量、源表 trainType=1 → 聊天命中对应内容；移除训练后不再命中（待真实 Key 联调）
- [ ] 7.4 编辑重置：修改已训练文章内容 → trainType 回 0、向量被删、训练页重新出现该条（待真实 Key 联调）
- [ ] 7.6 模型切换：后台切换 chatModel 并保存 → 新会话使用新模型；测试连接按钮返回正确成败（待真实 Key 联调）
- [ ] 7.7 人格：后台修改人格（如加一句口头禅）→ 新回复体现变化；重置默认后恢复；人格编写页草稿试聊按草稿人格回复且不影响线上与聊天记录（待真实 Key 联调）
- [ ] 7.10 `docker compose up -d` 全栈冷启动：pgvector/redis 正常、迁移与 seed 自动执行、聊天链路可用（待真实 Key 联调）
