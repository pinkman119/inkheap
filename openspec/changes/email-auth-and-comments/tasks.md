# 任务清单：邮箱登录与评论系统

## 1. 数据模型与基础设施

- [ ] 1.1 `prisma/schema.prisma` 新增 `EmailUser` 表（id、email unique、password 密文、nickname、homepageUrl?、status、lastLoginAt、createdAt、updatedAt）与 `Comment` 表（id、targetType、targetId、userId、content、parentId?、replyToUserId?、createdAt；索引 `[targetType, targetId, createdAt]` 与 `[parentId]`），执行 `prisma migrate dev` 生成迁移
- [x] 1.2 后端安装依赖 `nodemailer`、`cookie-parser`；`main.ts` 挂载 cookie-parser 中间件
- [x] 1.3 新建 `src/config` 读取 SMTP 环境变量（SMTP_HOST/PORT/USER/PASS/FROM）；`docker-compose.yml` 与 `.env.example`/部署文档补充透传
- [x] 1.4 新建 `MailService`（nodemailer transporter + 固定模板：注册验证码邮件、密码找回邮件；SMTP 缺失时 fail-fast 抛错），挂在新的共享模块中

## 2. 邮箱认证后端（模块 email-auth）

- [x] 2.1 新建 `email-auth` 模块骨架（module / controller / service / dto），路由前缀 `public/auth`（注册、验证码、找回密码）与 `user/auth`（me、登出）
- [x] 2.2 实现注册验证码：`POST /api/public/auth/send-code`——校验邮箱未注册、60s 重发限制、生成 6 位验证码存内存 Map（5 分钟有效）、调用 MailService 发送
- [x] 2.3 实现注册：`POST /api/public/auth/register`——DTO 校验（邮箱格式、密码 ≥6 位、昵称非空、主站可选 URL）、验证码校验、密码 AES-256-GCM 加密落库、签发 JWT 并设置 `user_token` httpOnly cookie（SameSite=Lax，maxAge 14 天）
- [x] 2.4 实现登录：`POST /api/public/auth/login`——解密比对密码、更新 lastLoginAt、签发 14 天 JWT cookie
- [x] 2.5 实现 `GET /api/user/auth/me` 与 `POST /api/user/auth/logout`（clearCookie）
- [x] 2.6 实现找回密码：`POST /api/public/auth/forgot-password`——邮箱存在则解密明文发邮件；不存在返回「当前邮箱未注册，请进行注册」；限流（同邮箱 60s、同 IP 每小时上限，内存桶）

## 3. 访客鉴权改造与 mock 登录下线

- [x] 3.1 `user-jwt.strategy.ts`：validate 改查 `email_users`（保留 role='user' 语义）；token 提取改为 cookie 优先、Bearer 回退
- [x] 3.2 移除 `digitallife/wechat.controller.ts` 的 mock-login 路由及 `wechat.service.ts` 中相关逻辑（wechat_users 表与数据保留），从 module 中清理注册项
- [x] 3.3 全局确认 `UserJwtAuthGuard` 保护的接口（数字生命聊天等）在新鉴权下工作正常

## 4. 评论后端（模块 comment / comment-admin）

- [x] 4.1 新建 `comment` 模块：`GET /api/public/comments?targetType=&targetId=&page=`——顶层分页倒序 + 回复批量正序组装（含评论人昵称，公开可读）
- [x] 4.2 `POST /api/user/comments`（UserJwtAuthGuard）：DTO 校验内容非空；校验 parentId 指向同 target 下的顶层评论（否则 400）；写入 parentId/replyToUserId；每用户频率限制
- [x] 4.3 新建 `comment-admin` 控制器 `admin/comments`（JwtAuthGuard）：`GET /api/admin/comments` 分页列表 + targetType 筛选，内存联查 articles/blogs 解析来源标题与 slug（已删除内容标记「已删除」）
- [x] 4.4 `DELETE /api/admin/comments/:id`：顶层评论事务内连带删除全部回复

## 5. 前端：登录态与登录弹窗

- [x] 5.1 重写 `composables/useUserAuth.js`：移除 mockLogin/localStorage 逻辑，改为 `me` 接口探测登录态（初始 + 401 兜底），提供 login/register/logout/forgotPassword 调用（fetch 带 `credentials: 'include'`）
- [x] 5.2 新建全局登录弹窗组件 `AuthModal.vue` + `useAuthModal` composable（注册/登录/忘记密码三视图切换，支持登录成功回调）
- [x] 5.3 数字生命页 `DigitalLifeView.vue`：移除 mock 登录卡片，未登录发送消息时弹出 AuthModal，登录成功后自动继续发送（pendingMessage 逻辑保留）
- [x] 5.4 清理前端残留的微信 mock 登录引用（`dl_openid`、data/digitalLife 的 loginCard 文案按需更新）

## 6. 前端：评论区

- [x] 6.1 新建 `CommentSection.vue` 组件：加载/分页评论、发表顶层评论、一层盖楼展示（回复带「回复 @昵称」）、二层评论不显示回复入口、未登录时弹 AuthModal（草稿保留、登录后自动提交）、空状态文案
- [x] 6.2 `ArticleDetailView.vue` 文末接入 CommentSection（targetType=article，targetId=文章 id）
- [x] 6.3 `NoteDetailView.vue` 文末接入 CommentSection（targetType=note，targetId=小记 id）

## 7. 前端：后台评论管理

- [x] 7.1 新建 `views/admin/CommentManageView.vue`：分页列表（内容、来源标签、来源标题、评论人昵称/邮箱、层级、时间）、按来源筛选、删除确认（提示顶层删除连带回复）
- [x] 7.2 `router/index.js` 注册 `/admin/comments` 路由（auth: true），后台侧边栏/导航加入「评论管理」入口；来源标题点击新窗口打开 `#/articles/:slug` 或 `#/xiaoji/:slug`，已删除内容置灰不可点

## 8. 验证与收尾

- [x] 8.1 端到端自测：注册（验证码）→ 登录 → 14 天 cookie 生效 → 登出 → 找回密码（已注册/未注册两分支）→ 旧 mock token 401
- [x] 8.2 评论链路自测：未登录浏览/拦截弹窗/登录续发、一层盖楼（含对回复的回复同层展示）、三层拒绝（直接调接口 400）、频率限制
- [x] 8.3 后台自测：列表/筛选/跳转（含已删除来源）、删除回复、删除顶层连带回复
- [x] 8.4 SMTP 未配置时的 fail-fast 行为验证；docker-compose 环境变量透传核对；更新部署文档
