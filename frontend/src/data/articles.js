/**
 * 知识库列表页静态数据 — 全部逐条取自 prototypes/article-list.html，
 * 文案、数值、图片地址均未改动；slug 为迁移时新增的路由标识。
 */

/** 多级分类树（最多三层），与原型脚本里的 categoryData 完全一致 */
export const categoryTree = [
  {
    name: 'NodeJS',
    key: 'nodejs',
    children: [
      {
        name: '数据库',
        key: 'nodejs-db',
        children: [
          { name: 'Mysql数据库', key: 'nodejs-db-mysql' },
          { name: 'MongoDB', key: 'nodejs-db-mongodb' },
        ],
      },
      {
        name: '框架',
        key: 'nodejs-framework',
        children: [
          { name: 'Express', key: 'nodejs-framework-express' },
          { name: 'Koa', key: 'nodejs-framework-koa' },
        ],
      },
    ],
  },
  {
    name: '前端开发',
    key: 'frontend',
    children: [
      {
        name: '框架',
        key: 'frontend-framework',
        children: [
          { name: 'React', key: 'frontend-framework-react' },
          { name: 'Vue', key: 'frontend-framework-vue' },
        ],
      },
      {
        name: '工程化',
        key: 'frontend-eng',
        children: [
          { name: '构建工具', key: 'frontend-eng-build' },
          { name: '组件库', key: 'frontend-eng-ui' },
        ],
      },
    ],
  },
  {
    name: '后端开发',
    key: 'backend',
    children: [
      {
        name: '语言',
        key: 'backend-lang',
        children: [
          { name: 'Go', key: 'backend-lang-go' },
          { name: 'Java', key: 'backend-lang-java' },
        ],
      },
      {
        name: '网关',
        key: 'backend-gw',
        children: [
          { name: '鉴权', key: 'backend-gw-auth' },
        ],
      },
    ],
  },
  {
    name: 'AI 工程化',
    key: 'ai',
    children: [
      {
        name: '规格化开发',
        key: 'ai-spec',
        children: [
          { name: 'openSpec', key: 'ai-spec-openspec' },
          { name: '规范文档', key: 'ai-spec-doc' },
        ],
      },
      {
        name: '模型部署',
        key: 'ai-deploy',
        children: [
          { name: '推理优化', key: 'ai-deploy-infer' },
        ],
      },
    ],
  },
  {
    name: '数据库',
    key: 'database',
    children: [
      {
        name: '关系型',
        key: 'database-relational',
        children: [
          { name: 'PostgreSQL', key: 'database-relational-postgres' },
          { name: 'MySQL', key: 'database-relational-mysql' },
        ],
      },
      {
        name: '缓存',
        key: 'database-cache',
        children: [
          { name: 'Redis', key: 'database-cache-redis' },
        ],
      },
    ],
  },
  {
    name: '云计算',
    key: 'cloud',
    children: [
      {
        name: '容器',
        key: 'cloud-container',
        children: [
          { name: 'Kubernetes', key: 'cloud-container-k8s' },
          { name: 'Docker', key: 'cloud-container-docker' },
        ],
      },
      {
        name: 'Serverless',
        key: 'cloud-serverless',
        children: [
          { name: '函数计算', key: 'cloud-serverless-fn' },
        ],
      },
    ],
  },
  {
    name: '运维 DevOps',
    key: 'devops',
    children: [
      {
        name: '监控',
        key: 'devops-monitor',
        children: [
          { name: 'Prometheus', key: 'devops-monitor-prom' },
          { name: 'Grafana', key: 'devops-monitor-grafana' },
        ],
      },
      {
        name: 'CI/CD',
        key: 'devops-cicd',
        children: [
          { name: '流水线', key: 'devops-cicd-pipeline' },
        ],
      },
    ],
  },
  {
    name: '编程语言',
    key: 'lang',
    children: [
      { name: 'Rust', key: 'lang-rust' },
      { name: 'Python', key: 'lang-python' },
      { name: 'TypeScript', key: 'lang-ts' },
    ],
  },
  {
    name: '架构设计',
    key: 'arch',
    children: [
      {
        name: '模式',
        key: 'arch-pattern-group',
        children: [
          { name: '设计模式', key: 'arch-pattern' },
          { name: 'DDD', key: 'arch-ddd' },
        ],
      },
      {
        name: '性能',
        key: 'arch-perf',
        children: [
          { name: '高并发', key: 'arch-perf-concurrency' },
        ],
      },
    ],
  },
  {
    name: '微服务',
    key: 'microsvc',
    children: [
      {
        name: '通信',
        key: 'microsvc-comm',
        children: [
          { name: 'gRPC', key: 'microsvc-comm-grpc' },
          { name: '消息队列', key: 'microsvc-comm-mq' },
        ],
      },
      {
        name: '治理',
        key: 'microsvc-govern',
        children: [
          { name: '服务发现', key: 'microsvc-govern-discovery' },
        ],
      },
    ],
  },
  {
    name: '网络安全',
    key: 'sec',
    children: [
      {
        name: '应用安全',
        key: 'sec-app',
        children: [
          { name: '注入防护', key: 'sec-app-injection' },
        ],
      },
      {
        name: '基础设施',
        key: 'sec-infra',
        children: [
          { name: '零信任', key: 'sec-infra-zero' },
        ],
      },
    ],
  },
  {
    name: '质量测试',
    key: 'qa',
    children: [
      {
        name: '单元',
        key: 'qa-unit-group',
        children: [
          { name: '单测实践', key: 'qa-unit' },
        ],
      },
      {
        name: '自动化',
        key: 'qa-auto',
        children: [
          { name: 'E2E', key: 'qa-e2e' },
        ],
      },
    ],
  },
  { name: '设计洞察', key: 'design' },
  { name: '产品设计', key: 'product' },
  {
    name: '用户体验',
    key: 'ux',
    children: [
      {
        name: '交互',
        key: 'ux-interaction',
        children: [
          { name: '动效', key: 'ux-interaction-motion' },
        ],
      },
      { name: '可用性原则', key: 'ux-principle' },
    ],
  },
  {
    name: '数据科学',
    key: 'datasci',
    children: [
      {
        name: '可视化',
        key: 'datasci-viz',
        children: [
          { name: '图表', key: 'datasci-viz-chart' },
        ],
      },
      {
        name: '分析',
        key: 'datasci-exp',
        children: [
          { name: '实验', key: 'datasci-exp-experiment' },
        ],
      },
    ],
  },
  {
    name: '机器学习',
    key: 'ml',
    children: [
      {
        name: '训练',
        key: 'ml-train',
        children: [
          { name: '分布式训练', key: 'ml-train-dist' },
        ],
      },
      {
        name: '推理',
        key: 'ml-infer',
        children: [
          { name: '模型压缩', key: 'ml-infer-compress' },
        ],
      },
    ],
  },
  {
    name: '移动开发',
    key: 'mobile',
    children: [
      { name: 'iOS', key: 'mobile-ios' },
      { name: 'Android', key: 'mobile-android' },
      {
        name: '跨端',
        key: 'mobile-cross',
        children: [
          { name: 'Flutter', key: 'mobile-cross-flutter' },
        ],
      },
    ],
  },
  {
    name: '工具链',
    key: 'tool',
    children: [
      {
        name: '包管理',
        key: 'tool-pkg',
        children: [
          { name: 'pnpm', key: 'tool-pkg-pnpm' },
        ],
      },
      {
        name: '编辑器',
        key: 'tool-editor',
        children: [
          { name: 'Neovim', key: 'tool-editor-neovim' },
        ],
      },
    ],
  },
  { name: '开源观察', key: 'opensource' },
  { name: '读书笔记', key: 'reading' },
  { name: '生活随笔', key: 'life' },
  {
    name: '区块链',
    key: 'blockchain',
    children: [
      {
        name: '以太坊',
        key: 'blockchain-eth',
        children: [
          { name: 'ETH 基础', key: 'blockchain-eth-basics' },
          { name: '智能合约', key: 'blockchain-eth-contract' },
          { name: '共识机制', key: 'blockchain-eth-consensus' },
        ],
      },
    ],
  },
]

/**
 * 文章列表。
 * key —— 原型卡片上的 data-key，分类筛选靠它做前缀匹配，不能改。
 * plainAuthorIcon —— 原型首张卡片的「作者」图标是 stroke-width="2" 且没有 linecap，
 *                   与其余卡片（1.5 + round）不同，这里如实标记以保持像素一致。
 */
export const articles = [
  {
    key: 'blockchain-eth-basics',
    slug: 'eth-btc-differences',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop',
    category: 'ETH 基础',
    title: 'ETH和BTC区别：从账户模型到共识机制的深度解析',
    excerpt: '深入理解以太坊的设计哲学——从挖矿、账户模式、状态树到Ghost协议与POS，全面对比ETH与BTC在架构上的核心差异。',
    author: '区块链研习社',
    date: '2024-05-20',
    reads: '2356 阅读',
  },
  {
    key: 'nodejs-db-mysql',
    slug: 'mysql-connection-pool-tuning',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop',
    category: 'Mysql数据库',
    title: 'MySQL 连接池调优：从 200ms 到 8ms 的实战',
    excerpt: '在高并发场景下，连接池配置直接决定接口延迟。本文记录我们在 NodeJS 服务中对 Mysql 连接池的调优过程，包括最大连接数、空闲回收与超时策略。',
    author: '张三',
    date: '2024-05-15',
    reads: '1286 阅读',
    plainAuthorIcon: true,
  },
  {
    key: 'nodejs-db-mongodb',
    slug: 'mongodb-aggregation-performance',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop',
    category: 'MongoDB',
    title: 'MongoDB 聚合管道性能分析与索引优化',
    excerpt: '聚合管道是 MongoDB 最强大的特性之一，但也是性能陷阱的重灾区。本文通过 explain 输出逐段剖析一个慢查询的优化路径。',
    author: '李四',
    date: '2024-05-11',
    reads: '932 阅读',
  },
  {
    key: 'nodejs-framework-express',
    slug: 'express-middleware-order',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop',
    category: 'Express',
    title: 'Express 中间件执行顺序的那些坑',
    excerpt: '一个看似正确的中间件注册顺序，可能让你排查半天权限问题。本文梳理 Express 中间件栈的洋葱模型与常见误用。',
    author: '王五',
    date: '2024-05-08',
    reads: '754 阅读',
  },
  {
    key: 'ai-spec-openspec',
    slug: 'openspec-getting-started',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop',
    category: 'openSpec',
    title: 'openSpec 入门：用规格文件驱动 AI 编码',
    excerpt: '规格化开发让 AI 在明确约束下工作，而不是自由发挥。本文带你从零搭建一个 openSpec 工作流，把需求变成可验证的规格。',
    author: '赵六',
    date: '2024-05-05',
    reads: '1103 阅读',
  },
  {
    key: 'ai-deploy-infer',
    slug: 'llm-inference-kv-cache',
    thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=300&fit=crop',
    category: '推理优化',
    title: '大模型推理优化实战：KV Cache 与批处理',
    excerpt: '吞吐量和首字延迟往往是矛盾的，而 KV Cache 与连续批处理是化解矛盾的关键。本文记录一次线上推理服务的优化复盘。',
    author: '赵六',
    date: '2024-04-28',
    reads: '1567 阅读',
  },
  {
    key: 'design',
    slug: 'negative-space-aesthetics',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop',
    category: '设计洞察',
    title: '留白不是空白：东方美学中的负空间',
    excerpt: '留白是中国传统艺术的核心语言，在现代界面设计中同样是控制信息层级与视觉焦点的关键手段。',
    author: '张三',
    date: '2024-04-20',
    reads: '802 阅读',
  },
  {
    key: 'product',
    slug: 'user-feedback-to-decision',
    thumbnail: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=300&fit=crop',
    category: '产品思考',
    title: '从用户反馈到产品决策的距离',
    excerpt: '用户反馈是产品的养分，但直接将反馈转化为需求往往是危险的。我们需要一套分类、验证与排序的机制。',
    author: '王五',
    date: '2024-04-14',
    reads: '689 阅读',
  },
  {
    key: 'life',
    slug: 'designer-morning-ritual',
    thumbnail: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop',
    category: '生活随笔',
    title: '一个设计师的晨间仪式',
    excerpt: '清晨的一杯咖啡、十分钟的冥想和一页手写笔记，这些微小习惯如何影响一天的创造力与工作节奏。',
    author: '李四',
    date: '2024-04-09',
    reads: '542 阅读',
  },
  {
    key: 'frontend-framework-react',
    slug: 'react-class-to-hooks',
    thumbnail: 'https://picsum.photos/seed/reactjs/400/300',
    category: 'React',
    title: '从 Class 到 Hooks：一次 React 状态管理的迁移复盘',
    excerpt: 'Hooks 让组件逻辑复用变得优雅，但也带来闭包陷阱与依赖管理的隐性成本。本文复盘我们把一个中等规模应用从 Class 组件迁到函数组件的全过程。',
    author: '陈晨',
    date: '2024-05-18',
    reads: '1503 阅读',
  },
  {
    key: 'backend-lang-go',
    slug: 'go-generics-config-parser',
    thumbnail: 'https://picsum.photos/seed/golang/400/300',
    category: 'Go',
    title: '用 Go 泛型重写我们的配置解析库',
    excerpt: 'Go 1.18 引入的泛型终于让我们告别了满屏的 reflect。本文记录配置库在引入泛型后的类型安全性提升与一小撮性能回退的权衡。',
    author: '赵磊',
    date: '2024-05-12',
    reads: '889 阅读',
  },
  {
    key: 'database-relational-postgres',
    slug: 'postgresql-partitioned-orders',
    thumbnail: 'https://picsum.photos/seed/postgres/400/300',
    category: 'PostgreSQL',
    title: 'PostgreSQL 分区表在我们的订单系统上的落地',
    excerpt: '当单表突破两亿行，查询计划开始失控。本文介绍我们如何用声明式分区把 P99 延迟从 1.2s 压到 80ms，以及迁移期间的一致性保障。',
    author: '孙倩',
    date: '2024-05-02',
    reads: '1120 阅读',
  },
  {
    key: 'lang-rust',
    slug: 'rust-hot-path-rewrite',
    thumbnail: 'https://picsum.photos/seed/rustlang/400/300',
    category: 'Rust',
    title: '用 Rust 重写热点路径：一次值得的 30 倍提速',
    excerpt: '借用检查器一开始让人头秃，但编译通过后几乎零运行时错误。本文分享我们把一个 CPU 密集的解析服务用 Rust 重写后的收益与踩坑。',
    author: '周野',
    date: '2024-04-22',
    reads: '2041 阅读',
  },
  {
    key: 'arch-pattern',
    slug: 'strategy-pattern-billing',
    thumbnail: 'https://picsum.photos/seed/architecture/400/300',
    category: '设计模式',
    title: '策略模式在计费规则引擎中的实战应用',
    excerpt: '当 if-else 嵌套超过三层，维护就成了噩梦。本文用一个真实的计费场景，演示如何用策略模式把数百行分支收敛成可插拔的规则单元。',
    author: '吴桐',
    date: '2024-04-15',
    reads: '1677 阅读',
  },
  {
    key: 'microsvc-comm-grpc',
    slug: 'rest-to-grpc',
    thumbnail: 'https://picsum.photos/seed/grpc/400/300',
    category: 'gRPC',
    title: '从 REST 到 gRPC：内部服务通信的协议演进',
    excerpt: 'Protobuf 的强类型契约让前后端联调少了一半扯皮。本文记录我们把核心链路从 JSON REST 切换到 gRPC 的动机、改造步骤与回归教训。',
    author: '郑凯',
    date: '2024-04-03',
    reads: '1358 阅读',
  },
  {
    key: 'cloud-container-k8s',
    slug: 'k8s-hpa-cost-cut',
    thumbnail: 'https://picsum.photos/seed/kubernetes/400/300',
    category: 'Kubernetes',
    title: '我们如何用 K8s HPA 把成本砍掉 40%',
    excerpt: '盲目给 Pod 配大资源请求，是云账单失控的主因。本文拆解我们基于自定义指标的弹性伸缩方案，以及如何避免抖动导致的频繁重启。',
    author: '冯磊',
    date: '2024-03-28',
    reads: '1922 阅读',
  },
  {
    key: 'devops-monitor-prom',
    slug: 'prometheus-alert-fatigue',
    thumbnail: 'https://picsum.photos/seed/prometheus/400/300',
    category: 'Prometheus',
    title: 'Prometheus 告警疲劳治理：从 200 条到 12 条',
    excerpt: '告警不是越多越好。本文分享我们如何用 SLO 驱动的告警分层，把噪音告警砍掉九成，让 oncall 重新睡上安稳觉的实践。',
    author: '许航',
    date: '2024-03-19',
    reads: '1430 阅读',
  },
  {
    key: 'qa-unit',
    slug: 'testing-pyramid-revisited',
    thumbnail: 'https://picsum.photos/seed/testing/400/300',
    category: '单测实践',
    title: '让单测真正有用：我们团队的测试金字塔回归',
    excerpt: '一堆互相依赖的集成测试跑一次要 40 分钟。本文记录我们如何把测试重心移回快速单测，并把覆盖率指标从"虚荣数字"变成"真实护栏"。',
    author: '何敏',
    date: '2024-03-11',
    reads: '998 阅读',
  },
  {
    key: 'ml-train-dist',
    slug: 'distributed-training-scaling',
    thumbnail: 'https://picsum.photos/seed/mltrain/400/300',
    category: '分布式训练',
    title: '从单机到 8 卡：一次大模型训练的效率爬坡',
    excerpt: '数据并行简单，但通信开销会吃掉一半算力。本文拆解我们做梯度累积、混合精度与 ZeRO 优化的过程，把训练吞吐提升了 3.4 倍。',
    author: '林深',
    date: '2024-02-26',
    reads: '2215 阅读',
  },
]

/** 右侧「动态」栏时间线，顺序与原型一致 */
export const feedItems = [
  {
    date: '2024-05-20',
    title: 'ETH和BTC区别：从账户模型到共识机制的深度解析',
    slug: 'eth-btc-differences',
  },
  {
    date: '2024-05-21',
    title: 'Rust 异步运行时选型：Tokio 与 async-std 实测对比',
    slug: 'rust-async-runtime-comparison',
  },
  {
    date: '2024-05-18',
    title: 'Kubernetes 探针配置：从误杀到优雅上下线',
    slug: 'k8s-probe-configuration',
  },
  {
    date: '2024-05-15',
    title: 'MySQL 连接池调优：从 200ms 到 8ms 的实战',
    slug: 'mysql-connection-pool-tuning',
  },
  {
    date: '2024-05-08',
    title: 'Express 中间件执行顺序的那些坑',
    slug: 'express-middleware-order',
  },
  {
    date: '2024-05-05',
    title: 'openSpec 入门：用规格文件驱动 AI 编码',
    slug: 'openspec-getting-started',
  },
  {
    date: '2024-04-28',
    title: '大模型推理优化实战：KV Cache 与批处理',
    slug: 'llm-inference-kv-cache',
  },
]
