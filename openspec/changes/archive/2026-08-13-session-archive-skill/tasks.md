## 1. SKILL 脚手架与元信息

- [x] 1.1 在仓库（或 agent 技能目录）下创建 `session-archive` SKILL 文件夹，包含 `SKILL.md` 与说明。
- [x] 1.2 在 `SKILL.md` 中声明触发条件：用户提及"归档会话/保存会话/查看归档/重新加载会话"等意图时加载本 SKILL。
- [x] 1.3 在 `SKILL.md` 头部声明 frontmatter（name、description、适用场景），与既有 available_skills 格式对齐。

## 2. 目录结构初始化

- [x] 2.1 实现"首次调用结构检查"逻辑：检测当前 agent 工作目录下是否存在 `session-archive/`，不存在则创建。
- [x] 2.2 实现按当前日期（`YYYY-M-D`）创建/复用当日子目录 `session-archive/<日期>/` 的逻辑。
- [x] 2.3 在 SKILL 提示中说明路径使用平台无关的相对路径写法（兼容 Windows / macOS / Linux）。

## 3. 会话导出与元数据

- [x] 3.1 实现将当前会话内容导出为 Markdown，写入 `session-archive/<日期>/<会话名>.md`。
- [x] 3.2 实现会话名解析：用户指定则采用；未指定则基于会话内容自动总结生成短文件名（去非法字符、截断），并回显确认。
- [x] 3.3 实现 YAML frontmatter 写入：`title`、`date`、`agent`（当前 Agent，如 Claude Code）、`model`（当前 LLM，如 GLM-5.2）、`status`。
- [x] 3.4 实现同名冲突处理：追加序号（如 `图片上传-2.md`）或提示用户重命名，避免静默覆盖。

## 4. 完成状态标注

- [x] 4.1 在保存归档后主动询问用户"当前会话是否已完成"。
- [x] 4.2 根据用户回答将 `status` 写入 `completed` 或 `in-progress` 到归档文件 frontmatter。

## 5. 归档浏览与摘要

- [x] 5.1 实现读取 `session-archive/` 目录，递归收集所有 `.md` 归档文件。
- [x] 5.2 解析每个归档文件的 frontmatter，向用户展示摘要：标题、日期、agent、model、status。

## 6. 归档重新加载

- [x] 6.1 实现用户选择某一归档文件后，读取其 frontmatter 之后的正文内容。
- [x] 6.2 将正文作为上下文注入当前会话，并标注来源文件路径；默认优先注入摘要与关键结论以避免上下文膨胀。

## 7. 收尾与校验

- [x] 7.1 在 `SKILL.md` 中补充敏感内容提醒：归档前确认不含密钥/隐私，默认不写入共享路径。
- [x] 7.2 端到端自测：初始化 → 导出（含自动命名/冲突）→ 状态标注 → 浏览 → 重新加载 全链路跑通。
