# digital-life-user-auth Specification

## ADDED Requirements

### Requirement: 微信用户数据模型
系统 MUST 提供访客用户存储模型 `WechatUser`（表 `wechat_users`），字段至少包含：id（UUID）、openid（唯一）、nickname、avatar（可空）、创建/更新时间。数字生命的聊天记录 MUST 通过 userId 关联该表。

#### Scenario: Mock 用户入库
- **WHEN** Mock 登录创建新用户
- **THEN** `wechat_users` 新增一条记录，openid 形如 `mock-<随机串>`，昵称非空

#### Scenario: openid 唯一约束
- **WHEN** 尝试写入已存在的 openid
- **THEN** 数据库拒绝重复插入（唯一约束生效），登录逻辑复用既有用户

### Requirement: Mock 微信登录接口
系统 MUST 提供 `POST /api/public/wechat/mock-login`（无需鉴权），受环境变量 `WECHAT_MOCK` 控制：

- `WECHAT_MOCK=false`：返回 403 与可读提示（模拟登录未开启）
- `WECHAT_MOCK=true`：body 可选 `{ openid }`；携带 openid 时 upsert 复用该用户（保持身份与聊天历史延续），未携带时创建新 mock 用户；返回 `{ accessToken, user: { id, nickname, avatar } }`

签发的 JWT MUST 使用与管理员相同的 secret，payload 为 `{ sub: <wechatUserId>, role: "user" }`。

#### Scenario: 首次模拟登录
- **WHEN** 访客不带 openid 调用 mock-login 且开关开启
- **THEN** 返回 200 与新用户的 accessToken 及信息，用户可凭该 token 使用数字生命聊天

#### Scenario: 携带 openid 复用身份
- **WHEN** 前端携带上次登录返回用户的 openid 再次调用
- **THEN** 返回同一用户（id 不变）的新 token，其历史聊天记录保留

#### Scenario: 开关关闭
- **WHEN** `WECHAT_MOCK=false` 时调用 mock-login
- **THEN** 返回 403，不产生任何用户或 token

### Requirement: 用户与管理员 JWT 角色隔离
系统 MUST 保证两类 JWT 互不越权：管理员 JWT（role=admin，查 `admin_users`）只能访问 `admin/*` 接口；用户 JWT（role=user，查 `wechat_users`）只能访问用户侧接口（聊天、历史等）。交叉访问 MUST 返回 401。现有管理员鉴权行为 MUST 保持不变（向后兼容）。

#### Scenario: 用户 token 访问管理接口
- **WHEN** 携带 role=user 的 token 请求任意 `/api/admin/*` 接口
- **THEN** 返回 401，无任何管理数据泄露

#### Scenario: 管理员 token 访问聊天接口
- **WHEN** 携带 admin token 请求 `POST /api/user/digital-life/chat`
- **THEN** 返回 401

#### Scenario: 现有后台不受影响
- **WHEN** 管理员使用既有 token 访问现有 admin 接口
- **THEN** 行为与变更前一致（无鉴权回归）

### Requirement: 真实微信登录接入预留
系统 MUST 为真实微信扫码登录预留接入点：登录响应结构（`{ accessToken, user }`）、JWT 形态、前端 token 存取逻辑在 mock 与真实模式间保持一致；后续仅需新增 code 换 openid 的登录端点并切换前端调用的接口地址，前端交互与后端鉴权体系无需重构。

#### Scenario: 预留形态一致
- **WHEN** 未来接入真实微信登录（备案完成后）
- **THEN** 用户 token 的签发、校验、聊天链路与 mock 模式完全复用，仅登录入口不同
