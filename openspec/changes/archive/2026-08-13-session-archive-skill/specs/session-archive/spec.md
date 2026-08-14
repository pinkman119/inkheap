## ADDED Requirements

### Requirement: 目录结构初始化检查
SKILL 首次被调用时 SHALL 检查当前 agent 工作目录下是否存在 `session-archive/` 目录；若不存在则 MUST 创建该目录，并在其下按当前日期（`YYYY-M-D`）创建当日子目录。若当日目录已存在则 MUST 复用而非报错。

#### Scenario: 首次调用且目录不存在
- **WHEN** 用户首次触发会话归档功能且 `session-archive/` 不存在
- **THEN** SKILL 创建 `session-archive/` 以及 `session-archive/<今天日期>/` 目录

#### Scenario: 当日目录已存在
- **WHEN** 用户触发归档且 `session-archive/<今天日期>/` 已存在
- **THEN** SKILL 直接复用该目录，不抛出错误也不重复创建

### Requirement: 会话导出为 Markdown
SKILL SHALL 支持将当前会话保存为 Markdown 文档到 `session-archive/<日期>/<会话名>.md`。会话名由用户显式给出；若用户未说明，SKILL MUST 基于会话内容自动总结生成一个简短文件名（去除文件系统非法字符），并向用户回显确认。

#### Scenario: 用户指定会话名
- **WHEN** 用户执行归档并提供了会话名（如"图片上传"）
- **THEN** SKILL 将当前会话保存为 `session-archive/<日期>/图片上传.md`

#### Scenario: 用户未指定会话名
- **WHEN** 用户执行归档但未提供会话名
- **THEN** SKILL 自动总结会话内容生成文件名，回显给用户确认后写入对应 `.md` 文件

#### Scenario: 同名文件冲突
- **WHEN** 目标路径已存在同名归档文件
- **THEN** SKILL 追加序号（如 `图片上传-2.md`）或提示用户重命名，避免静默覆盖

### Requirement: 记录执行环境元数据
每个归档 Markdown 文件 MUST 在文档顶部以 YAML frontmatter 记录元数据：`title`（会话名）、`date`（归档日期）、`agent`（当前 Agent 名称，如 Claude Code）、`model`（当前 LLM 模型，如 GLM-5.2）、`status`（完成状态）。

#### Scenario: 写入 Agent 与 LLM 信息
- **WHEN** SKILL 创建归档文件 `图片上传.md`
- **THEN** 文件头部 frontmatter 包含 `agent` 与 `model` 字段，值与当前运行环境一致（例如 `agent: Claude Code`、`model: GLM-5.2`）

### Requirement: 完成状态标注
SKILL 在保存归档后 MUST 主动询问用户"当前会话是否已完成"，并据此将 `status` 设为 `completed`（已完成）或 `in-progress`（进行中），写入归档文件 frontmatter。

#### Scenario: 用户确认已完成
- **WHEN** SKILL 询问完成状态且用户回答已完成
- **THEN** 归档文件 `status` 设为 `completed`

#### Scenario: 用户表示进行中
- **WHEN** SKILL 询问完成状态且用户回答尚未完成
- **THEN** 归档文件 `status` 设为 `in-progress`

### Requirement: 归档浏览与摘要
SKILL SHALL 支持读取 `session-archive/` 目录，列出各归档会话，并为每个会话展示摘要信息：会话名（标题）、日期、Agent/LLM、完成状态。

#### Scenario: 浏览全部归档
- **WHEN** 用户请求查看归档会话列表
- **THEN** SKILL 递归读取 `session-archive/` 下所有 `.md`，输出每个会话的标题、日期、agent、model、status 摘要

### Requirement: 归档会话重新加载
SKILL SHALL 支持用户选择某个归档会话，将其内容重新加载到当前会话上下文中以便继续。重新加载时 MUST 标注来源文件，并优先注入摘要与关键结论以避免上下文膨胀。

#### Scenario: 重新加载指定归档
- **WHEN** 用户选择某个归档会话（如 `session-archive/2026-8-12/图片上传.md`）要求重新加载
- **THEN** SKILL 读取该文件（frontmatter 之后正文），作为上下文注入当前会话，并标注来源文件路径
