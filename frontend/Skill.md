---
name: AutoReq
version: 1.0.0
description: 基于 Node.js autocannon 的服务器性能基准测试 Skill
author: Pinkman119
dependencies:
  - Node.js
  - autocannon
trigger: manual
tags:
  - benchmark
  - autocannon
  - performance
  - stress-test
---

# AutoReq

> 基于 Node.js autocannon 的服务器性能基准测试 Skill

---

## 前置条件

### 1. autocannon 安装检测

在**首次使用**该 Skill 时，必须执行以下流程：

1. 检测用户系统是否已全局安装 `autocannon`：
   ```bash
   npm list -g autocannon
   ```
2. 若未安装，则执行全局安装：
   ```bash
   npm install -g autocannon
   ```
3. 安装完成或确认已安装后，将安装状态记录到当前会话上下文中（标记 `autocannon_installed: true`），后续不再重复检测与询问。

### 2. 登录凭证配置

在**首次使用**该 Skill 时，必须向用户确认当前系统的登录认证方式：

询问用户：**当前系统使用的登录凭证类型是什么？**

| 选项 | 说明 | 构造方式 |
|------|------|----------|
| JWT | 基于 Token 的认证 | `-H "Authorization: Bearer <token>"` |
| Cookie | 基于 Cookie 的认证 | `-H "Cookie: <name>=<value>"` |
| 无需登录 | 公开接口，无需认证 | 不构造 `-H` 参数 |

- 若用户选择 JWT 或 Cookie，需进一步询问凭证的**名**和**值**，并构造对应的请求头字符串 `${header}`。
- 在当前 Skill 会话上下文中缓存该凭证信息（标记 `auth_type` 与 `auth_header`），后续不再询问，**除非用户主动要求调整登录凭证**。

---

## 功能模式

### 模式一：纯净模式

> 关注单接口单次请求的平均响应时间，主要作为接口优化前后效果对比依据。

**步骤：**

1. 询问用户接口方法（`${method}`）及接口 URL（`${url}`）；
2. 询问用户是否需要传入 body（`${body}`），如不需要则不构造 `-b` 参数；
3. 构造并执行 autocannon 指令：
   ```bash
   autocannon -m ${method} -c 1 -p 1 -d 30 -l -H ${header} ${url} --renderStatusCodes
   ```
   > 若用户无需携带 body，则不添加 `-b` 参数；若需要，则追加 `-b '${body}'`。
   > 若用户无需登录凭证，则不添加 `-H` 参数。
4. 根据指令返回结果，按照 [报告格式约束](#报告格式约束) 输出 Markdown 结果报告。

---

### 模式二：压测模式

> 关注并发条件下单接口的各项指标，主要作为高并发优化前后效果对比依据。

**步骤：**

1. 询问用户接口方法（`${method}`）及接口 URL（`${url}`）；
2. 询问用户是否需要传入 body（`${body}`），如不需要则不构造 `-b` 参数；
3. 询问用户预期并发连接数（`${connect}`）与每连接请求次数（`${pipelining}`）；
4. 构造并执行 autocannon 指令：
   ```bash
   autocannon -m ${method} -c ${connect} -p ${pipelining} -d 30 -l -H ${header} ${url} --renderStatusCodes
   ```
   > 若用户无需携带 body，则不添加 `-b` 参数；若需要，则追加 `-b '${body}'`。
   > 若用户无需登录凭证，则不添加 `-H` 参数。
5. 根据指令返回结果，按照 [报告格式约束](#报告格式约束) 输出 Markdown 结果报告。

---

### 模式三：自定义模式

> 根据用户自定义的压测需求生成对应的 autocannon 指令，执行并对结果进行分析。

**步骤：**

1. 询问用户的压测需求描述；
2. 根据需求生成对应的 autocannon 指令，并列出各参数的详细解释供用户确认：
   | 参数 | 说明 |
   |------|------|
   | `-m` | HTTP 请求方法（GET/POST/PUT/DELETE 等） |
   | `-c` | 并发连接数 |
   | `-p` | 每个连接的请求数量（pipelining） |
   | `-d` | 测试持续时间（秒） |
   | `-l` | 输出延迟百分位数信息 |
   | `-H` | 自定义请求头 |
   | `-b` | 请求体（JSON 字符串） |
   | `--renderStatusCodes` | 输出状态码分布 |
   | `--renderLatencyTable` | 输出延迟分布表 |
   | `-n` | 总请求数量 |
   | `-t` | 单请求超时时间（秒） |
   | `--onPort` | 在随机端口启动 HTTP 服务 |
3. 用户可对生成的指令进行调整；若无需调整则确认执行；
4. 根据指令返回结果，按照 [报告格式约束](#报告格式约束) 输出 Markdown 结果报告。

---

## 报告格式约束

> 所有模式执行完成后，均按以下 Markdown 格式生成结果报告文件。

### 1 测试概况

```markdown
# 1 测试概况
+ 指令：`autocannon -m ${method} -c 1 -p 1 -d 30 -l -H ${header} ${url} --renderStatusCodes`
+ URL：`${url}`
+ 方法：`${method}`
+ 并发连接数：1（取 `-c` 参数）
+ 每个连接请求数量：1（取 `-p` 参数）
+ 持续时间：30s（取 `-d` 参数）
+ 请求头：`${header}`（取 `-H` 参数，无则标注"无"）
+ Body 参数：`${body}`（取 `-b` 参数，无则标注"无"）
+ 延迟百分位：启用（取 `-l` 标志）
+ 状态码分布：启用（取 `--renderStatusCodes` 标志）
```

### 2 延迟响应时间

```markdown
# 2 延迟响应时间

| **Px** | 2.5% | 50% | 97.5% | 99% | 平均时间（Avg） | 标准差（Stdev） | 最大值（Max） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **时间** | xxms | xxms | xxms | xxms | xxms | xxms | xxms |
| **含义** | 2.5% 的请求在此时间内完成 | 50% 的请求在此时间内完成（中位数） | 97.5% 的请求在此时间内完成 | 99% 的请求在此时间内完成 | 所有请求的平均响应时间 | 响应时间的标准差，反映波动程度 | 单次请求最长响应时间 |
```

### 3 吞吐率

```markdown
# 3 吞吐率

| **Px** | 1% | 2.5% | 50% | 97.5% | 平均吞吐量（Avg） | 标准差（Stdev） | 最大值（Max） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **每秒请求数（req/s）** | xx | xx | xx | xx | xx | xx | xx |
| **含义** | 1% 时间的最低吞吐量 | 2.5% 时间的最低吞吐量 | 50% 时间的吞吐量（中位数） | 97.5% 时间的吞吐量 | 平均每秒处理请求数 | 吞吐量标准差，反映波动程度 | 峰值每秒请求数 |
```

### 4 请求状态

```markdown
# 4 请求状态

| HTTP 状态码 | 数量 | 状态码含义 |
| --- | --- | --- |
| 200 | xx | 请求成功，服务器正常返回 |
| 404 | xx | 请求的资源不存在 |
| 500 | xx | 服务器内部错误 |
| ... | ... | ... |
```

### 5 分析

```markdown
# 5 分析
+ **延迟响应时间**：从百分位分布来看，xx% 的请求在 xxms 内完成，平均响应时间为 xxms，标准差为 xxms，说明响应时间（稳定/波动较大）。P99 延迟为 xxms，（在/不在）可接受范围内。
+ **吞吐率**：平均吞吐量为 xx req/s，峰值可达 xx req/s，标准差为 xx，（表明服务端处理能力稳定/存在波动）。
+ **请求状态**：共发出 xx 次请求，其中 xx 返回 2xx 状态码，（无/有）异常状态码出现，（服务整体健康/需关注异常状态码）。
+ **总结**：（根据以上指标给出综合评估与优化建议）
```

---

## 会话状态管理

| 状态键 | 类型 | 说明 | 持久性 |
|--------|------|------|--------|
| `autocannon_installed` | boolean | autocannon 是否已安装 | 会话级 |
| `auth_type` | string | 登录凭证类型：JWT / Cookie / none | 会话级 |
| `auth_header` | string | 构造好的请求头字符串 | 会话级 |

> **会话级**：仅在当前 Skill 调用会话中有效，会话结束后清除。用户可随时主动重置。

---

## 参数速查表

| 参数 | 全称 | 默认值 | 说明 |
|------|------|--------|------|
| `-m` | `--method` | GET | HTTP 请求方法 |
| `-c` | `--connections` | 10 | 并发连接数 |
| `-p` | `--pipelining` | 1 | 每个连接的请求数量 |
| `-d` | `--duration` | 10 | 测试持续时间（秒） |
| `-l` | `--latency` | false | 输出延迟百分位数 |
| `-H` | `--header` | — | 自定义请求头 |
| `-b` | `--body` | — | 请求体 |
| `-n` | `--maxOverallRequests` | — | 总请求数量上限 |
| `-t` | `--timeout` | 10 | 单请求超时时间（秒） |
| `--renderStatusCodes` | — | false | 输出状态码分布 |
| `--renderLatencyTable` | — | false | 输出延迟分布表 |
| `--onPort` | — | false | 在随机端口启动 HTTP 服务 |
| `-j` | `--json` | false | 以 JSON 格式输出结果 |
