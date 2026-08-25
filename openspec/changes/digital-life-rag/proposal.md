## Why

「数字生命」页面（`/digital-life`）当前是纯前端原型：回复由 `frontend/src/data/digitalLife.js` 的规则匹配模拟，文案仍是占位的「数字林深」，没有真实的大模型、没有知识、没有身份体系。站长已在 `.codebuddy/skills/muztagh-cat` 中沉淀了完整的个人数字生命人格定义（性格、说话方式、记忆、经验），需要把它变成一个真实可对话的 AI 分身：以 RAG 检索站长自己的内容（知识库文章、小记、简历、关于我），以 GLM 系模型生成回复，让访客在「数字生命」模块里和「我」聊天。

同时缺少配套的运营能力：模型与 API Key 无法在后台切换、人格无法调整、哪些内容已进入向量库不可见。需要一套后台管理系统支撑「模型管理 / 人格管理 / RAG 训练管理」。

## What Changes

- **前台聊天页接入真实后端**：`DigitalLifeView.vue` 移除模拟回复，接入 SSE 流式聊天接口；称呼改为首页名称（`HomePage.siteName`），欢迎文案与快捷问题对齐慕士塔格猫人格。
- **访客登录体系（Mock 微信登录）**：新增 `wechat_users` 表与用户 JWT（`role=user`，与管理员 JWT 隔离）；`WECHAT_MOCK=true` 时提供模拟登录接口，前端在用户发送消息时弹出登录卡片；未来备案后接入真实微信扫码，前端零改动。
- **RAG 训练系统**：8 张数据源表（Article / Blog / Resume / AboutProfile / AboutRing / AboutFootprint / AboutTravel / AboutEvent）新增 `trainType` 字段（0 未训练 / 1 已训练 / 2 已移除训练）；训练将数据切分、经智谱 embedding-3 写入 PostgreSQL pgvector 向量表 `dl_vectors`；数据被编辑时自动重置为未训练并清除旧向量。
- **聊天 API 与人格注入**：新增数字生命后端模块，聊天时以人格库（初始值 = muztagh-cat skill 全文，后台可编辑）+ RAG top-5 检索片段 + 最近 10 轮历史组装上下文，调用 GLM 系模型，SSE 流式返回；聊天记录持久化，登录后可续聊。
- **限流**：Redis 令牌桶限制每用户每分钟 5 次提问，超限返回 429 与剩余等待秒数；docker-compose 新增 Redis 服务。
- **后台管理**：新增「数字生命」管理分组——模型管理（GLM 系模型下拉 + 自定义模型名、API Key 加密存储与脱敏显示、测试连接）、人格管理（独立编写页：在线编写与调整 muztagh-cat 人格、支持用未保存的草稿人格页内试聊验证、保存后即时生效、一键重置默认）、训练管理（按数据源分组查看训练状态、单条训练/移除、一键训练全部未训练并显示进度）。
- **基础设施**：PostgreSQL 镜像切换为 `pgvector/pgvector:pg16`；新增 Redis 7；后端新增 `REDIS_URL` / `WECHAT_MOCK` / `APP_ENCRYPTION_KEY` 环境变量。

## Capabilities

### New Capabilities

- `digital-life-user-auth`: 访客（微信用户）认证能力。Mock 微信登录接口（环境开关控制）、`wechat_users` 数据模型、与管理员隔离的用户 JWT 体系，预留真实微信扫码登录接入点。
- `digital-life-chat-api`: 数字生命聊天后端能力。SSE 流式聊天接口、RAG 检索与人格注入、多轮上下文、聊天记录持久化与查询、Redis 令牌桶限流。
- `digital-life-training`: RAG 训练系统能力。`trainType` 字段与生命周期（含编辑重置钩子）、pgvector 向量表、训练管道（文本拼装 → 切分 → 嵌入 → 写入）、训练/移除/列表接口。
- `digital-life-admin`: 数字生命后台管理能力。模型与 API Key 管理（加密、脱敏、测试连接）、人格管理、训练管理页面与导航入口。
- `digital-life-chat-page`: 前台聊天页面能力。登录卡片交互、SSE 流式渲染、历史消息加载、限流倒计时 UX、动态称呼与人格化文案。

### Modified Capabilities

<!-- 现有 specs 中无数字生命、访客登录、训练相关能力，无既有需求变更 -->

## Impact

- **后端**：
  - `backend-node/prisma/schema.prisma`：新增 `WechatUser` / `ChatMessage` / `DlModelConfig` / `DlPersona` 模型；8 张数据源表新增 `trainType` 字段
  - `backend-node/prisma/migrations/*`：新增迁移（Prisma 字段 + 原生 SQL：pgvector 扩展、`dl_vectors` 表、HNSW 索引）
  - `backend-node/prisma/seed.ts`：种子写入人格默认值（muztagh-cat skill 全文）与模型配置默认记录
  - 新增 `backend-node/src/modules/digitallife/`（wechat mock 登录、chat、model config、persona、training 等模块）
  - `backend-node/src/modules/auth/`：新增用户 JWT strategy/guard（role=user），现有 admin 鉴权不动
  - `backend-node/src/modules/article|xiaoji|resume|about/`：各 update 服务增加「已训练数据编辑后重置」钩子
  - `backend-node/package.json`：新增 `@langchain/core`、`@langchain/openai`、`@langchain/textsplitters`、`ioredis`
  - `backend-node/src/app.module.ts`：注册新模块
- **前端**：
  - `frontend/src/views/DigitalLifeView.vue`：移除模拟回复，接入登录卡片 / 历史 / SSE / 限流 UX
  - `frontend/src/data/digitalLife.js`：文案与快捷问题更新（人格向）
  - 新增 `frontend/src/composables/useUserAuth.js`（用户登录态，独立于 admin token）
  - 新增 `frontend/src/views/admin/digitallife/`（ModelManageView / PersonaManageView / TrainingManageView）及路由
  - `frontend/src/layouts/AdminShell.vue`：侧边栏新增「数字生命」分组
  - `frontend`（Nginx 配置）：`/api` 反代增加 `proxy_read_timeout` 与关闭缓冲，保障 SSE
- **基础设施**：
  - `docker-compose.yml`：postgres 换 `pgvector/pgvector:pg16`；新增 redis 服务；后端新增 env
  - 部署前需备份 `pgdata` 卷（镜像切换，同 PG16 大版本）
