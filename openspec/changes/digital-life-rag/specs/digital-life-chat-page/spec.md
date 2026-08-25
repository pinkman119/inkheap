# digital-life-chat-page Specification

## ADDED Requirements

### Requirement: 登录拦截与登录卡片
前台聊天页 MUST 支持未登录浏览（欢迎态、快捷问题可见）；当未登录用户点击发送时，MUST 弹出登录卡片拦截本次发送，卡片在 Mock 模式下提供「模拟微信扫码登录」按钮（调用 mock 登录接口，携带本地已存的 openid 以复用身份）。登录成功后卡片关闭并自动继续完成刚才被拦截的发送。用户登录态（token 与用户信息）MUST 独立于管理员登录态存储（localStorage `dl_user_token` / `dl_user`）。

#### Scenario: 未登录发送被拦截
- **WHEN** 未登录用户输入文字点击发送
- **THEN** 弹出登录卡片，消息不发送、不丢失（登录后自动发出）

#### Scenario: 模拟登录续身份
- **WHEN** 曾登录过的浏览器（本地存有 openid）再次触发登录
- **THEN** 复用同一 mock 用户，进入后可见历史聊天

#### Scenario: 登录后自动续发
- **WHEN** 用户在登录卡片完成登录
- **THEN** 卡片关闭，被拦截的消息自动发出并收到流式回复

### Requirement: SSE 流式渲染
聊天页 MUST 通过 `fetch` POST + `ReadableStream` 消费聊天接口的 SSE 流：delta 事件增量渲染 AI 气泡（保留现有气泡样式与滚动跟随策略），done 事件结束本轮，error 事件以系统提示气泡展示错误。移除原型的规则匹配模拟回复与 16ms 打字机。

#### Scenario: 流式逐字渲染
- **WHEN** 收到流式回复
- **THEN** AI 气泡内容随 delta 事件逐步增长，页面自动跟随滚动（用户上翻时显示「新消息」跳转按钮，行为与现有一致）

#### Scenario: 错误展示
- **WHEN** 收到 error 事件（如模型调用失败）
- **THEN** 以可读的系统气泡提示错误，输入框恢复可用

### Requirement: 历史消息加载
已登录用户进入聊天页时 MUST 调用历史接口拉取并渲染其最近聊天记录（时间正序），实现「单一持续会话」的续聊体验；未登录或无记录时展示欢迎态。

#### Scenario: 恢复会话
- **WHEN** 已登录用户刷新页面或再次进入聊天页
- **THEN** 历史消息按序渲染（用户与 AI 气泡角色正确），滚动到底部

### Requirement: 限流倒计时 UX
当聊天接口返回 429 时，前端 MUST 展示剩余等待秒数提示，并禁用发送按钮直至倒计时结束；倒计时结束后自动恢复可发送。

#### Scenario: 触发限流
- **WHEN** 用户 1 分钟内第 6 次提问收到 429
- **THEN** 界面提示「提问过于频繁，请等待 N 秒」，发送按钮禁用并倒计时

#### Scenario: 恢复
- **WHEN** 倒计时归零
- **THEN** 发送按钮恢复可用，可再次提问

### Requirement: 动态称呼与人格化文案
聊天页的称呼 MUST 取自首页配置（`GET /api/public/home-page` 的 `siteName`）：欢迎态标题（如「你好，我是{siteName}」）、输入框 placeholder、欢迎描述动态引用该名称。欢迎文案与快捷问题 MUST 更新为慕士塔格猫人格向（围绕登山经历、inkheap 项目、数字生命本身），移除「数字林深」占位文案与模拟回复规则数据。

#### Scenario: 称呼随配置变化
- **WHEN** 管理员修改首页 siteName
- **THEN** 聊天页刷新后欢迎态与 placeholder 使用新名称

#### Scenario: 人格化快捷问题
- **WHEN** 未登录用户首次进入聊天页
- **THEN** 欢迎态展示人格化快捷问题（如登山故事、inkheap 项目），点击即作为消息发送（未登录则先弹登录卡片）

### Requirement: 登录态展示与退出
已登录时，聊天页输入区 MUST 展示当前用户昵称与「退出」入口；退出后清除本地用户登录态并回到欢迎态（历史不再展示）。

#### Scenario: 退出登录
- **WHEN** 用户点击退出
- **THEN** 清除 dl_user_token/dl_user，页面回到欢迎态
