# resume-api Specification

## ADDED Requirements

### Requirement: 简历数据模型（多版本）
系统 MUST 提供简历数据存储模型（`Resume`），以 JSON 结构承载前台简历页展示的全部内容。每条记录代表一个简历**版本**，字段至少覆盖：版本名称、激活标记（`isActive`）、内容 JSON（基本信息（姓名、handle、tagline、头像）、个人信息（邮箱、微信、意向城市、政治面貌、在职状态）、关于我（lead 文本 + callout）、教育背景、技术与能力（分类 + 名称/描述列表）、项目经历（标题/年份/描述/标签）、工作经历（角色/时间/组织/描述）、资质/证书标签组）、创建/更新时间。

#### Scenario: 模型包含全部区块
- **WHEN** 数据库迁移完成并存在简历版本记录
- **THEN** 该记录可以完整还原前台简历页所需的全部区块内容，无字段缺失

#### Scenario: 同一时刻至多一个激活版本
- **WHEN** 数据库中已有激活版本时创建或激活另一个版本
- **THEN** 数据库始终至多存在一条 `isActive = true` 的记录（切换激活时旧版本自动置为 `false`）

#### Scenario: 至少保留一个激活版本
- **WHEN** 后台尝试删除当前唯一的激活版本或将其取消激活
- **THEN** 操作被拒绝并返回 4xx 错误，数据库中仍有且仅有一个激活版本

### Requirement: 查询当前生效简历接口
系统 MUST 提供公开查询接口 `GET /api/resume`（或与现有公开路由风格一致），返回 `isActive = true` 的简历版本完整数据；前台简历页 MUST 通过该接口获取数据。

#### Scenario: 前台获取简历
- **WHEN** 前台简历页发起 `GET /api/resume`
- **THEN** 返回 200 与当前生效版本完整简历数据 JSON（含全部区块），并缓存在前端状态中用于渲染

#### Scenario: 无生效版本时返回默认值
- **WHEN** 数据库中尚无生效版本
- **THEN** 接口仍返回 200 与由种子/默认数据生成的简历内容，保证页面可正常渲染

### Requirement: 版本管理接口
系统 MUST 提供后台版本管理接口（均需管理员鉴权），至少包含：

- `GET /api/admin/resume`：返回全部版本列表（含 id、名称、激活标记、更新时间；不含完整 content，或含 content 由实现决定）
- `GET /api/admin/resume/:id`：返回指定版本详情（含完整 content）
- `POST /api/admin/resume`：新建版本（body 含名称、content；MUST 校验必要字段存在，校验失败返回 4xx）
- `PUT /api/admin/resume/:id`：更新指定版本（可更新名称与 content；MUST 校验必要字段存在）
- `PUT /api/admin/resume/:id/activate`：将指定版本切换为当前生效版本（旧激活版本自动取消激活）
- `DELETE /api/admin/resume/:id`：删除指定版本（当前唯一激活版本不可删除，返回 4xx）

#### Scenario: 后台保存修改
- **WHEN** 后台简历管理页提交编辑后的完整简历数据到 `PUT /api/admin/resume/:id`
- **THEN** 接口返回 200 与保存后的最新简历数据，该版本数据库内容被整体替换

#### Scenario: 缺少必填字段
- **WHEN** 提交数据缺少必填字段（如姓名为空）
- **THEN** 接口返回 4xx 错误并包含可读的错误提示，数据库内容保持不变

#### Scenario: 切换生效版本
- **WHEN** 后台对版本 B 调用 `PUT /api/admin/resume/:id/activate`，且当前生效版本为 A
- **THEN** A 的 `isActive` 置为 `false`，B 的 `isActive` 置为 `true`，`GET /api/resume` 返回 B 的内容

#### Scenario: 删除激活版本被拒绝
- **WHEN** 后台尝试删除当前唯一激活版本
- **THEN** 接口返回 4xx 错误并包含可读提示，版本记录保持不变

### Requirement: 数据库种子数据
系统 MUST 将当前前端 mock 数据（`frontend/src/data/resume.js`）迁移为简历种子数据，在数据库初始化/种子脚本执行时写入，并作为初始版本（名称如「默认版本」，`isActive = true`）。

#### Scenario: 种子脚本初始化简历
- **WHEN** 执行数据库种子脚本且数据库中无简历记录
- **THEN** 创建一条包含当前 mock 全部内容的简历版本记录并标记为激活，前台可直接展示

#### Scenario: 已有记录不被覆盖
- **WHEN** 数据库已存在简历记录时再次执行种子脚本
- **THEN** 已有记录保持不变，不被种子数据覆盖或重复创建
