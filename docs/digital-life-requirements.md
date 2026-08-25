# 数字生命（Digital Life）模块 · 清晰需求

> 版本：v0.1（设计阶段，未实现）
> 状态：已通过 grill-me 拷问确认，待 OpenSpec 规格化

---

## 1. 背景与目标

「数字生命」是对站主本人的一次"AI 蒸馏"：前台提供一个对话页面，访客可以向 AI 提问，AI 以站主的人设与口吻、并基于站主在站内沉淀的内容（关于我 / 小记 / 知识库）回答问题，让 AI 成为站主的一部分。

- 主要框架：**langchain.js**
- 向量数据库：**pgvector**（单一实现，不做多 Provider 切换）
- LLM：智谱 GLM 系，默认 `glm-4.7-flash`（免费），支持后台切换
- 现网约束：前台匿名访问（无登录体系），需预留未来用户体系

## 2. 术语表

| 术语 | 含义 |
|------|------|
| 训练数据源 | 参与 RAG 索引的三类数据：知识库（article）、小记（blog）、关于我（about） |
| 增量训练 | 只索引 `isTrained = 0` 且未删除的记录 |
| 全量重建 | 清空某数据源的全部向量后重新索引 |
| isTrained | 各内容表新增的训练状态字段（0 未训练 / 1 已训练） |
| deletedAt | 各内容表新增的软删除时间字段 |
| Persona | 数字生命的系统提示词（人设），后台可配置 |

## 3. 功能需求

### FR1 · 前台对话（数字生命页面）

- 页面：复用现有 `frontend/src/views/DigitalLifeView.vue`（`/digital-life`），保留逐字打字机、单会话、快捷问题等交互；将 `generateReply` 模拟逻辑替换为真实后端调用
- 提问：`POST /api/digital-life/chat`，请求体 `{ message, sessionId? }`
- 回复：**SSE 流式**返回 token 流，前端打字机消费
- 上下文：单会话（内存，服务端按 IP 维度存最近 N 轮，默认 10 轮），刷新/重启即清空
- 首条问候语与快捷问题来自 Persona 配置
- 匿名可用，不要求登录

### FR2 · 后台 RAG 训练

- 后台页面「数字生命 → 训练管理」`/admin/digital-life/training`
- 训练页功能：
  - 数据源勾选：知识库 / 小记 / 关于我（可多选）
  - 两个操作按钮：**增量训练**（索引 `isTrained=0`）、**全量重建**（清空该源向量后重灌）
  - **互斥**：同时只允许一个训练任务，重复触发返回"训练中"
  - **进度**：前端每 2s 轮询 `GET /admin/ai/trainings/status`，返回 `{ state, stage, processed, total }`（stage：读取 → 切分 → 向量化 → 入库）
  - **历史**：下方展示 `ai_training_logs` 记录（时间 / 数据源 / 模式 / 条数 / 耗时 / 状态）
- 索引范围：只索引已发布内容（`published = true`、`deletedAt = null`）
- 训练来源明细：
  - 知识库：`articles`（type=article），title + summary + content + tags
  - 小记：`blogs`，title + summary + quote + content + location + date
  - 关于我：`about_profile`（kicker/lede/evaluationQuote/evaluationBy）+ `about_rings` + `about_footprints` + `about_events`（`about_travels` 已下线，不索引）
- 文档构建：短记录（足迹/事件/年轮/资料）每条独立成块；长文用 `RecursiveCharacterTextSplitter` 切块（~500 tokens，重叠 50）
- 块元数据：`{ sourceType, sourceId, title, slug, url }`，用于溯源与删除定位

### FR3 · 模型与 Key 管理

- 后台页面「数字生命 → 模型设置」`/admin/digital-life/models`
- 模型：默认 `glm-4.7-flash`；后台下拉切换（仅智谱系内模型，列表存库可维护）
- **API-Key 存数据库**：支持多条 Key，后台增删改管，编辑时掩码显示；可切换当前生效 Key，多条 Key 支持启用/停用
- **Provider 抽象预留**：代码层定义 `interface AiProvider { chat() }`，本次仅实现 `ZhipuProvider`；Provider 表与 Key 表设计上支持未来接入 DeepSeek / OpenAI 等，本次不实现
- Key 管理接口仅后台 JWT 鉴权可访问
- Embedding：使用智谱 embedding 模型（与对话同 Key），pgvector 列维度按 embedding 模型确定

### FR4 · Persona 配置

- 后台页面「数字生命 → 人设设置」`/admin/digital-life/persona`
- 单行配置表字段：`name`（AI 名字）、`rolePrompt`（人设系统提示词）、`greeting`（欢迎语）、`temperature`（采样温度）、`maxContextRounds`（上下文轮数，默认 10）
- 检索策略：命中 RAG 块 → 基于检索块回答；**未命中** → 提示词引导 LLM 以人设+通用知识回答，开头如"我好像没写过这个话题，不过按我的性子聊聊"，不冷场也不虚构"我的经历"

### FR5 · 限流（令牌桶）

- 对象：前台对话接口 `POST /api/digital-life/chat`
- 算法：严格令牌桶，**按客户端 IP 独立桶**（`Map<ip, TokenBucket>`，内存实现；取 `X-Forwarded-For` / `CF-Connecting-IP` / 直连 IP）
- 参数：桶容量 5，补速 1 个 / 12s（即每分钟最多 5 次）
- 超限：返回 429 `{ retryAfter }`；前端 AI 回复展示"我想一下应该怎么回答，emmm..."（保持人设不冷场），不硬弹错误
- 后台管理接口不适用此限流（已有 JWT 鉴权）

### FR6 · 用户体系预留

- 新建 `users` 表（本次不开放注册/登录）：`id, openid(unique, 预留微信), nickname, avatar, createdAt, updatedAt`
- 本次匿名可用：对话不要求登录，会话与限流仍按 IP
- 预留演进：未来接入微信登录后，限流可升级为按 userId、会话可落库、RAG 可做个性化

## 4. 数据模型变更（Prisma）

- 内容表新增字段（article / blog / about 相关 5 张表）：`isTrained Int @default(0)`、`deletedAt DateTime?`
- 新增 `AiProvider`：`id, providerKey(unique), name, baseUrl, enabled, sortOrder`
- 新增 `AiModel`：`id, providerId, modelName, label, enabled, sortOrder`
- 新增 `AiApiKey`：`id, providerId, name, apiKey, enabled, sortOrder`
- 新增 `AiPersona`（单行）：`id, name, rolePrompt, greeting, temperature, maxContextRounds`
- 新增 `AiTrainingLog`：`id, sourceType, mode, totalCount, successCount, failedCount, durationMs, status, createdAt`
- 新增 `User`：`id, openid, nickname, avatar, createdAt, updatedAt`
- 新增向量表：`pgvector` 表（`vector` 列 + 元数据 JSONB + sourceType/sourceId 索引 + HNSW 索引）

## 5. 技术选型

| 项 | 选择 |
|----|------|
| 后端框架 | NestJS 11（现有） |
| LLM 框架 | langchain.js（`@langchain/core` + `@langchain/community`(Zhipu) / `@langchain/openai` 兼容端点） |
| 向量库 | pgvector（Postgres 扩展，Docker Compose 中启用） |
| 向量化 | 智谱 embedding（与对话同 Key） |
| 定时任务 | `@nestjs/schedule`，每小时执行向量清理（`deletedAt != null` → 删向量 → 物理删行） |
| 流式 | SSE（智谱 stream=true，langchain streamEvents 透传） |
| 限流 | 自研内存令牌桶（容量 5 / 补速 1 per 12s / 按 IP） |

## 6. 非功能需求

- 后台所有接口受 JWT 鉴权保护
- API-Key 仅后台可见，列表掩码（如 `4c67****cd3f`）；不得出现在前台接口/日志/SSE 流中
- 训练任务与对话请求互不阻塞（训练跑在后台，对话接口不受训练影响）
- 数据库迁移用 Prisma migrate；pgvector 扩展需在迁移前启用
- 所有新增接口遵循现有 `/api` 前缀与 useApi 封装规范

## 7. 范围外（本次不做）

- 微信登录 / 用户注册（仅建表预留）
- 跨 Provider 模型接入（DeepSeek / OpenAI / Ollama）
- 会话持久化 / 历史会话恢复
- 对话内容审核 / 敏感词过滤
- 多会话管理 / 会话列表 UI
