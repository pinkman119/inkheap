# 邮箱登录与评论系统

## Why

站点目前前台访客只有数字生命聊天使用的微信 mock 一键登录（真实微信登录因备案原因无法接入），访客没有稳定的身份体系；同时知识库文章和小记完全没有互动能力。需要一套基于邮箱的注册/登录/找回密码体系，并以登录态为基础开放评论功能，让访客可以在知识库文章和小记下留言互动。

## What Changes

- 新增邮箱注册流程：填写邮箱、密码、昵称、主站（可选），注册时需通过 6 位邮箱验证码验证邮箱真实性
- 新增邮箱 + 密码登录，登录态以 httpOnly cookie 中的 JWT 维持 14 天
- 新增忘记密码流程：填写邮箱，若已注册则将密码（AES-256-GCM 解密后明文）发送到该邮箱，未注册则提示"当前邮箱未注册，请进行注册"
- **BREAKING** 移除微信 mock 登录（`POST /api/public/wechat/mock-login`）及前端 `useUserAuth` 中的 mockLogin 逻辑，数字生命聊天页登录入口改为邮箱登录
- 新增评论功能：知识库文章详情页与小记详情页文末可评论，支持一层盖楼回复（A 回复顶层 B，C 回复 A 时 C 仍与 A 同层），不支持点赞，用户不可删除自己的评论
- 新增后台评论管理页面：展示评论内容、来源（知识库/小记）、来源标题（可一键跳转对应前台页）、评论人昵称与邮箱、层级、时间，支持删除（删除顶层评论连带删除其下所有回复）

## Capabilities

### New Capabilities

- `email-auth`: 邮箱账号体系——注册（含 6 位邮箱验证码验证）、登录（14 天 httpOnly cookie JWT）、登出、找回密码（明文密码邮件发送）、访客鉴权改造（cookie 优先、Bearer 回退）
- `comments`: 前台评论——知识库/小记详情页的一层盖楼评论展示与发表，未登录评论时弹登录
- `comment-admin`: 后台评论管理——评论列表（含来源标注与跳转）、删除（顶层连带回复）
- `email-sending`: 邮件发送基础设施——nodemailer + SMTP 配置，供验证码与密码找回邮件使用

### Modified Capabilities

（无——现有 specs 均为文章/分类/简历相关，本次不改动其需求）

## Impact

- **后端**：
  - `prisma/schema.prisma`：新增 `EmailUser`、`Comment` 两张表（Comment 沿用 ContentView 的 `targetType/targetId` 多态口径）
  - 新模块：`email-auth`（注册/验证码/登录/登出/忘记密码/me）、`comment`（前台）、`comment-admin`（后台管理）
  - `auth/user-jwt.strategy.ts`：validate 改为查 `email_users`；guard 取 token 改为 cookie 优先、`Authorization: Bearer` 回退
  - **移除** `digitallife/wechat.controller.ts` 的 mock-login 路由与 `wechat.service.ts` 相关逻辑（wechat_users 表保留不迁移，仅停用入口）
  - `main.ts`：无 session 中间件需求（纯 JWT cookie，无状态），需确认 cookie 解析（可从 req.cookies 读取，需 cookie-parser）
  - 新增依赖：`nodemailer`、`cookie-parser`
  - 环境变量：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`；复用 `APP_ENCRYPTION_KEY` 加密密码；docker-compose.yml 透传
- **前端**：
  - 新增全局登录弹窗组件（注册/登录/忘记密码三视图），数字生命页、文章详情、小记详情三处复用
  - `useUserAuth` 重写：移除 mockLogin，登录态改为依赖 cookie，401 时弹登录
  - `ArticleDetailView.vue`、`NoteDetailView.vue` 文末接入评论区组件
  - 新增后台 `CommentManageView.vue` + 路由 + 侧边栏入口
- **安全权衡（已确认）**：密码采用 AES-256-GCM 可逆加密存储（复用 `digitallife/crypto.util.ts`）而非单向哈希，以支持"找回密码时邮件发送明文密码"；找回接口做限流（同邮箱 60s 一次、同 IP 每小时上限）防邮件轰炸；找回接口对未注册邮箱明确提示（存在邮箱枚举风险，已知悉接受）
