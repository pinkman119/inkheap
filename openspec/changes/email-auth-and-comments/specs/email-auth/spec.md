# email-auth 规格

## ADDED Requirements

### Requirement: 邮箱注册（含验证码验证）
系统 SHALL 提供邮箱注册功能：用户填写邮箱、密码（≥6 位）、昵称、主站链接（可选），系统向该邮箱发送 6 位数字验证码（5 分钟有效），用户提交验证码通过后才创建账号。同一邮箱 60 秒内 SHALL NOT 重复发送验证码。已注册的邮箱 SHALL NOT 再次注册。

#### Scenario: 发送注册验证码
- **WHEN** 用户在注册表单填写未注册邮箱并点击「获取验证码」
- **THEN** 系统向该邮箱发送 6 位数字验证码（5 分钟内有效），并提示验证码已发送

#### Scenario: 60 秒内重复获取验证码
- **WHEN** 同一邮箱在 60 秒内再次请求发送验证码
- **THEN** 系统拒绝发送并提示稍后再试

#### Scenario: 验证码正确，注册成功
- **WHEN** 用户提交的邮箱、密码（≥6 位）、昵称和验证码均有效，且验证码在有效期内
- **THEN** 系统创建 email_users 记录（密码以 AES-256-GCM 密文存储），自动登录并返回用户信息

#### Scenario: 验证码错误或过期
- **WHEN** 用户提交的验证码错误或已超过 5 分钟有效期
- **THEN** 系统拒绝注册并提示验证码错误或已过期

#### Scenario: 邮箱已被注册
- **WHEN** 用户使用已注册的邮箱请求验证码或提交注册
- **THEN** 系统提示该邮箱已注册

#### Scenario: 密码过短
- **WHEN** 用户提交的密码少于 6 位
- **THEN** 系统拒绝注册并提示密码至少 6 位

### Requirement: 邮箱密码登录
系统 SHALL 提供邮箱 + 密码登录：校验通过后签发 `role: "user"` 的 JWT（有效期 14 天），并通过 `user_token` httpOnly cookie（SameSite=Lax，maxAge 14 天）下发。

#### Scenario: 登录成功
- **WHEN** 用户提交正确的邮箱和密码
- **THEN** 系统设置 `user_token` httpOnly cookie 并返回用户信息（id、昵称、邮箱、主站），登录态维持 14 天

#### Scenario: 密码错误
- **WHEN** 用户提交的密码与存储密文解密后不一致
- **THEN** 系统返回「邮箱或密码错误」，不设置 cookie

#### Scenario: 邮箱未注册
- **WHEN** 用户使用未注册邮箱登录
- **THEN** 系统返回「邮箱或密码错误」（不区分提示，避免登录入口枚举）

### Requirement: 登出
系统 SHALL 提供登出接口：清除 `user_token` cookie。

#### Scenario: 登出
- **WHEN** 已登录用户调用登出接口
- **THEN** 系统清除 `user_token` cookie，前端登录态清空

### Requirement: 登录态探测（me）
系统 SHALL 提供 `me` 接口：根据 cookie 中的 JWT 返回当前用户信息；无效或缺失时返回 401。

#### Scenario: 有效 cookie 探测登录态
- **WHEN** 前端携带有效 `user_token` cookie 调用 me 接口
- **THEN** 系统返回当前用户信息

#### Scenario: cookie 缺失或 JWT 过期
- **WHEN** 前端未携带 cookie 或 JWT 已过期
- **THEN** 系统返回 401

### Requirement: 访客鉴权支持 cookie 与 Bearer 双通道
访客保护接口（`UserJwtAuthGuard`）SHALL 优先从 `req.cookies.user_token` 提取 JWT，回退到 `Authorization: Bearer` 头；`UserJwtStrategy` SHALL 改为查询 `email_users` 表验证用户存在。

#### Scenario: 通过 cookie 访问受保护接口
- **WHEN** 请求携带有效 `user_token` cookie（无 Authorization 头）访问数字生命聊天接口
- **THEN** 请求通过鉴权，以对应 email_users 用户身份执行

#### Scenario: 通过 Bearer 头访问受保护接口
- **WHEN** 请求携带有效 `Authorization: Bearer <jwt>` 访问受保护接口
- **THEN** 请求通过鉴权（迁移兼容通道）

#### Scenario: 旧微信 mock token 失效
- **WHEN** 携带历史微信 mock 登录签发的 JWT 访问受保护接口
- **THEN** 系统返回 401（策略已改查 email_users，mock 用户不可匹配）

### Requirement: 移除微信 mock 登录
系统 SHALL 移除 `POST /api/public/wechat/mock-login` 路由及前端 mockLogin 逻辑；`wechat_users` 表与历史 `chat_messages` 数据 SHALL 保留（仅下线入口，不迁移不删除）。

#### Scenario: 访问已移除的 mock 登录接口
- **WHEN** 客户端调用 `POST /api/public/wechat/mock-login`
- **THEN** 系统返回 404

#### Scenario: 数字生命页登录入口替换
- **WHEN** 未登录用户在数字生命聊天页发送消息
- **THEN** 弹出全局邮箱登录弹窗（注册/登录/忘记密码），登录成功后继续发送

### Requirement: 密码找回（明文密码邮件发送）
系统 SHALL 提供忘记密码接口：用户提交邮箱，若该邮箱已注册，系统将解密后的明文密码通过邮件发送至该邮箱；若未注册，返回「当前邮箱未注册，请进行注册」。

#### Scenario: 邮箱已注册，密码找回成功
- **WHEN** 用户提交已注册邮箱进行密码找回
- **THEN** 系统将该账号的明文密码发送至该邮箱，前端提示密码已发送

#### Scenario: 邮箱未注册
- **WHEN** 用户提交未注册邮箱进行密码找回
- **THEN** 系统返回「当前邮箱未注册，请进行注册」

#### Scenario: 找回接口限流
- **WHEN** 同一邮箱 60 秒内多次调用找回接口，或同一 IP 短时间内高频调用
- **THEN** 超出限流阈值的请求被拒绝（429），不发送邮件

### Requirement: 密码可逆加密存储
系统 SHALL 使用 AES-256-GCM（复用现有 crypto.util 与 `APP_ENCRYPTION_KEY`）加密存储 `email_users.password`，SHALL NOT 明文存库，也 SHALL NOT 使用单向哈希（需支持找回时还原明文）。

#### Scenario: 密码密文落库
- **WHEN** 用户注册成功
- **THEN** 数据库中该用户的 password 字段为 AES-256-GCM 密文（`iv.tag.ciphertext` 格式）

#### Scenario: 未配置加密密钥时拒绝服务
- **WHEN** 服务启动时 `APP_ENCRYPTION_KEY` 缺失或格式错误，且收到注册/登录/找回请求
- **THEN** 相关请求返回服务端错误（fail-fast），不降级为明文处理
