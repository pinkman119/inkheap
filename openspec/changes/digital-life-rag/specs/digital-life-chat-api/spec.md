# digital-life-chat-api Specification

## ADDED Requirements

### Requirement: SSE 流式聊天接口
系统 MUST 提供 `POST /api/user/digital-life/chat`（用户 JWT 鉴权），body `{ content }`，以 SSE（`text/event-stream`）流式返回数字生命的回复。事件协议：

- `event: delta`，`data: {"text": "<增量文本>"}`：逐段/逐 token 推送
- `event: done`，`data: {"messageId", "content"}`：回复结束，content 为完整文本
- `event: error`，`data: {"message"}`：生成过程中发生错误（已生成部分先入库再发 error）

响应 MUST 包含 `Cache-Control: no-cache` 与 `X-Accel-Buffering: no`（保障经 Nginx 反代时不被缓冲）。

#### Scenario: 正常流式回复
- **WHEN** 登录用户发送一条消息
- **THEN** 依次收到多个 delta 事件与一个 done 事件，前端拼接后得到完整回复，且该回复已持久化

#### Scenario: 生成中途出错
- **WHEN** 模型调用在流式输出过程中失败
- **THEN** 已生成的部分内容入库（若有），客户端收到 error 事件与可读错误信息，服务不崩溃

#### Scenario: 未配置 API Key
- **WHEN** 后台尚未配置模型 API Key 时调用聊天接口
- **THEN** 返回 409 与明确提示（后台未配置模型 API Key），不进入 SSE

### Requirement: 聊天记录持久化与历史查询
系统 MUST 将每轮对话（用户消息与 AI 回复）写入 `ChatMessage`（userId、role=user/assistant、content、createdAt），并提供 `GET /api/user/digital-life/messages`（用户 JWT）返回该用户最近 100 条消息（时间正序）。用户消息 MUST 在开始生成回复前先行入库。

#### Scenario: 历史恢复
- **WHEN** 用户刷新页面或重新登录（同一 openid）后进入聊天页
- **THEN** 通过历史接口取回此前对话并渲染，可无缝续聊

#### Scenario: 多用户隔离
- **WHEN** 用户 B 查询历史
- **THEN** 仅返回用户 B 自己的消息，看不到其他用户记录

### Requirement: 人格注入与动态称呼
聊天时系统 MUST 按以下顺序组装 system prompt：人格库（`DlPersona.content`，初始值为 muztagh-cat skill 全文）+ 补充规则（对外称呼为 `HomePage.siteName`；优先依据检索资料回答；资料未覆盖的信息诚实说明不编造）。人格内容支持后台在线修改，修改后对下一次提问即时生效。

#### Scenario: 人格生效
- **WHEN** 用户提问「你是谁 / 介绍一下你自己」
- **THEN** 回复以第一人称体现慕士塔格猫人格（性格、说话方式、登山与项目经历），自称使用首页名称

#### Scenario: 不编造
- **WHEN** 用户询问资料与人格中均不存在的信息（如编造的经历）
- **THEN** 数字生命诚实表示不了解/未被告知，不虚构细节

#### Scenario: 人格热更新
- **WHEN** 管理员在后台修改人格内容并保存
- **THEN** 后续提问的回复体现新人格，无需重启服务

### Requirement: RAG 检索增强
聊天时系统 MUST 将用户问题向量化（智谱 embedding-3，1024 维），在 `dl_vectors` 中做余弦相似度检索，取 top-5 片段（标注来源）注入 system prompt 作为回答依据。无命中时 MUST 正常回答（仅人格 + 历史，不报错）。

#### Scenario: 命中知识
- **WHEN** 用户提问的内容命中已训练的文章/小记/简历/关于我数据
- **THEN** 回复内容与检索到的资料一致，可正确转述对应事实

#### Scenario: 无命中
- **WHEN** 检索结果为空（如向量库尚无任何数据）
- **THEN** 聊天正常进行，回复基于人格与上下文，不抛错

### Requirement: 多轮上下文
聊天时系统 MUST 携带该用户最近 10 轮（20 条）历史消息作为对话上下文。

#### Scenario: 上下文连贯
- **WHEN** 用户在 10 轮内使用指代（如「再详细讲讲刚才提到的那个项目」）
- **THEN** 回复能正确关联此前对话内容

#### Scenario: 超出窗口截断
- **WHEN** 对话超过 10 轮
- **THEN** 仅最近 10 轮进入上下文，更早消息不参与（但历史接口仍可展示）

### Requirement: Redis 令牌桶限流
系统 MUST 使用 Redis（Lua 脚本原子实现）对聊天接口做令牌桶限流：按用户维度（userId），容量 5、速率每分钟 5 次。超限时不进入生成流程，直接返回 HTTP 429 与 `{ message, retryAfterSeconds }`。Redis 不可用时 MUST 降级放行并记录警告日志（服务可用性优先）。

#### Scenario: 1 分钟内第 6 次提问
- **WHEN** 同一用户 60 秒内第 6 次调用聊天接口
- **THEN** 返回 429 与剩余等待秒数，不调用大模型、不产生 SSE

#### Scenario: 等待后恢复
- **WHEN** 限流窗口过后再次提问
- **THEN** 正常放行并收到流式回复

#### Scenario: Redis 宕机降级
- **WHEN** Redis 连接失败时用户提问
- **THEN** 请求正常放行（记 warn 日志），聊天功能不中断

### Requirement: 模型接入范围
数字生命聊天与嵌入 MUST 通过智谱 OpenAI 兼容端点（`https://open.bigmodel.cn/api/paas/v4/`）调用 GLM 系模型与 embedding-3，模型名与 API Key 均来自后台模型配置（见 digital-life-admin），代码中不得硬编码 Key。模型名支持自定义输入（为后续其他 GLM 型号/厂商预留）。

#### Scenario: 后台切换模型
- **WHEN** 管理员将 chatModel 从 glm-4.6 切换为 glm-4.5-air 并保存
- **THEN** 之后的新对话使用新模型生成
