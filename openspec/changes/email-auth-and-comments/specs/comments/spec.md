# comments 规格

## ADDED Requirements

### Requirement: 评论展示（知识库文章与小记详情页）
系统 SHALL 在知识库文章详情页（ArticleDetailView）与小记详情页（NoteDetailView）文末展示评论区：顶层评论按时间倒序分页展示，每条顶层评论下的回复按时间正序展示，回复显示「回复 @<被回复人昵称>」。

#### Scenario: 加载文章评论
- **WHEN** 访客打开一篇知识库文章详情页
- **THEN** 页面文末展示该文章的评论区，加载顶层评论及各自回复

#### Scenario: 加载小记评论
- **WHEN** 访客打开一篇小记详情页
- **THEN** 页面文末展示该小记的评论区，加载顶层评论及各自回复

#### Scenario: 无评论时展示空状态
- **WHEN** 访客打开的内容没有任何评论
- **THEN** 评论区展示空状态引导文案（如「还没有评论」）

### Requirement: 发表评论需登录
系统 SHALL 要求用户登录后才能发表评论；未登录用户点击评论框或发送按钮时弹出全局登录弹窗，登录成功后自动继续被拦截的操作。

#### Scenario: 未登录发表评论被拦截
- **WHEN** 未登录用户在评论框输入内容并点击发送
- **THEN** 弹出全局登录弹窗，评论草稿保留

#### Scenario: 登录后自动继续
- **WHEN** 用户在弹窗中完成登录
- **THEN** 弹窗关闭，之前拦截的评论自动提交

### Requirement: 发表顶层评论
系统 SHALL 支持登录用户在指定内容（article/note）下发表顶层评论。

#### Scenario: 发表顶层评论成功
- **WHEN** 已登录用户提交评论（targetType、targetId、内容非空）
- **THEN** 系统创建 parentId 为空的评论记录并返回该评论（含评论人昵称、时间）

#### Scenario: 评论内容为空
- **WHEN** 已登录用户提交空内容
- **THEN** 系统拒绝（400）

#### Scenario: 评论频率限制
- **WHEN** 同一用户在短时间内高频提交评论
- **THEN** 超出频率限制的请求被拒绝（429）

### Requirement: 一层盖楼回复
系统 SHALL 支持对顶层评论的回复；回复 MUST 挂在顶层评论下（parentId = 顶层评论 id），对回复的再回复在数据上仍是同一顶层的直接回复，展示为「回复 @<被回复人昵称>」。系统 SHALL 禁止三层及以上嵌套：后端 MUST 校验 parentId 指向的评论本身是顶层评论，否则拒绝；前端 SHALL 不对二层评论提供回复入口。

#### Scenario: 回复顶层评论
- **WHEN** 已登录用户对某顶层评论点击「回复」并提交
- **THEN** 系统创建 parentId 指向该顶层评论、replyToUserId 为顶层评论作者的回复，展示在顶层评论下

#### Scenario: 回复某条回复（同层挂靠）
- **WHEN** 已登录用户对顶层评论下的某条回复提交回复（前端不再提供入口，但接口被直接调用）
- **THEN** 系统将该回复挂到同一条顶层评论下（parentId = 顶层评论 id），展示为「回复 @<原回复者>」，与原回复同层

#### Scenario: parentId 指向非顶层评论
- **WHEN** 请求体中 parentId 指向的评论本身是回复（其 parentId 非空）
- **THEN** 系统返回 400，拒绝创建

#### Scenario: parentId 指向其他内容的评论
- **WHEN** 请求体中 parentId 指向的评论不属于同一 targetType/targetId
- **THEN** 系统返回 400，拒绝创建

### Requirement: 评论无点赞、无用户自删
系统 SHALL NOT 提供评论点赞功能；SHALL NOT 提供用户删除自己评论的功能（删除仅由后台管理端执行）。

#### Scenario: 评论组件无点赞与删除入口
- **WHEN** 已登录用户浏览评论区
- **THEN** 评论项不展示点赞按钮，也不展示删除自己评论的入口

### Requirement: 评论公开可读
系统 SHALL 允许未登录访客浏览全部评论（评论读取无需登录）；数字生命聊天之外的其他前台功能 SHALL NOT 因未登录受限。

#### Scenario: 未登录浏览评论
- **WHEN** 未登录访客打开文章或小记详情页
- **THEN** 评论区正常加载展示，仅发表被拦截
