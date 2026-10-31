# email-sending 规格

## ADDED Requirements

### Requirement: SMTP 邮件发送基础设施
系统 SHALL 引入 nodemailer 并通过环境变量配置 SMTP（`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`），提供统一的邮件发送服务；SMTP 配置缺失时相关邮件接口 SHALL 返回明确的服务不可用错误（fail-fast，不静默吞掉）。

#### Scenario: 发送邮件成功
- **WHEN** 业务调用邮件服务且 SMTP 配置有效
- **THEN** 邮件通过 SMTP 发出，接口返回成功

#### Scenario: SMTP 未配置
- **WHEN** SMTP 环境变量缺失时调用依赖邮件的接口（注册验证码/找回密码）
- **THEN** 接口返回服务端错误并提示邮件服务未配置，不产生半成功状态（如验证码已记为已发送）

#### Scenario: SMTP 发送失败
- **WHEN** SMTP 服务器拒绝或网络失败
- **THEN** 接口返回错误信息，前端提示发送失败请稍后再试

### Requirement: 邮件模板
系统 SHALL 提供固定模板的邮件：注册验证码邮件（含 6 位验证码、5 分钟有效期说明、站点署名）与密码找回邮件（含明文密码、站点署名）；模板内容 SHALL NOT 包含任何用户可控的动态字段（防邮件注入）。

#### Scenario: 注册验证码邮件
- **WHEN** 用户请求注册验证码
- **THEN** 收到的邮件包含 6 位验证码、有效期说明与站点署名

#### Scenario: 密码找回邮件
- **WHEN** 用户通过已注册邮箱找回密码
- **THEN** 收到的邮件包含该账号的明文密码与站点署名

### Requirement: 环境变量部署透传
`docker-compose.yml` 及部署文档 SHALL 透传新增的 SMTP 环境变量；`APP_ENCRYPTION_KEY`（密码加密依赖）MUST 与数字生命模块共用同一配置。

#### Scenario: Docker 部署后邮件可用
- **WHEN** 按部署文档配置 SMTP 环境变量并重启容器
- **THEN** 注册验证码与密码找回邮件可正常发送
