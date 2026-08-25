# digital-life-training Specification

## ADDED Requirements

### Requirement: trainType 字段与生命周期
系统 MUST 在以下 8 张数据源表中新增 `trainType` 字段（整数，默认 0）：`Article`（知识库文章）、`Blog`（小记）、`Resume`、`AboutProfile`、`AboutRing`、`AboutFootprint`、`AboutTravel`、`AboutEvent`。语义：

- `0`：未训练（尚未嵌入向量库，或编辑后已失效待重训）
- `1`：已训练（向量库中存在其向量）
- `2`：已移除训练（曾被训练后手动移除，向量已删除）

训练列表与训练管道 MUST 不做发布状态过滤（草稿同样可训练）；`Resume` MUST 仅 `isActive=true` 的版本参与训练与展示。存量数据迁移后 trainType 全部为 0。

#### Scenario: 新数据默认未训练
- **WHEN** 新建一篇文章或小记
- **THEN** 其 trainType 为 0，出现在训练页未训练列表中

#### Scenario: 草稿可训练
- **WHEN** 管理员对一篇 `published=false` 的文章点击训练
- **THEN** 训练成功，trainType 置 1，向量入库

#### Scenario: 仅激活简历参与
- **WHEN** 简历存在多版本且训练页/管道处理简历数据
- **THEN** 只有 isActive=true 的版本出现在列表中并可被训练

### Requirement: 编辑后自动失效重训
系统 MUST 在数据源内容被更新保存成功后，检查该行 trainType：若为 1，则删除其全部向量并重置为 0（需重新训练）。该钩子 MUST 覆盖 article、xiaoji（Blog）、resume、about 各模块的更新入口。删除数据源行时 MUST 同步删除其向量。

#### Scenario: 编辑已训练文章
- **WHEN** 管理员修改一篇 trainType=1 的文章并保存
- **THEN** `dl_vectors` 中该文章的向量被删除，trainType 回 0，训练页重新出现该条

#### Scenario: 未训练数据编辑不受影响
- **WHEN** 修改 trainType=0 的数据
- **THEN** trainType 保持 0，无额外动作

### Requirement: pgvector 向量存储
系统 MUST 使用 PostgreSQL pgvector 扩展存储向量，表 `dl_vectors`（Prisma schema 外，由原生 SQL migration 管理）：`id UUID PK`、`ref_type`（8 种数据源标识）、`ref_id`、`chunk_index`、`content`（chunk 文本）、`embedding VECTOR(1024)`、时间戳；`(ref_type, ref_id, chunk_index)` 唯一；embedding 列建 HNSW 余弦索引。嵌入模型固定为智谱 embedding-3（1024 维）。

#### Scenario: 迁移就绪
- **WHEN** 执行数据库迁移
- **THEN** vector 扩展创建、`dl_vectors` 表与索引存在，Prisma 侧模型（wechat_users 等）同步生成

#### Scenario: 余弦检索可用
- **WHEN** 表中已有向量并执行相似度检索
- **THEN** 按 cosine 距离返回 top-K 结果（走 HNSW 索引）

### Requirement: 训练管道
系统 MUST 提供训练能力：读取源表行 → 按 design 规则拼装文本（各表有明确拼装格式，含来源标签如【知识库文章】【小记】）→ `RecursiveCharacterTextSplitter`（chunk 800 / overlap 100）切分 → embedding-3 批量嵌入 → 事务内先删除该 `(ref_type, ref_id)` 全部旧向量再写入新向量 → 源表 trainType 置 1。训练 MUST 幂等：对同一行重复训练产生替换效果，不残留孤儿向量。

#### Scenario: 单条训练
- **WHEN** 管理员对一条未训练小记点击「训练」
- **THEN** 该行被切分为若干 chunk 并全部入库，trainType=1

#### Scenario: 重复训练替换
- **WHEN** 对同一行再次点击「训练」
- **THEN** 旧向量被整体替换为新向量，表内无该行的孤儿/重复数据

#### Scenario: 长文多 chunk
- **WHEN** 训练一篇远超 800 字符的文章
- **THEN** 产生多个 chunk，chunk_index 连续且各自携带原文片段

#### Scenario: 未配置 Key
- **WHEN** 后台未配置 API Key 时点击训练
- **THEN** 返回 409 与明确提示，trainType 与向量库均不变

### Requirement: 移除训练
系统 MUST 提供「移除训练」操作：删除该 `(ref_type, ref_id)` 的全部向量，源表 trainType 置 2。移除后该内容不再参与 RAG 检索，且可通过再次训练回到 1。

#### Scenario: 移除后不再命中
- **WHEN** 移除某已训练文章的训练后用户询问其内容
- **THEN** 检索不再返回该文章片段，回复不再依据它

#### Scenario: 移除后重新训练
- **WHEN** 对 trainType=2 的行再次点击训练
- **THEN** 向量重新入库，trainType 置 1

### Requirement: 训练数据列表与操作接口
系统 MUST 提供后台接口（管理员鉴权）：

- `GET /api/admin/digital-life/training/:refType`：分页列表，每行含标识、标题/摘要、更新时间、trainType；支持按 trainType 筛选
- `POST /api/admin/digital-life/training/:refType/:refId/train`：单条训练
- `POST /api/admin/digital-life/training/:refType/:refId/remove`：单条移除训练

refType 枚举：`article` / `blog` / `resume` / `about_profile` / `about_ring` / `about_footprint` / `about_travel` / `about_event`。

#### Scenario: 列表分页与筛选
- **WHEN** 管理员打开训练页切换数据源 tab 并筛选「未训练」
- **THEN** 返回对应数据的分页列表，状态徽标与数据库一致

#### Scenario: 单条训练接口
- **WHEN** 调用 train 接口训练指定行
- **THEN** 返回成功与该行最新 trainType，前端列表状态即时更新
