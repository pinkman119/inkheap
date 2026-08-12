import { ethBtcContent } from './eth-btc-content.js'

/**
 * 文章标题（独立字段），按 slug 索引。
 * 未来接入后端后替换为接口返回即可。
 */
export const articleTitles = {
  'mysql-connection-pool-tuning': 'MySQL 连接池调优：从 200ms 到 8ms 的实战',
  'mongodb-aggregation-performance': 'MongoDB 聚合管道性能分析与索引优化',
  'express-middleware-order': 'Express 中间件执行顺序的那些坑',
  'openspec-getting-started': 'openSpec 入门：用规格文件驱动 AI 编码',
  'llm-inference-kv-cache': '大模型推理优化实战：KV Cache 与批处理',
  'react-class-to-hooks': '从 Class 到 Hooks：一次 React 状态管理的迁移复盘',
  'go-generics-config-parser': '用 Go 泛型重写我们的配置解析库',
  'postgresql-partitioned-orders': 'PostgreSQL 分区表在我们的订单系统上的落地',
  'rust-hot-path-rewrite': '用 Rust 重写热点路径：一次值得的 30 倍提速',
  'strategy-pattern-billing': '策略模式在计费规则引擎中的实战应用',
  'rest-to-grpc': '从 REST 到 gRPC：内部服务通信的协议演进',
  'k8s-hpa-cost-cut': '我们如何用 K8s HPA 把成本砍掉 40%',
  'prometheus-alert-fatigue': 'Prometheus 告警疲劳治理：从 200 条到 12 条',
  'testing-pyramid-revisited': '让单测真正有用：我们团队的测试金字塔回归',
  'distributed-training-scaling': '从单机到 8 卡：一次大模型训练的效率爬坡',
  'negative-space-aesthetics': '留白不是空白：东方美学中的负空间',
  'user-feedback-to-decision': '从用户反馈到产品决策的距离',
  'designer-morning-ritual': '一个设计师的晨间仪式',
  'eth-btc-differences': '1 ETH和BTC区别',
}

/**
 * 文章正文内容（Markdown 源），按 slug 索引。
 *
 * 设计说明：
 * - 标题使用独立的 articleTitles 字段作为页面顶部大标题。
 * - markdown 中的 # h1 会作为文章根标题出现在 TOC 目录中，
 *   h2/h3/h4 自动被 TOC 扫描并生成四级嵌套目录。
 * - 未来接入后端时，只需把这里的对象替换成接口返回即可，
 *   ArticleDetailView 通过 slug 取正文，渲染逻辑无需改动。
 */

export const articleContent = {

  /* ===== NodeJS / 数据库 ===== */
  'mysql-connection-pool-tuning': `# MySQL 连接池调优：从 200ms 到 8ms 的实战

> 在高并发场景下，连接池配置直接决定接口延迟。本文记录我们在 NodeJS 服务中对 MySQL 连接池的调优过程，包括最大连接数、空闲回收与超时策略。

去年我们一个订单查询接口的 P99 延迟稳定在 200ms 以上，而实际 SQL 执行只要 3-5ms。排查之后发现，大量时间被花在了**等待获取连接**上。连接池默认配置完全不适合我们的并发量。

## 问题定位

用 \`mysql2\` 的 \`pool.getConnection()\` 加了耗时埋点之后，数据很直观：

| 指标 | 调优前 |
|------|--------|
| SQL 平均执行时间 | 4.2ms |
| 获取连接平均耗时 | 147ms |
| P99 获取连接耗时 | 621ms |
| 池中连接数峰值 | 10（默认上限） |

10 个连接面对每秒 200+ 请求，等待队列里排了长龙。

## 连接池核心参数

### max（最大连接数）

这是第一个要调的参数，但不能无脑设大——MySQL 服务端也有 \`max_connections\` 上限。

\`\`\`bash
# 先查 MySQL 服务端允许的最大连接数
mysql> SHOW VARIABLES LIKE 'max_connections';
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| max_connections | 200   |
+-----------------+-------+
\`\`\`

经验公式：

\`\`\`
pool.max = (核心业务 QPS × 平均 SQL 耗时) × 1.2
\`\`\`

### idleTimeoutMillis（空闲回收）

连接空闲多久后被释放。我们最初设了 10 分钟，导致低谷期白白占着连接。

> 调整为 30000（30 秒）后，低谷期连接数从 20 降到了 5 左右。

### acquireTimeoutMillis（获取超时）

排队等待获取连接的时限。超时后直接抛错，避免请求无限堆积。

### queueLimit（排队上限）

等待队列最大长度。设为 0 表示不限制，设为 N 则超出后立即报错。

## 调优过程

第一步，把 \`max\` 从 10 提到 50：

\`\`\`js
const pool = mysql2.createPool({
  host: 'localhost',
  user: 'app',
  database: 'orders',
  max: 50,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 10000,
  queueLimit: 0,
})
\`\`\`

第二步，观察 MySQL 侧连接状态：

\`\`\`sql
SELECT COUNT(*) AS connections FROM information_schema.processlist WHERE user = 'app';
-- 峰值 42，远在 200 上限内，安全
\`\`\`

第三步，压测验证：

| 指标 | 调优前 | 调优后 |
|------|--------|--------|
| P50 | 184ms | 6ms |
| P99 | 237ms | 8ms |
| P99 获取连接耗时 | 621ms | 2ms |

## 注意事项

- **不要设得比 MySQL \`max_connections\` 还大**——所有实例加起来不能超过服务端上限。
- 配合应用层缓存（Redis）进一步降低数据库连接需求。
- 接入 Grafana 监控连接池状态，设 \`pool._allConnections.length\` 告警。

\`\`\`js
// 简易监控端点
app.get('/health/pool', (req, res) => {
  res.json({
    active: pool._allConnections.length - pool._freeConnections.length,
    idle: pool._freeConnections.length,
    waiting: pool._connectionQueue.length,
  })
})
\`\`\`

## 小结

连接池调优不是"参数越大越好"，而是要根据实际并发量和 MySQL 侧资源做精细平衡。核心公式：池大小 = QPS × SQL 耗时 × 缓冲系数。

如果你团队也有"慢查询不慢、接口就是慢"的症状，不妨先看一眼连接获取耗时，很多时候问题不在 SQL 身上。
`,

  'mongodb-aggregation-performance': `# MongoDB 聚合管道性能分析与索引优化

> 聚合管道是 MongoDB 最强大的特性之一，但也是性能陷阱的重灾区。本文通过 explain 输出逐段剖析一个慢查询的优化路径。

我们有个统计看板，每次打开都要等 6-8 秒。追下去发现是一个 \`$lookup\` + \`$group\` 的聚合管道在背锅。

## 原始管道

\`\`\`js
db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2024-01-01") } } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  { $unwind: "$user" },
  { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "products" } },
  { $group: { _id: "$user.region", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  { $sort: { total: -1 } },
])
\`\`\`

## explain 诊断

\`\`\`js
db.orders.explain("executionStats").aggregate([...])
\`\`\`

关键发现：

1. **\`\$match\` 阶段走了 COLLSCAN**——\`createdAt\` 字段没有索引，扫描了 230 万行。
2. **两次 \`\$lookup\` 分别在 \`users\` 和 \`products\` 表重复全表扫描**。
3. 内存排序（\`\$sort\`）超出了 100MB 限制，触发磁盘临时文件。

## 优化步骤

### 第一步：加索引

\`\`\`js
db.orders.createIndex({ createdAt: -1, userId: 1 })
db.users.createIndex({ _id: 1, region: 1 })
db.products.createIndex({ _id: 1 })
\`\`\`

### 第二步：管道路由重排

将过滤越早越好，把 \`\$match\` 放到最前，并在 \`\$lookup\` 后用 \`\$unset\` 去掉不需要的字段减少文档体积。

### 第三步：用 \`\$lookup\` pipeline 替代简单写法

\`\`\`js
{
  $lookup: {
    from: "users",
    let: { uid: "$userId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
      { $project: { region: 1 } }  // 只取需要的字段
    ],
    as: "user"
  }
}
\`\`\`

### 第四步：允许磁盘使用

如果排序数据量不可避免，开启 \`allowDiskUse\`：

\`\`\`js
db.orders.aggregate(pipeline, { allowDiskUse: true })
\`\`\`

> 这不是性能优化，而是"允许它慢而不是爆内存"的兜底。

## 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 扫描文档数 | 230 万 | 18 万 |
| 执行时间 | 7200ms | 120ms |
| 内存占用 | 380MB | 42MB |

## 小结

聚合性能优化的核心思路就三条：

1. **让 \`\$match\` 最早命中索引**
2. **\`\$lookup\` 只取需要字段**
3. **尽可能在管道早期减少文档体积**
`,

  'express-middleware-order': `# Express 中间件执行顺序的那些坑

> 一个看似正确的中间件注册顺序，可能让你排查半天权限问题。本文梳理 Express 中间件栈的洋葱模型与常见误用。

最常见的一个 bug：权限校验放在了路由处理之后，结果根本没执行——路由直接返回了响应，后面的中间件被跳过。

## 洋葱模型

Express 的中间件按照注册顺序形成一个调用栈。每个 \`next()\` 对应一次"进入下一层"，回来后是"从下一层出来"。

\`\`\`
request  →  [logger] → [auth] → [route handler] →  response
         ←          ←        ←                   
\`\`\`

关键细节：**如果某个中间件返回了响应（res.send / res.json 等）但没有调 next()，后续中间件不会执行**。

## 最常见错误

### 错误的权限中间件位置

\`\`\`js
// ❌ 权限中间件在路由后面，完全不生效
app.get('/admin', (req, res) => { res.json({ ok: true }) })
app.use(authMiddleware)
\`\`\`

### 忘记 next()

\`\`\`js
// ❌ 日志中间件忘了 next()，请求卡死
app.use((req, res, next) => {
  console.log(req.method, req.url)
  // 漏了 next()!
})
\`\`\`

### 异步中间件不处理错误

\`\`\`js
// ❌ 异步错误不会自动传递给 Express 错误处理
app.use(async (req, res, next) => {
  const data = await fetchSomething() // 如果 reject，请求会挂起
  req.data = data
  next()
})

// ✅ 需要显式 catch
app.use(async (req, res, next) => {
  try {
    req.data = await fetchSomething()
    next()
  } catch (err) {
    next(err)
  }
})
\`\`\`

## 推荐的中间件顺序

\`\`\`
1. 通用中间件（helmet / cors / compression）
2. 日志 / 请求追踪（morgan / trace-id）
3. body 解析（express.json / express.urlencoded）
4. 静态文件（express.static）
5. 认证 / 鉴权（authMiddleware）
6. 业务路由（app.use('/api', apiRouter)）
7. 404 处理
8. 全局错误处理（err, req, res, next）
\`\`\`

## 错误处理中间件

Express 区分"普通中间件"和"错误处理中间件"的唯一方式就是**参数个数**——四个参数的才是错误处理器：

\`\`\`js
// 全局错误处理一定是最后注册的
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal Server Error' })
})
\`\`\`

## 小结

Express 中间件的心智模型就记住一个比喻：**剥洋葱**。请求从外往里走，响应从里往外回。顺序错了，洋葱就剥反了——外面那层永远碰不到里面。
`,

  /* ===== AI / 推理 ===== */
  'openspec-getting-started': `# openSpec 入门：用规格文件驱动 AI 编码

> 当 AI 编码助手开始接手真实项目，最大的问题不是"写不出代码"，而是"写出的代码你我都不认得"。openSpec 用一份人类可读的规格文件，把意图锁死在代码之前。

过去一年，几乎所有团队都试过用 AI 写代码。它能补齐样板、生成测试用例、解释报错——效率提升是真实的。但一旦离开"玩具项目"，进入有历史包袱、有隐式约定的代码库，AI 生成的内容就开始**漂移**：接口字段对不上、命名风格各一、边界条件被忽略。

问题不在模型不够强，而在于我们从未把"这一次要做什么、做成什么样"清楚地交代给模型。openSpec 想解决的，正是这道**意图断层**。

## 为什么需要规格文件

把需求写进一段 prompt，模型只能看到你当下敲进去的那几行。它不知道项目里已经存在 \`UserRepository\`，不知道你们约定用 \`snake_case\` 还是 \`camelCase\`，更不知道这个改动不能破坏上个月的支付回调。

> 规格文件不是为了"指挥"AI，而是为了给 AI 一个稳定、可复用的上下文契约——人读得懂，机器也读得懂。

一份好的规格，应该能被提交进 Git、被 Code Review、被 CI 校验。它和代码一样，是第一等公民。

## openSpec 的核心概念

openSpec 的设计极度克制，整个体系围绕三个对象展开。理解它们，就理解了 openSpec 的工作方式。

### 三个核心对象

理解 openSpec，先抓住它刻意保持精简的三元组。它们各司其职，又彼此衔接：

#### Spec（规格）

描述一个功能"要做什么"，是人类与模型之间的契约。它不关心语言、框架或实现细节，只回答"目标"与"边界"，是整条链路里最稳定、最该被反复推敲的一份文件。

#### Task（任务）

把 Spec 拆成可执行的步骤，每一步都能独立验证。Task 是规格落地的阶梯，让大模型可以小步前进、随时回滚，也让你清晰地看到"进度到哪了"。

#### Archive（归档）

已完成的 Spec 不会消失，而是沉淀为项目的"决策地图"。下次有人问"当年为什么这么设计"，答案就躺在归档里，而不是散落在某次聊天的上下文窗口中。

### 设计哲学

三个对象背后，是两条贯穿始终、且互相约束的设计原则：

#### 最小可用

一份 Spec 只要能说清"问题"和"验收标准"就够了。多余的措辞只会成为模型发挥时的噪音，也更容易在 Review 时掩盖真正的关键约束。

#### 人类可读

规格必须人读得懂，才会有人去 Review；有人 Review，它才配得上进入版本控制。可读性是它生命力的来源，也是它区别于"又一段提示词"的根本。

:::tip 小提示
不要把 Spec 写成实现细节。它回答"做什么"和"为什么"，实现留给 Task 和模型去填。
:::

一份最小可用的 Spec 长这样：

\`\`\`yaml
# specs/add-user-rate-limit/spec.md
description: 为公开 API 增加基于令牌桶的限流
why: 近期爬虫导致服务波动，需在不引入新依赖的前提下保护核心接口
acceptance:
  - 单 IP 默认上限 100 请求/分钟
  - 超限返回 429 与 Retry-After 头
  - 限流状态可从 /health 暴露
\`\`\`

## 从零开始一个规格

初始化一个项目只需要一行命令，它会创建 \`openspec/\` 目录与基础结构：

### 初始化项目

openSpec 对环境几乎零要求，几条命令即可在任意 Node 项目里落地，无需改造现有工程结构。

#### 安装

推荐以 \`npx\` 方式直接使用，避免污染全局依赖；如果团队使用频繁，也可以作为 \`devDependency\` 安装到项目里统一版本。

#### 目录结构

初始化后会在仓库根生成 \`openspec/\` 目录，其中 \`specs/\` 存放草稿与进行中的规格，\`archive/\` 存放已交付的规格，二者共同构成项目的决策历史。

### 打磨 Spec

生成只是起点，真正决定质量的是反复打磨的过程。下面这份清单能帮你把"能跑"的草稿，变成"敢进主干"的规格。

#### 检查清单

提交前，建议逐条核对以下内容，确认规格"说人话、可验证"：

\`\`\`bash
# 初始化
npx openspec init

# 基于自然语言需求生成一个 Spec 草稿
npx openspec propose "给公开 API 加上限流"
\`\`\`

生成后，建议按下面的顺序打磨它：

1. 读一遍 \`description\`，确认它说的是"问题"而非"方案"。
2. 检查 \`acceptance\` 是否可验证——每条都应能用一句话判断通过与否。
3. 把草稿提交到分支，发起一次普通的 Pull Request。

> 图：Spec → Task → 代码的单向流动，意图始终可追溯。

## 在 CI 中校验规格

规格的价值在于"活着"。把它接进 CI，每次提交都校验 Spec 与代码是否偏离：

\`\`\`yaml
# .github/workflows/openspec.yml
name: openspec
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx openspec validate
\`\`\`

当 CI 变红，说明有人改了代码却忘了同步 Spec——这恰恰是它最该发挥作用的时候。

## 小结

openSpec 不是另一个"魔法提示词"，而是一种**把上下文工程化的习惯**。它把"我们到底要什么"从飘忽的对话里拽出来，钉进版本控制系统。

如果你也受够了 AI 生成的代码"看着对、跑起来错"，不妨从下一个小功能开始，先写 Spec，再写代码。
`,

  'llm-inference-kv-cache': `# 大模型推理优化实战：KV Cache 与批处理

> 吞吐量和首字延迟往往是矛盾的，而 KV Cache 与连续批处理是化解矛盾的关键。本文记录一次线上推理服务的优化复盘。

我们的 LLM 推理 API 上线后遇到了典型的两难：要么单次请求很快但并发一高就崩，要么能扛高并发但每个用户等 5 秒才吐出第一个字。

## 什么是 KV Cache

Transformer 在自回归生成时，每个新 token 都需要对**所有历史 token** 做注意力计算。如果不缓存 K/V 矩阵，每生成一个 token 就要重算全部历史，复杂度 O(n²)。

KV Cache 的思路很简单：

> 每算出一个新 token，就把它的 Key/Value 矩阵存起来。下次只需要对新 token 做注意力的增量计算。

\`\`\`python
# 伪代码：有 KV Cache vs 无 KV Cache
# 无缓存：每步重新算 full attention
output = model(input_ids)  # O(n²)，每次都算全部

# 有缓存：只算当前 token 的注意力
past_kv = cache.get()
output = model(new_token, past_key_values=past_kv)  # O(n)
cache.update(output.kv)
\`\`\`

## 连续批处理（Continuous Batching）

传统静态批处理的问题：

- 必须等到 batch 里**所有**请求都生成完毕才返回
- 短的回复被长的拖后腿

连续批处理动态调整 batch：

\`\`\`
时刻 T1: [ReqA(生成了 3 个token), ReqB(刚提交)]
时刻 T2: [ReqA(生成了 4 个token), ReqB(生成了 1 个token)]  
时刻 T3: [ReqA 已完成，移除], [ReqB(生成了 2 个token), ReqC(刚提交)]
\`\`\`

### 实现要点

\`\`\`python
class ContinuousBatcher:
    def __init__(self):
        self.active_requests = []  # 当前正在处理的请求
    
    def step(self):
        # 1. 组装当前 batch 的输入
        inputs = self._prepare_inputs()
        
        # 2. 一次 forward 产生下一个 token
        outputs = model.generate(inputs, max_new_tokens=1)
        
        # 3. 检查哪些请求已完成，移除它们
        self.active_requests = [
            r for r in self.active_requests
            if not r.is_finished()
        ]
        
        # 4. 如果有空位，从等待队列补充新请求
        while len(self.active_requests) < self.max_batch_size:
            new_req = self.waiting_queue.pop()
            self.active_requests.append(new_req)
\`\`\`

## 优化结果

| 指标 | 优化前（静态 Batch） | 优化后（连续 Batch + KV Cache） |
|------|---------------------|-------------------------------|
| 单请求首字延迟 | 2.1s | 0.3s |
| 并发 50 时吞吐 | 120 tokens/s | 480 tokens/s |
| GPU 利用率 | 42% | 89% |
| P99 延迟 | 8.7s | 1.6s |

## 小结

KV Cache 消除冗余计算，连续批处理消除空闲等待。两者结合，是把一块 GPU 从"摸了半天"变成"忙得有价值"的关键。
`,

  /* ===== 前端 / 框架 ===== */
  'react-class-to-hooks': `# 从 Class 到 Hooks：一次 React 状态管理的迁移复盘

> Hooks 让组件逻辑复用变得优雅，但也带来闭包陷阱与依赖管理的隐性成本。本文复盘我们把一个中等规模应用从 Class 组件迁到函数组件的全过程。

迁移的初衷很简单：越来越多的第三方库只提供 Hooks 版本（Router v6、Redux Toolkit 等），我们的 Class 组件越来越像二等公民。

## 迁移策略

我们没有一步到位全部重写，而是按组件树的"叶子 → 根"方向逐步迁：

### 第一阶段：无状态组件

从纯展示组件开始，零风险：

\`\`\`jsx
// Before: Class
class UserAvatar extends React.Component {
  render() {
    return <img src={this.props.src} alt={this.props.name} />
  }
}

// After: Function
function UserAvatar({ src, name }) {
  return <img src={src} alt={name} />
}
\`\`\`

### 第二阶段：类生命周期 → Hooks

这是最容易出错的一步，尤其 \`componentDidMount\` → \`useEffect\` 的语义不完全等价：

\`\`\`jsx
// Before: Class
class UserProfile extends React.Component {
  state = { user: null, loading: true }
  
  componentDidMount() { this.fetchUser(this.props.id) }
  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id) this.fetchUser(this.props.id)
  }
  
  fetchUser = async (id) => {
    this.setState({ loading: true })
    const user = await api.getUser(id)
    this.setState({ user, loading: false })
  }
}

// After: Hooks
function UserProfile({ id }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getUser(id).then(u => { if (!cancelled) setUser(u) })
    return () => { cancelled = true }  // 竞态清理
  }, [id])
}
\`\`\`

## 踩过的坑

### 闭包陷阱

\`\`\`jsx
// ❌ 闭包捕获了旧的 count 值
function Counter() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000)
    return () => clearInterval(timer)
  }, [])  // 空依赖，count 永远是 0
}

// ✅ 用函数式更新
useEffect(() => {
  const timer = setInterval(() => setCount(c => c + 1), 1000)
  return () => clearInterval(timer)
}, [])
\`\`\`

### useCallback 滥用

不是每个函数都需要包 \`useCallback\`。它只在作为依赖传递给 \`useEffect\` 或子组件的 \`React.memo\` 时才有意义。

### 自定义 Hook 提取

迁移最大的收益来自这一步——我们把散落在 8 个组件的表单验证逻辑抽成了一个 \`useFormValidation\`。

## 小结

Hooks 的价值不在语法糖，而在**让逻辑得以跨组件复用**。迁移时从叶子组件开始、为异步操作加竞态取消、不用纠结于完全去掉 Class——它们可以共存。
`,

  /* ===== 后端 / 语言 ===== */
  'go-generics-config-parser': `# 用 Go 泛型重写我们的配置解析库

> Go 1.18 引入的泛型终于让我们告别了满屏的 reflect。本文记录配置库在引入泛型后的类型安全性提升与一小撮性能回退的权衡。

之前的库长得像这样——到处是 \`interface{}\` 和类型断言：

\`\`\`go
// 旧版：reflect + interface{}
func GetConfig(key string) (interface{}, error) {
    val := store[key]
    return val, nil  // 调用方必须做类型断言
}

// 调用方：
port, ok := GetConfig("port").(int)  // panic 风险
\`\`\`

编译期什么都检查不了，把所有锅甩给了运行时。

## 泛型化设计

\`\`\`go
// 新版：泛型配置读取器
type ConfigStore[V any] struct {
    mu   sync.RWMutex
    data map[string]V
}

func New[V any]() *ConfigStore[V] {
    return &ConfigStore[V]{data: make(map[string]V)}
}

func (c *ConfigStore[V]) Get(key string) (V, error) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    if !ok {
        var zero V
        return zero, fmt.Errorf("key %q not found", key)
    }
    return val, nil
}
\`\`\`

调用方现在是类型安全的：

\`\`\`go
store := config.New[int]()
store.Set("port", 8080)
port, err := store.Get("port")  // port 是 int，编译期确定
\`\`\`

## 类型约束进阶

不是所有类型都适合做配置值。我们用接口约束限定支持的类型：

\`\`\`go
type ConfigValue interface {
    int | string | bool | float64 | time.Duration
}

type TypedStore[V ConfigValue] struct {
    store *ConfigStore[V]
}
\`\`\`

## 性能对比

用基准测试跑一万次 Get 操作：

\`\`\`
BenchmarkOldReflect-8    4521000    263 ns/op    48 B/op
BenchmarkNewGeneric-8   18960000     61 ns/op     0 B/op
\`\`\`

泛型版本反而更快——没有 reflect 的动态分配的锅。

## 小结

Go 泛型的精髓不在"支持更多写法"，而在**把原本运行时的类型检查提前到了编译期**。对于配置解析这类边界层代码，收益远超学习成本。
`,

  /* ===== 数据库 ===== */
  'postgresql-partitioned-orders': `# PostgreSQL 分区表在我们的订单系统上的落地

> 当单表突破两亿行，查询计划开始失控。本文介绍我们如何用声明式分区把 P99 延迟从 1.2s 压到 80ms，以及迁移期间的一致性保障。

订单表 \`orders\` 从上线起每月增长 300 万行。第二年底，一切开始变慢——即使索引还在，查询计划也开始选择全表扫描。

## 诊断

\`\`\`sql
SELECT relname, n_live_tup, n_dead_tup, 
       pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE relname = 'orders';
\`\`\`

| 表名 | 行数 | 大小 |
|------|------|------|
| orders | 2.1 亿 | 87 GB |

\`EXPLAIN ANALYZE\` 显示即使有 \`created_at\` 索引，查询一个月的订单仍在扫描所有分区不可用的旧数据。

## 分区方案

按 \`created_at\` 月分区，使用 PG 12+ 的声明式分区：

\`\`\`sql
CREATE TABLE orders (
    id           BIGSERIAL,
    user_id      BIGINT NOT NULL,
    amount       DECIMAL(10,2),
    status       VARCHAR(20),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- 按月创建分区
CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ...
\`\`\`

### 自动化创建分区

\`\`\`sql
-- 用 cron + pg_cron 每月初自动创建下月分区
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
    next_month date := date_trunc('month', now()) + interval '1 month';
    partition_name text;
BEGIN
    partition_name := 'orders_' || to_char(next_month, 'YYYY_MM');
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        next_month,
        next_month + interval '1 month'
    );
END;
$$ LANGUAGE plpgsql;
\`\`\`

## 在线迁移

不能停服。方案：创建分区表 → 触发器双写 → 批量回填历史 → 切换。

\`\`\`sql
-- 双写触发器（过渡期）
CREATE OR REPLACE FUNCTION order_partition_trigger()
RETURNS trigger AS $$
BEGIN
    INSERT INTO orders_partitioned VALUES (NEW.*);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
\`\`\`

## 效果

| 指标 | 迁移前 | 迁移后 |
|------|--------|--------|
| P50 | 180ms | 12ms |
| P99 | 1200ms | 80ms |
| 表膨胀率 | 34% | 4% |
| VACUUM 耗时 | 4h+ | 2min/分区 |

## 小结

PostgreSQL 声明式分区用起来很简单，但迁移过程需要仔细规划一致性。关键原则：双写过渡、分批次回填、保留回滚窗口。
`,

  'rust-hot-path-rewrite': `# 用 Rust 重写热点路径：一次值得的 30 倍提速

> 借用检查器一开始让人头秃，但编译通过后几乎零运行时错误。本文分享我们把一个 CPU 密集的解析服务用 Rust 重写后的收益与踩坑。

我们的日志解析服务每天处理 50 亿行，Python 版本已经到了天花板——16 核跑到 90%，GC 暂停让延迟图表像心电图。

## 为什么是 Rust

考虑过的几个选项：

| 语言 | 优点 | 缺点 |
|------|------|------|
| Go | 简单、团队熟悉 | GC 在大内存场景仍有抖动 |
| C++ | 绝对性能 | 内存安全是持续的代价 |
| Rust | 零开销抽象 + 编译期保证 | 学习曲线陡峭 |

最终选 Rust 的核心原因：**零 GC + 零数据竞争 + 零空指针**。这三样正好是我们线上事故的三大来源。

## 核心解析逻辑

\`\`\`rust
use nom::IResult;
use nom::bytes::complete::{tag, take_until};
use nom::character::complete::{space0, u64};
use nom::sequence::tuple;

#[derive(Debug)]
struct LogEntry {
    timestamp: u64,
    level: String,
    message: String,
}

fn parse_log(input: &str) -> IResult<&str, LogEntry> {
    let (input, (ts, _, level, _, msg)) = tuple((
        u64, tag(" "), take_until(" "), space0, take_until("\n"),
    ))(input)?;
    Ok((input, LogEntry {
        timestamp: ts,
        level: level.to_string(),
        message: msg.to_string(),
    }))
}
\`\`\`

\`nom\` 是零拷贝解析库，不会为每个字段分配新 String——处理完一行，下一行复用同一块栈内存。

## 并发模型

\`\`\`rust
use rayon::prelude::*;

fn parse_batch(lines: &[&str]) -> Vec<LogEntry> {
    lines.par_iter()
        .filter_map(|line| parse_log(line).ok())
        .map(|(_, entry)| entry)
        .collect()
}
\`\`\`

\`rayon\` 一行代码把迭代变成并行，自动按 CPU 核数分配工作。与 Python 的 GIL 相比，16 核真的跑满了 1600%。

## 性能对比

解析 100 万行日志：

| 实现 | 耗时 | 内存峰值 |
|------|------|----------|
| Python | 4.2s | 480MB |
| Python (PyPy) | 2.1s | 520MB |
| Rust (单线程) | 0.28s | 8MB |
| Rust (并行) | 0.09s | 12MB |

## 踩坑记录

### 生命周期标注

这是 Rust 新手杀手。一个简单的规则：**永远从返回引用的函数开始理解生命周期**。

### 错误处理

不要到处 \`unwrap()\`。尽早引入 \`anyhow\` 或 \`thiserror\` 做结构化错误。

### 编译速度

第一次 CI 拉了 200 个 crate 编译了 8 分钟。后来配了 \`sccache\`，增量编译降到 30 秒以内。

## 小结

Rust 最大的价值不在性能本身，而在于**把运行时的 bug 变成编译错误**。借用检查器逼你思考数据的所有权，而这个思考过程恰好是写出正确并发代码的前提。
`,

  /* ===== 架构 / 设计模式 ===== */
  'strategy-pattern-billing': `# 策略模式在计费规则引擎中的实战应用

> 当 if-else 嵌套超过三层，维护就成了噩梦。本文用一个真实的计费场景，演示如何用策略模式把数百行分支收敛成可插拔的规则单元。

我们的计费系统最初只有"按量计费"一种模式。后来加入了包年包月、阶梯定价、活动折扣……核心函数的 if-else 从 10 行涨到了 300 行。

## 问题

\`\`\`js
// 这是真实代码的简化版——已经不忍直视
function calculateFee(order) {
  if (order.type === 'on_demand') {
    return order.usage * pricePerUnit
  } else if (order.type === 'subscription') {
    if (order.tier === 'basic') return 99
    else if (order.tier === 'pro') return 299
    else return 999
  } else if (order.type === 'tiered') {
    if (order.usage <= 100) return order.usage * 0.5
    else if (order.usage <= 1000) return 50 + (order.usage - 100) * 0.4
    else return 50 + 360 + (order.usage - 1000) * 0.3
  } else if (order.type === 'promotion') {
    // 还有 5 种促销规则...
  }
}
\`\`\`

每次上线新计费方式，就在这个函数尾部加一个 else-if。没有人敢重构它。

## 策略模式重构

\`\`\`ts
interface BillingStrategy {
  name: string
  calculate(order: Order): number
  isApplicable(order: Order): boolean
}

class OnDemandStrategy implements BillingStrategy {
  name = 'on_demand'
  
  isApplicable(order: Order): boolean {
    return order.type === 'on_demand'
  }
  
  calculate(order: Order): number {
    return order.usage * order.unitPrice
  }
}

class TieredStrategy implements BillingStrategy {
  name = 'tiered'
  private tiers = [
    { max: 100, rate: 0.5 },
    { max: 1000, rate: 0.4 },
    { max: Infinity, rate: 0.3 },
  ]
  
  isApplicable(order: Order): boolean {
    return order.type === 'tiered'
  }
  
  calculate(order: Order): number {
    let remaining = order.usage
    let total = 0
    for (const tier of this.tiers) {
      const used = Math.min(remaining, tier.max)
      total += used * tier.rate
      remaining -= used
      if (remaining <= 0) break
    }
    return total
  }
}
\`\`\`

### 引擎

\`\`\`ts
class BillingEngine {
  private strategies: BillingStrategy[] = []
  
  register(strategy: BillingStrategy) {
    this.strategies.push(strategy)
  }
  
  calculate(order: Order): number {
    const strategy = this.strategies.find(s => s.isApplicable(order))
    if (!strategy) throw new Error(\`No strategy for order type: \${order.type}\`)
    return strategy.calculate(order)
  }
}
\`\`\`

## 效果

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 核心函数行数 | 312 | 18 |
| 新增计费方式成本 | 改核心函数 + 回归 | 新增一个类 + 注册 |
| 单元测试覆盖 | 17%（不敢改） | 94%（每个策略独立测） |
| 上线新规则的 Bug 率 | 平均 2.3 个/次 | 0（近 6 次） |

## 小结

策略模式的核心价值不是"优雅"，而是**把"改什么"从"改哪里"中解放出来**。新增计费规则不再需要碰核心引擎——注册一个新策略就完成上线。
`,

  'rest-to-grpc': `# 从 REST 到 gRPC：内部服务通信的协议演进

> Protobuf 的强类型契约让前后端联调少了一半扯皮。本文记录我们把核心链路从 JSON REST 切换到 gRPC 的动机、改造步骤与回归教训。

每次新同事加入，第一件事就是到处问"这个字段拼 camelCase 还是 snake_case"。JSON 的自由是好事，但也是灾难。

## 为什么换

我们的微服务从 3 个长到了 12 个，内部互调频率急剧上升：

| 问题 | REST JSON 的表现 |
|------|-----------------|
| 字段命名不一致 | 有的用 \`userId\`，有的用 \`user_id\` |
| 类型丢失 | 金额是 string 还是 number？全靠约定 |
| 文档滞后 | Swagger 和实际接口经常不同步 |
| 序列化开销 | 大列表 JSON 解析占请求耗时的 12% |

## Proto 定义

\`\`\`protobuf
syntax = "proto3";

package order.v1;

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);
}

message CreateOrderRequest {
  int64 user_id = 1;
  repeated OrderItem items = 2;
  string coupon_code = 3;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 unit_price = 3;  // 单位：分
}
\`\`\`

\`\`\`bash
# 生成 Go 代码
protoc --go_out=. --go-grpc_out=. order.proto
\`\`\`

生成的代码自带类型安全的 Client/Server 接口——找不到 \`uint_price\` 这种拼写错误在编译期就暴露了。

## 渐进式迁移

我们没有一刀切，而是按这个顺序：

1. **内部新服务直接上 gRPC**
2. **高频调用的老服务逐步切**
3. **对外网关层保留 REST → 内部转 gRPC**

\`\`\`go
// API Gateway 转一层
func (gw *Gateway) CreateOrder(w http.ResponseWriter, r *http.Request) {
    var req CreateOrderRequest
    json.NewDecoder(r.Body).Decode(&req)
    
    resp, err := gw.orderClient.CreateOrder(ctx, &req)
    // 返回 JSON
}
\`\`\`

## 翻过的车

### 默认值陷阱

Proto3 移除了 required/optional，所有字段都有默认值。**你无法区分"用户传了 0"和"用户没传"**。

\`\`\`protobuf
// Proto3 里这两种请求完全一样！
{ "discount": 0 }   // 用户明确设了 0
{ }                  // 用户没传
\`\`\`

解决：用 \`google.protobuf.WrapperValue\` 或业务层约定（负数表示未设置）。

### 连接管理

gRPC 基于 HTTP/2 长连接，需要正确处理连接池和重连逻辑，否则服务重启会导致大面积超时。

## 效果

| 指标 | REST | gRPC |
|------|------|------|
| 序列化耗时 | 0.8ms | 0.05ms |
| 有效载荷比 | 40% | 85% |
| 接口文档一致性 | 人肉同步 | 编译期强保证 |
| 联调扯皮时间 | 每周 3h+ | 基本为零 |

## 小结

gRPC 不是 REST 的替代品，而是**内部服务通信**的最佳实践。对于外部 API，REST + JSON 仍然是更友好的选择——网关层做翻译就好。
`,

  /* ===== 云 / K8s ===== */
  'k8s-hpa-cost-cut': `# 我们如何用 K8s HPA 把成本砍掉 40%

> 盲目给 Pod 配大资源请求，是云账单失控的主因。本文拆解我们基于自定义指标的弹性伸缩方案，以及如何避免抖动导致的频繁重启。

我们的生产集群月账单从 8 万涨到 23 万，只用了半年。而同时 CPU 平均利用率只有 18%。

## 诊断

第一步，拉取资源实际用量：

\`\`\`bash
kubectl top pods -n production --sort-by=cpu
\`\`\`

结果显示 85% 的 Pod 实际使用不到 \`requests\` 的 30%，但调度器按 requests 预留了全量资源——大量浪费。

## 典型配置错误

\`\`\`yaml
# ❌ 大手大脚的配置
resources:
  requests:
    cpu: "4"
    memory: "8Gi"
  limits:
    cpu: "4"
    memory: "8Gi"  # requests == limits，HPA 无法基于利用率伸缩
\`\`\`

## 正确姿势

### 第一步：requests 设到真实用量的 1.2 倍

\`\`\`yaml
resources:
  requests:
    cpu: "500m"     # 从 4 降到 0.5
    memory: "1Gi"   # 从 8Gi 降到 1Gi
  limits:
    cpu: "2"        # limits 可以高于 requests 允许弹性
    memory: "4Gi"
\`\`\`

### 第二步：配置 HPA

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 分钟稳定窗口，防抖动
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
\`\`\`

### 第三步：自定义指标

CPU 利用率不是万能的。我们的消息队列消费者 CPU 很低但队列积压严重：

\`\`\`yaml
  - type: External
    external:
      metric:
        name: queue_depth
      target:
        type: AverageValue
        averageValue: "100"
\`\`\`

## 防止抖动

扩缩太快导致的震荡比不扩还糟糕：

| 策略 | 配置 |
|------|------|
| 扩容快缩容慢 | scaleUp: 15s, scaleDown: 300s |
| 缩容按比例而非数量 | 每次缩 10% 而非 2 个 Pod |
| 设 minReplicas | 至少保留 2 个 Pod 扛突发 |

## 效果

| 指标 | 调优前 | 调优后 |
|------|--------|--------|
| 月成本 | 23 万 | 13.5 万 |
| CPU 利用率 | 18% | 68% |
| P99 延迟 | 210ms | 240ms（微增，可接受） |
| Pod 变配次数 | — | < 3 次/天 |

## 小结

HPA 省钱的核心不在于"多复杂"，而在于 **requests 要设对**。不合理的 requests 是一切浪费的根源，HPA 只是把省下来的空间变现。
`,

  'prometheus-alert-fatigue': `# Prometheus 告警疲劳治理：从 200 条到 12 条

> 告警不是越多越好。本文分享我们如何用 SLO 驱动的告警分层，把噪音告警砍掉九成，让 oncall 重新睡上安稳觉的实践。

值班群里每天 200+ 条告警，但真正需要半夜起床处理的一个月不超过 3 次。大家已经练就了"看标题就关掉"的本能——告警完全失效了。

## 症状

\`\`\`promql
# 当前：每台机器 CPU 超过 80% 就报警
avg(rate(node_cpu_seconds_total{mode="user"}[5m])) by (instance) > 0.8
\`\`\`

20 台机器，每台一个告警。而实际上只要集群整体还有余量，单台高负载完全不需要人介入。

## 治理框架

我们引入了 SRE 的核心理念：**只对用户可感知的痛苦报警**。

### 告警分层

| 层级 | 定义 | 通知方式 | 数量 |
|------|------|----------|------|
| P0 | SLO 正在被突破 | 电话 + 企微 | 3 条 |
| P1 | SLO 未来 1h 会被突破 | 企微 + 邮件 | 5 条 |
| P2 | 趋势偏离，暂未威胁 SLO | 邮件 | 4 条 |
| P3 | 技术指标异常 | 仅仪表盘，不通知 | 废弃 180 条 |

### P0 示例——SLO 燃烧速率

\`\`\`promql
# 错误预算消耗速度：过去 1h 消耗了 2% 以上的月度预算
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  /
  sum(rate(http_requests_total[1h]))
) > (0.02 * 30 * 24)  # 按照这个速度，30 天内会耗尽预算
\`\`\`

关键：**用错误预算消耗率替代绝对值**。10 个错误在 QPS 100 和 QPS 10000 的场景下意义完全不同。

### P1 示例——错误率回归

\`\`\`promql
# 当前错误率是过去 7 天同时段中位数的 3 倍
(
  rate(http_requests_total{status=~"5.."}[5m])
  /
  rate(http_requests_total[5m])
) > 3 * avg_over_time(
  rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
  [7d]
)
\`\`\`

### P2 示例——磁盘预测

\`\`\`promql
# 4 小时内磁盘会满
predict_linear(node_filesystem_free_bytes{mountpoint="/"}[1h], 4 * 3600) < 0
\`\`\`

这条会发邮件但不会打电话——磁盘满之前有充分时间处理。

## Alertmanager 路由

\`\`\`yaml
routes:
  - match:
      severity: P0
    receiver: oncall-phone
    repeat_interval: 5m
    
  - match:
      severity: P1
    receiver: team-channel
    repeat_interval: 30m
    
  - match:
      severity: P2
    receiver: weekly-digest
    group_wait: 1h
\`\`\`

## 效果

| 指标 | 治理前 | 治理后 |
|------|--------|--------|
| 日均告警 | 217 条 | 8 条 |
| 告警响应率 | < 5% | > 90% |
| MTTR（平均修复时间） | 47min | 12min |
| oncall 满意度 | 2.1/5 | 4.5/5 |

## 小结

治理告警疲劳的核心不是"设更坏的阈值"，而是**换一个维度——从技术指标切换到用户影响**。每条告警都应当回答同一个问题：用户正在经历痛苦吗？
`,

  /* ===== 测试 / QA ===== */
  'testing-pyramid-revisited': `# 让单测真正有用：我们团队的测试金字塔回归

> 一堆互相依赖的集成测试跑一次要 40 分钟。本文记录我们如何把测试重心移回快速单测，并把覆盖率指标从"虚荣数字"变成"真实护栏"。

我们的 CI 跑一次 40 分钟，PR 从提交到合入平均要等 4 轮。回头看测试构成：单测 12%，集成测试 85%，端到端 3%——测试金字塔完全倒挂。

## 倒挂的代价

- 修改一个字段，82 个集成测试炸掉，一修就是半小时
- 单测覆盖率 91% 但全是 \`expect(func()).toBe(undefined)\` 级别的无用断言
- 没人敢删测试——因为不知道哪个"碰巧"覆盖了真实 bug

## 重构策略

### 删除无效单测

\`\`\`ts
// ❌ 这种测试删掉
describe('add', () => {
  it('should not throw', () => {
    expect(() => add(1, 2)).not.toThrow()
  })
})

// ✅ 有用的测试
describe('add', () => {
  it('should handle negative numbers', () => {
    expect(add(-1, -2)).toBe(-3)
  })
  it('should handle Number.MAX_SAFE_INTEGER edge case', () => {
    expect(() => add(Number.MAX_SAFE_INTEGER, 1)).not.toThrow()
  })
})
\`\`\`

一刀原则：**测试名里看不出"测什么边界"的，直接删**。

### 集成测试瘦身

把 85% 的集成测试按这个标准审视：

> 这个测试的失败，能否精确指向一个具体的模块？

如果答案是"不能"，它应该在单测层。集成测试只保留"真实的外部依赖交互"——数据库连接、消息队列、第三方 API。

### 契约测试替代部分 E2E

\`\`\`ts
// 不启动完整服务，只验证 API 契约
test('GET /users/:id returns 200 with valid user', async () => {
  const { req, res } = createMocks({ method: 'GET', query: { id: '123' } })
  await handler(req, res)
  expect(res.statusCode).toBe(200)
  expect(res._getJSONData()).toMatchSchema(userSchema)
})
\`\`\`

## 分层策略

| 层 | 占比 | 运行时间 | 失败时能定位到 |
|------|------|----------|---------------|
| 单元测试 | 70%+ | < 2min | 具体函数 |
| 集成测试 | 25% | 5min | 具体模块边界 |
| E2E | 5% | 10min | 整个流程 |

## 效果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 全量测试时间 | 40min | 8min |
| 单测数量 | 3800（含大量僵尸） | 1200（每一条有意义） |
| PR 平均合入轮数 | 4.2 | 1.3 |
| 线上故障中"测试没抓到"的比例 | 62% | 14% |

## 小结

测试的金字塔不是代码量的金字塔，而是**信噪比**的金字塔。底层测逻辑、中层测集成、顶层测流程——顺序不能乱，否则再多测试也只是一堆慢速告警。
`,

  /* ===== ML / 训练 ===== */
  'distributed-training-scaling': `# 从单机到 8 卡：一次大模型训练的效率爬坡

> 数据并行简单，但通信开销会吃掉一半算力。本文拆解我们做梯度累积、混合精度与 ZeRO 优化的过程，把训练吞吐提升了 3.4 倍。

单卡 A100 跑 7B 模型，一个 checkpoint 要 18 小时。时间可以等，但实验迭代等不起。

## 并行策略选择

| 策略 | 适用场景 | 通信开销 |
|------|----------|----------|
| 数据并行（DP） | 模型能放进单卡 | 梯度 AllReduce |
| 模型并行（MP） | 模型放不进单卡 | 每层前向/反向都要通信 |
| 流水线并行（PP） | 模型大+层数多 | 相对低，但有气泡 |
| ZeRO | 介于 DP 和 MP 之间 | 梯度/参数分片通信 |

我们的 7B 模型勉强能放进单卡 A100（40GB），所以选 **ZeRO-2**：优化器状态和梯度分片，参数保留完整副本。

## ZeRO 级别对比

\`\`\`
ZeRO-1: 切分 Optimizer States    → 省 4x 显存
ZeRO-2: + 切分 Gradients        → 省 8x 显存  
ZeRO-3: + 切分 Parameters       → 省 N x 显存（N = GPU 数）
\`\`\`

我们选 ZeRO-2，因为参数能放进单卡，不需要切分带来的额外通信。

## 梯度累积

原生每步都同步梯度，128 张卡的通信成本让人崩溃：

\`\`\`python
# 等价于 batch_size = 32 但每 4 个 micro-batch 才同步一次
training_args = TrainingArguments(
    per_device_train_batch_size=8,
    gradient_accumulation_steps=4,
    # 有效 batch = 8 * 4 * 8 卡 = 256
)
\`\`\`

## 混合精度（AMP）

\`\`\`python
training_args = TrainingArguments(
    fp16=True,  # 前向/反向用 FP16，权重更新保持 FP32
    # 显存减半，速度提升 2-3x，精度损失可忽略
)
\`\`\`

## 结果

| 指标 | 单卡 Baseline | 4 卡 DP | 8 卡 ZeRO-2 + AMP |
|------|-------------|---------|--------------------|
| 总训练时间 | 18.5h | 6.1h（效率 76%） | 5.4h（效率 87%） |
| 单卡显存 | 38GB | 38GB | 12GB |
| 吞吐 tokens/s | 820 | 2490 | 2820 |

## 坑

- **ZeRO 不是万能的**——模型太小（< 1B）ZeRO 的通信开销反而拖后腿。
- **AMP 下 loss scale 需要监控**——loss 突然变成 NaN 通常是 scale overflow。
- **梯度累积步数不是越多越好**——超过一定值 BatchNorm 行为会偏移。

## 小结

分布式训练的优化路径：先让单卡跑起来 → 梯度累积撑大有效 batch → 混合精度省显存 → ZeRO 多卡扩展。按这个顺序，每一步都能单独验证收益。
`,

  /* ===== 设计 / 产品 ===== */
  'negative-space-aesthetics': `# 留白不是空白：东方美学中的负空间

> 留白是中国传统艺术的核心语言，在现代界面设计中同样是控制信息层级与视觉焦点的关键手段。

很多人以为"留白"就是"什么都不放"。恰恰相反——留白是最昂贵的元素，只有最重要的内容才配得上被它包围。

## 留白的三个层次

### 微观留白（Micro Whitespace）

字间距、行高、列表项之间。它影响"能不能轻松读下去"。

> 正文行高通常设 1.6-1.8，列表项间距 8-12px。这条线以下，信息糊成一团。

### 宏观留白（Macro Whitespace）

模块之间、区块之间。控制"先看哪里，再看哪里"。

一个反面案例是某些管理后台——三栏布局、每栏塞满表格和图表。用户最终什么都不看，靠 Ctrl+F 生存。

### 主动留白（Active Whitespace）

刻意引导视觉焦点。比如登录页的中间一个表单，周围大面积空白——这不是"省事"，而是"让用户只看表单"。

## 东方美学中的留白

南宋马远的《寒江独钓图》——整幅画只有一个渔翁和一条小船，剩下全是水。不是他不会画，是只有空白才能让"独"字成立。

界面设计同理——**信息层级不是靠"加粗放大"建立的，而是靠"周围有多安静"**。

## 实用原则

1. **留白和内容面积的比例至少 1:1**——这是最低底线。
2. **关联内容的间距小于无关内容的间距**——不需要分割线，间距本身就是语言。
3. **每增加一个元素，先问"去掉它用户会损失什么？"**——加东西永远比删东西容易。

## 小结

下次做设计评审，试着把"这里空太多了"换成"这里的内容值得被空白衬托吗？"——这是两种完全不同的思维方式。
`,

  'user-feedback-to-decision': `# 从用户反馈到产品决策的距离

> 用户反馈是产品的养分，但直接将反馈转化为需求往往是危险的。我们需要一套分类、验证与排序的机制。

"用户说要 A 功能，我们就做 A"——这是最偷懒也最危险的产品决策方式。

## 反馈分类

| 类别 | 比例 | 处理方式 |
|------|------|----------|
| Bug 报告 | 40% | 直接修复 |
| 使用困惑 | 25% | 改进交互/文案 |
| 功能请求 | 20% | 需要深度分析 |
| 情绪发泄 | 15% | 安抚，不据此决策 |

关键在于这 20% 的功能请求——它们是矿，但也可能指错方向。

## 功能请求的四步验证

### 第一步：理解背后的 Job to be Done

用户说"我要一个导出 Excel 的按钮"——深层需求可能是"我要把数据给别人看"。解决方案也许是分享链接而不是导出文件。

### 第二步：看行为而非听语言

用户说"这个功能很重要"，但看数据 80% 的人从来没用过。以行为数据为主，访谈为辅。

### 第三步：计算解决半径

一个需求能覆盖多少用户的多少痛苦？

\`\`\`
优先级 = 影响用户数 × 问题严重度 / 实现成本
\`\`\`

### 第四步：假说验证

不做完整功能，先用最廉价的方式验证假设：

> - 用人工操作替代自动流程，看用户是否真的需要  
> - 做一个静态页面测点击率  
> - 灰度 5% 看数据反馈

## 小结

从反馈到决策，中间的每一步都是在回答同一个问题：**我们是在解决用户说的问题，还是在解决用户真正有的问题？** 这两个答案经常不一样。
`,

  /* ===== 生活 ===== */
  'designer-morning-ritual': `# 一个设计师的晨间仪式

> 清晨的一杯咖啡、十分钟的冥想和一页手写笔记，这些微小习惯如何影响一天的创造力与工作节奏。

以前我的早晨是：被闹钟吵醒 → 摸手机刷通知 → 被焦虑驱动着跳起来冲进一天。这样过了三年，我发现我的"灵感"越来越少——不是素材不够，是大脑从来没有安静过。

## 6:30 — 起床，不碰手机

手机晚上放在客厅充电。早晨第一件事不是刷通知，而是站在阳台看一会窗外——什么也不想。

> 创造力需要空白。就像画画需要画纸，构思需要一段不被填充的时间。

## 6:45 — 手冲一杯咖啡

不是胶囊机那种按一下就完事的——是磨豆、注水、等滤泡慢慢滴。整个过程大概 12 分钟。

这个仪式感的意义不在咖啡本身，而在于**用一件确定的、可控的小事开启一天**。它告诉大脑：今天的第一件事完成了，很好，继续。

## 7:00 — 十分钟冥想

不追求"什么都不想"，而是练习"注意到自己在想，然后轻轻回到呼吸"。

对我最直接的收益是：下午三四点面对第三版修改意见时，不那么容易炸了。

## 7:15 — 写一页笔记

不是待办清单。是用钢笔在空白本上随便写——昨天的一个有意思的小想法、刚刚做的梦、或者只是一句"今天没什么特别想写的"。

坚持三年下来，最意外的收获是：翻回去能看到自己思维方式的演变。那些"当时觉得很重要"的事，90% 半年后都不记得了。

## 小结

晨间仪式不是成功学，而是一种**在信息轰炸来临前，先把主动权拿回自己手里**的办法。不一定非要这四件事，但需要有一件让你在机器启动之前，先启动自己。
`,

  /* ===== 区块链 ===== */
  'eth-btc-differences': ethBtcContent,
}
