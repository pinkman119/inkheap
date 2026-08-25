# digital-life-admin Specification

## ADDED Requirements

### Requirement: 模型管理页
系统 MUST 提供后台页面 `/admin/digital-life/model`（管理员鉴权）管理数字生命模型配置：

- 聊天模型：GLM 系预设下拉（glm-4.7 / glm-4.6 / glm-4.5 / glm-4.5-air / glm-4.5-flash / glm-4-flash）+ 自定义模型名输入（为后续型号预留）
- 嵌入模型：默认 embedding-3（展示，暂不开放切换）
- API Key：输入框编辑；保存后页面仅显示脱敏形式（`sk-****last4`）
- 「测试连接」：以当前保存的配置发起一次最小模型调用，展示成功/失败与耗时

#### Scenario: 保存并脱敏
- **WHEN** 管理员输入新 API Key 保存
- **THEN** 配置更新成功，页面回显脱敏 Key，数据库中为密文

#### Scenario: 测试连接成功
- **WHEN** 配置有效 Key 后点击测试连接
- **THEN** 展示连接成功与耗时

#### Scenario: 测试连接失败
- **WHEN** Key 无效或模型名错误时测试
- **THEN** 展示失败与可读错误原因（如鉴权失败、模型不存在）

### Requirement: API Key 加密存储
系统 MUST 以 AES-256-GCM 加密存储 API Key（密文列 `api_key_enc`），加密密钥来自环境变量 `APP_ENCRYPTION_KEY`；密钥未配置时后端 MUST 启动失败（fail-fast）。任何接口 MUST NOT 返回明文 Key，仅返回脱敏形式。

#### Scenario: 数据库无明文
- **WHEN** 保存 Key 后直接查询数据库
- **THEN** `api_key_enc` 为密文，无法直接读出明文 Key

#### Scenario: 缺少加密密钥
- **WHEN** 后端启动且未配置 `APP_ENCRYPTION_KEY`
- **THEN** 启动报错退出，提示配置该环境变量

### Requirement: 人格管理页
系统 MUST 提供后台人格编写页 `/admin/digital-life/persona`（管理员鉴权），用于在线编写并调整 muztagh-cat 人格：

- **编写**：大文本域承载人格 prompt 全文（初始值为 muztagh-cat skill 全文），实时字符数统计，存在未保存修改时离开页面 MUST 提示确认（脏检查）
- **试聊验证**：页内提供「试聊」面板，输入测试问题调用 `POST /api/admin/digital-life/persona/test-chat`（body `{ content, useDraft, draftPersona }`）；`useDraft=true` 且携带 `draftPersona` 时 MUST 以草稿人格组装提示词（不落库、不影响线上人格），支持保存前预览效果；试聊 MUST 走与真实聊天一致的链路（人格 + RAG 检索 + 动态称呼），但试聊消息 MUST NOT 写入用户聊天记录
- **保存**：保存后对下一次真实聊天即时生效，无需重启
- **重置为默认**：恢复 skill 原文，需二次确认

#### Scenario: 编写并保存
- **WHEN** 管理员在文本域修改人格内容并保存
- **THEN** 保存成功提示，此后用户的提问以新人格回答

#### Scenario: 草稿试聊（先试后存）
- **WHEN** 管理员在未保存的草稿人格下于试聊面板提问「你是谁」
- **THEN** 试聊回复按草稿人格生成（而非已保存人格），且线上人格与聊天记录均不受影响

#### Scenario: 未保存离开提示
- **WHEN** 文本域存在未保存修改时管理员切换页面
- **THEN** 弹出确认提示（放弃/留下），避免误丢草稿

#### Scenario: 编辑生效
- **WHEN** 管理员在人格中加入一句明确的口头禅并保存
- **THEN** 之后用户的提问，数字生命回复中体现该口头禅

#### Scenario: 重置默认
- **WHEN** 点击「重置为默认」并确认
- **THEN** 人格内容恢复为 muztagh-cat skill 原文

### Requirement: 训练管理页
系统 MUST 提供后台页面 `/admin/digital-life/training`（管理员鉴权）：

- 按数据源分组 tab：文章（知识库）/ 小记 / 简历 / 关于我
- 列表：分页展示，每行含标题/摘要、更新时间、trainType 状态徽标（0 未训练=灰、1 已训练=绿、2 已移除=橙）
- 行操作：「训练」（0/2 → 1）与「移除训练」（1 → 2），操作后行内状态即时更新
- 「一键训练全部未训练」：串行逐条调用单条训练接口，实时显示进度（已处理/总数）与当前处理条目；单条失败跳过继续，完成后汇总成功/失败数

#### Scenario: 单条训练交互
- **WHEN** 管理员点击某未训练行的「训练」
- **THEN** 按钮进入加载态，完成后徽标变绿，失败时行内提示错误

#### Scenario: 批量训练进度
- **WHEN** 点击「一键训练全部未训练」（共 23 条）
- **THEN** 进度实时推进（1/23…23/23），期间可中途停止；结束后显示成功 N 条、失败 M 条及失败清单

#### Scenario: 移除训练
- **WHEN** 点击已训练行的「移除训练」
- **THEN** 徽标变橙，该内容后续不再参与 RAG 检索

### Requirement: 后台导航入口
`AdminShell` 侧边栏 MUST 新增「数字生命」分组，包含三个入口：模型管理（`/admin/digital-life/model`）、人格管理（`/admin/digital-life/persona`）、训练管理（`/admin/digital-life/training`），路由均为 `layout-admin` + `auth: true`。

#### Scenario: 入口可达
- **WHEN** 管理员登录后台
- **THEN** 侧边栏可见「数字生命」分组，三个页面均可正常打开与操作

### Requirement: 后台接口鉴权
所有数字生命后台接口（模型配置读写与测试、人格读写/重置/试聊、训练列表/训练/移除）MUST 挂管理员 JWT 鉴权；用户 JWT 访问 MUST 返回 401。

#### Scenario: 用户 token 越权
- **WHEN** 携带 role=user 的 token 调用任一 `/api/admin/digital-life/*` 接口
- **THEN** 返回 401
