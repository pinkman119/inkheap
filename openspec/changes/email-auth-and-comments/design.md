# 设计：邮箱登录与评论系统

## Context

- 前端 Vue3（hash 路由，dev 5173 / 生产同源 Nginx 反代），后端 NestJS + Prisma + PostgreSQL，全局前缀 `/api`，CORS 已开 `credentials: true`。
- 现有访客身份：`WechatUser`（openid）+ `POST /api/public/wechat/mock-login` 签发 `role: "user"` JWT（`user-jwt` 策略），前端存 localStorage（`dl_user_token`）。真实微信登录因备案无法接入，mock 登录将被移除。
- `ChatMessage.userId` 是裸字符串无外键；`UserJwtStrategy.validate` 目前查 `wechat_users` 表。
- 数据库已有 `targetType/targetId` 多态先例（`ContentView`：`article` | `note`），评论表沿用该口径。
- 已有可逆加密工具 `digitallife/crypto.util.ts`（AES-256-GCM，密钥 `APP_ENCRYPTION_KEY`），用于 API Key 加密；本次复用于密码加密。
- 后端无任何邮件设施；`ContactMessage` 仅落库。
- 后台管理页统一挂在 `/admin/*`（`layout-admin` + `auth: true` + `JwtAuthGuard`）。

## Goals / Non-Goals

**Goals:**

- 邮箱注册（含 6 位验证码验证邮箱真实性）、邮箱 + 密码登录、登出、忘记密码（明文密码邮件找回）
- 登录态维持 14 天：JWT 存 httpOnly cookie（无状态，无 session 表）
- 评论：知识库文章 + 小记详情页，一层盖楼，无点赞
- 后台评论管理：来源标注 + 一键跳转 + 删除（顶层连带回复）
- 移除微信 mock 登录（表保留、入口下线）

**Non-Goals:**

- 不做真实微信登录、不做 OAuth 第三方登录
- 不做用户自删评论、评论编辑、点赞、通知（邮件/站内信）
- 不做管理员回复置顶、评论审核流（先发后审）
- 不迁移/清理 `wechat_users` 表与历史 `ChatMessage`（mock 用户的聊天历史随账号体系下线而不可再访问，接受）
- 不做密码修改功能（找回即重发原密码，无修改入口）——如需可后续加

## Decisions

### D1. 密码可逆加密存储（AES-256-GCM），而非 bcrypt

**决策**：`EmailUser.password` 存 `encryptSecret()` 密文，登录时 `decryptSecret()` 后比对；找回密码时解密明文发邮件。

**理由**：需求明确要求"把密码明文发到邮箱"，必须可逆。复用现有 `crypto.util.ts`（与 API Key 同一密钥派生体系），密钥泄露面与现有 DlModel.apiKeyEnc 一致。

**备选**：bcrypt 单向哈希 + 重置链接（行业标准，但不符合产品诉求）；明文存库（拒绝，拖库即泄露）。

### D2. 独立新表 `EmailUser`，不统一用户表

**决策**：新增 `email_users` 表（email 唯一、password 密文、nickname、homepageUrl、status、lastLoginAt 等），不动 `wechat_users`。

**理由**：改动面最小。`UserJwtStrategy.validate` 改为查 `email_users`（payload.role 仍为 `"user"`）。mock 登录下线后旧 wechat token 自然失效（validate 查不到对应用户 → 401），无需迁移。

**备选**：统一 `users` 表 + provider 字段（更干净但需要迁移 wechat 数据，当前无收益）。

### D3. 登录态：JWT 塞 httpOnly cookie（14 天），guard 双通道取 token

**决策**：

- 登录/注册成功后 `res.cookie('user_token', jwt, { httpOnly: true, sameSite: 'lax', maxAge: 14d, path: '/' })`（生产可加 `secure`，由环境决定）。
- JWT payload：`{ sub: userId, role: "user" }`，expiresIn `14d`（与 cookie maxAge 对齐）。
- `UserJwtAuthGuard` / 策略取 token：优先 `req.cookies.user_token`，回退 `Authorization: Bearer`（迁移期兼容，回退通道可长期保留）。
- 登出：后端 `res.clearCookie('user_token')`（JWT 无状态，不做黑名单）。
- `main.ts` 挂 `cookie-parser`。

**备选**：express-session + sessions 表（可主动踢人，但引入状态与新表，与现有 JWT 体系割裂，14 天自动续期诉求无感）。

**注意**：前端 fetch 需带 cookie——生产同源自动携带；dev 跨端口场景现有 CORS `credentials: true` 已就绪，前端请求需补 `credentials: 'include'`。

### D4. 注册验证码：内存限时存储（单实例部署）

**决策**：6 位数字验证码，5 分钟有效，存服务端内存 Map（`email -> { code, expiresAt, sentAt }`），同邮箱 60s 内不可重发；注册提交时校验。验证通过即建号。

**理由**：单实例 Docker 部署，无需 Redis。重启丢失验证码可接受（用户重新获取）。

**备选**：验证码落库（增加表与清理逻辑，收益低）。

### D5. 找回密码：解密明文直发 + 限流

**决策**：`POST /api/public/auth/forgot-password`，查 `email_users`：存在 → 解密密码 → nodemailer 发送；不存在 → 400「当前邮箱未注册，请进行注册」。限流：同邮箱 60s 一次、同 IP 每小时上限（复用/仿照 `RateLimitService` 的内存桶思路）。

**已知权衡**：未注册提示存在邮箱枚举风险（产品明确要求此提示，接受）。

### D6. 评论一层盖楼的数据结构

**决策**：`Comment` 表字段：`targetType`（`article` | `note`，与 ContentView 口径一致）、`targetId`、`userId`（email_users.id）、`content`、`parentId`（null = 顶层；非 null 必须指向同 target 下的顶层评论）、`replyToUserId`（被回复人 id，仅用于显示「回复 @昵称」，冗余存储避免读取时多查）。

**约束**：后端 DTO 校验——`parentId` 非空时，其指向的评论必须 `parentId == null`（即只能是顶层），否则 400。前端对二层评论不再显示「回复」入口（三层无路径）。查询：先分页查顶层（按 createdAt 倒序），再批量查这些顶层下的回复（正序），内存组装两层结构。

**备选**：`replyToId` 通用引用 + 递归（不需要，层深固定为 2）。

### D7. 后台评论管理：列表 + 跳转 + 删除

**决策**：`GET /api/admin/comments`（分页、按 targetType 筛选），联查展示：内容、来源标签（知识库/小记）、来源标题、评论人昵称 + 邮箱、层级（顶层/回复）、时间。来源标题解析：`targetType=article` 查 `articles`（取 slug + title），`note` 查 `blogs`（取 slug + title），内存合并（分页量级小，无需 SQL join——Prisma 对多态无原生 join）。跳转：前端 `#/articles/:slug` / `#/xiaoji/:slug`。删除：`DELETE /api/admin/comments/:id`，若为顶层则连带删除 `parentId = id` 的全部回复（事务）。

### D8. 前端登录弹窗为全局组件

**决策**：新增 `AuthModal.vue`（注册 / 登录 / 忘记密码三视图切换），通过 composable（如 `useAuthModal`）全局控制显隐。三处消费：数字生命页（替换原 login-card）、文章详情、小记详情（点击评论框未登录时弹出）。`useUserAuth` 重写：移除 `mockLogin`/localStorage，改为 `GET /api/user/auth/me` 探测登录态（mounted 时 + 401 时清空）。

## Risks / Trade-offs

- [可逆加密密码，密钥泄露 = 全量密码泄露] → 密钥仅存在于服务端环境变量（与 API Key 同等保护级别）；文档标注此为产品明确选择
- [找回接口被用于邮件轰炸任意邮箱] → 同邮箱 60s + 同 IP 每小时限流；邮件内容固定模板无用户可控字段
- [邮箱枚举] → 产品明确要求未注册提示，接受并记录
- [删除 mock 登录后，老访客的聊天历史无法访问] → 接受（mock 本就是过渡方案）；`wechat_users`/`chat_messages` 数据保留不删
- [内存限流/验证码在多实例部署下失效] → 当前单实例 Docker 部署，成立；若未来横向扩容需换 Redis（记录为已知约束）
- [httpOnly cookie 导致前端无法主动感知过期] → 统一由 401 响应触发弹登录 + 调 `me` 探测兜底
- [评论无审核可能涌入垃圾信息] → 后台管理页支持删除；评论发表接口加基础频率限制（每用户每分钟 N 条）

## Migration Plan

1. 后端先行：新增表（prisma migrate）+ 新模块 + guard 改造（cookie 优先/Bearer 回退，**兼容期**）→ 部署后旧 mock token 仍可用（validate 还查 wechat_users？**否**——见下）
   - 注意：`UserJwtStrategy.validate` 切到 `email_users` 后，存量 mock token 立即 401。为平滑起见，validate 可先双表探测一个版本（wechat 命中给只读身份），但既然 mock 入口同步下线且用户量极小，直接切换并接受旧会话失效，更简单。
2. 前端发布：新登录弹窗 + 评论区 + 后台管理页 + 移除 mockLogin 调用。
3. 回滚：整体 git revert；新表对旧代码无影响（不动现有表结构），`user-jwt.strategy` 回退即恢复 mock 登录。
4. 环境变量（docker-compose.yml + .env）：新增 `SMTP_HOST/PORT/USER/PASS/FROM`；确认 `APP_ENCRYPTION_KEY` 已配置（数字生命模块已要求，应已存在）。

## Open Questions

（无——关键决策已在探索阶段与站主确认：密码方案 B、cookie 路线、独立表、一层盖楼、后台管理、6 位注册验证码、密码 ≥6 位、用户不可自删评论。）
