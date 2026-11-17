/**
 * 简历默认内容（对齐新原型区块结构）。
 * 由原前端 mock 数据（frontend/src/data/resume.js）迁移而来，
 * 作为种子数据与接口无生效版本时的占位数据。
 */
export const DEFAULT_RESUME_CONTENT = {
  profile: {
    avatarText: '', // 留空则自动取姓名首字
    name: '林知墨',
    handle: 'AI 全栈工程师（偏后端）',
    tagline: '专注 AI Agent 开发、后端工程与全栈架构，相信好的工程源于深入理解底层原理与持续实践。',
    heroInfo: '为保护个人隐私，网页简历信息已做脱敏处理，完整履历欢迎邮件或微信联系获取。',
  },
  // 侧栏 · 个人信息（原型 info-list）
  info: [
    { icon: 'mail', label: '邮箱', value: 'hi@modui.design', href: 'mailto:hi@modui.design' },
    { icon: 'chat', label: '微信', value: '（待补充）', href: null },
    { icon: 'location', label: '意向城市', value: '广州', href: null },
    { icon: 'user', label: '政治面貌', value: '党员', href: null },
    { icon: 'badge', label: '在职状态', value: '在职', href: null },
  ],
  // 侧栏 · 教育背景（原型 info-block）
  education: {
    school: '桂林电子科技大学',
    period: '2019 — 2023',
    major: '信息管理与信息系统',
  },
  // 侧栏 · 资质/证书（原型 tag-group）
  certificates: [
    { label: '系统分析师 · 高级职称', accent: true },
    { label: '数据库系统工程师 · 中级职称', accent: true },
    { label: 'CET-6', accent: false },
    { label: 'CET-4', accent: false },
    { label: '救护员', accent: false },
  ],
  // 关于我（原型 lead-text × N + callout）
  about: {
    leads: [
      '我是一名横跨<strong>产品设计</strong>与<strong>前端工程</strong>的从业者，习惯把模糊的需求翻译成可落地的界面与系统。过去 6 年里，我在设计系统、B 端中台与开发者工具之间往返，相信好的产品来自设计约束与工程可行性的反复对齐。',
      '工作之余以「墨堆」为名记录技术随笔，把读过的论文、踩过的坑、想通的设计原则沉淀成文字。我追求一种<strong>克制而精确</strong>的表达——无论写代码还是写文章。',
    ],
    callout: '设计不是装饰，而是把复杂性藏到恰好的深度；工程不是实现，而是让好的设计活下来。',
  },
  // 技术与能力（原型 tech-cat → tech-list → tech-item）
  techCategories: [
    {
      title: '后端能力',
      items: [
        {
          name: 'Node.js',
          desc: '深入掌握异步编程模型与事件循环机制，具备实战问题排查与性能调优实战经验。熟练应用 Egg.js、NestJS、Express 进行生产级开发；熟练应用 Sequelize、Prisma、Mongoose 等 ORM 框架。熟练使用 ws 实现 WebSocket 长连接通信，SSE（Server-Sent Events），有微服务相关开发经验。',
        },
        {
          name: 'TypeScript',
          desc: '熟练使用高级类型（泛型、条件类型、映射类型、类型守卫）进行类型安全编程，遵循 SOLID 设计思想，具有良好的面向对象编程思想。',
        },
        {
          name: '数据库',
          desc: '数据库系统工程师职称。熟悉 MySQL 等关系型数据库，熟悉索引原理、具备数据库模型设计能力与 SQL 性能优化经验。熟练使用 Redis 应对缓存策略、分布式锁、LUA 脚本语法，了解 RDB/AOF 持久化与内存淘汰机制（LRU/LFU）。有 PostgreSQL、Mongoose 数据库使用经验。',
        },
        {
          name: '中间件',
          desc: '熟悉 Redis，理解 Redis 常用原理。熟悉 Bull.js、RocketMQ 等消息队列，理解其适用场景与原理。熟练配置 Nginx 实现反向代理、负载均衡（轮询/加权/IP Hash）及静态资源缓存，具备 SSL 证书配置经验，理解其适用场景与原理。',
        },
        {
          name: '其他语言',
          desc: 'Java 作为第二开发语言，具备 Spring Boot、Spring Cloud 生态开发经验。熟悉 Python、C++ 语法，能快速上手其他语言。',
        },
        {
          name: 'DevOps',
          desc: '有基于 Jenkins 的 CI/CD 云效编排流程，熟悉 Linux 常用命令，熟悉 Docker 容器化部署与常用指令，了解 Kubernetes（K8s）基本操作与编排概念。',
        },
      ],
    },
    {
      title: 'AI Agent 开发与 AI 工程化',
      items: [
        {
          name: 'AI Agent 开发框架',
          desc: '熟悉 Langchain.js，能熟练构建 Agent 工作流与链式调用；有 Egg.js 4.0（集成 LangChain）使用经验。',
        },
        {
          name: 'CLI 开发',
          desc: '熟悉 Commander.js 框架，熟悉 CLI 架构模型，具备基于 AI Agent 工具链的命令行应用开发能力，参与 AI Agent 专用 CLI 的架构设计，主导过业务系统接入 CLI 相关事项。',
        },
        { name: '提示词工程', desc: '熟练掌握 Prompt 设计、优化与结构化编写。' },
        {
          name: 'SKILL 设计',
          desc: '能基于手上任务，抽取可复用任务流程，并编排成 AI Agent 可执行的 SKILL，提高团队整体事项处理效率；独立设计基于 AI Agent + Autocannon 的自动化压测流程 Skill，生成压测计划、收集压测用例、分析压测结果。',
        },
        { name: 'RAG', desc: '熟悉 RAG 全部流程，具备检索增强生成系统的完整设计与落地经验。' },
        { name: '向量数据库', desc: '熟悉 Milvus，了解向量检索原理与索引优化。' },
        {
          name: '规格化开发',
          desc: '熟练使用 Claude Code、Cursor 等主流 AI 开发工具（80% 以上编码场景使用 AI 提效）。基于 OpenSpec + SuperPower 的规格化开发范式进行 Vibe Coding。',
        },
      ],
    },
    {
      title: '前端开发',
      items: [
        {
          name: 'Vue 3',
          desc: '熟悉 Vue 生态，了解 Pinia、Vue Router、Vite 等核心生态，能结合 AI 工具开发前端应用，能独立 Vibe Coding 开发个人全栈应用。',
        },
        { name: '微信小程序', desc: '熟悉开发流程、组件化设计与相关生态工具、独立设计过自己的小程序。' },
      ],
    },
    {
      title: '管理相关',
      items: [
        {
          name: '大学管理实践',
          desc: '曾担任学院科技创新协会工作室负责人，独立领导项目，统筹团队组建与项目推进，期间团队规模达 20 人+，主导项目 3 个。',
        },
        {
          name: '项目接口人与导师',
          desc: '具备项目组排期与迭代管理能力，熟悉敏捷开发流程，累计 2 年负责过 54 个迭代版本发版事项并未出过事故；同时拥有指导实习生经验，累计带教 2 名实习生，帮助其快速上手工作。',
        },
        {
          name: '标准化建设与执行落地',
          desc: '部门技术事项标准化输出的先行者及规范文档编写委员会成员，独立主导 3 篇技术/流程规范的制定与落地，推动部门事项高效执行，具备清晰的推进思路。',
        },
      ],
    },
  ],
  // 项目经历（原型 proj 卡片）
  projects: [
    {
      title: '墨堆 · 个人知识站',
      year: '2023',
      desc: '一个以设计与技术为主题的内容站点，包含多级分类、明暗双主题与阅读进度等细节。强调克制的视觉语言与一致的设计 Token。',
      tags: [
        { label: '设计系统', accent: true },
        { label: 'HTML / CSS', accent: false },
        { label: '无障碍', accent: false },
        { label: '暗色模式', accent: false },
      ],
    },
    {
      title: 'Orbit · 设计协作插件',
      year: '2022',
      desc: '面向设计团队的 Figma 插件，把设计稿一键同步为可维护的 Token JSON，并生成前端组件骨架，打通设计到代码的最后一公里。',
      tags: [
        { label: 'Figma API', accent: true },
        { label: 'TypeScript', accent: false },
        { label: 'DX', accent: false },
      ],
    },
    {
      title: 'InsightBoard · 数据看板',
      year: '2020',
      desc: '低代码可视化分析平台，支持拖拽式图表编排与主题换肤。作为前端主程主导渲染性能优化与图表组件抽象。',
      tags: [
        { label: 'React', accent: true },
        { label: '可视化', accent: false },
        { label: '性能优化', accent: false },
      ],
    },
  ],
  // 工作经历（原型 exp 时间线）
  experiences: [
    {
      role: '高级产品设计师 / 设计系统负责人',
      period: '2021.06 — 至今',
      org: '星澜科技 · 设计平台部',
      points: [
        '从 0 到 1 搭建跨 Web / 小程序 / 桌面端的设计系统，覆盖 120+ 组件，推动设计交付效率提升约 40%。',
        '主导设计 Token 体系建设，统一色彩、间距、字体语义，使多团队 UI 一致性达到 95%+。',
        '建立组件文档与可视化 QA 流程，把设计还原度从 78% 拉升至 92%+。',
      ],
    },
    {
      role: '前端工程师',
      period: '2019.03 — 2021.05',
      org: '云栖网络 · 数据中台',
      points: [
        '负责可视化分析平台前端架构，基于 React + TypeScript 重构报表引擎，首屏加载从 4.2s 降至 1.1s。',
        '设计可配置图表组件库，支撑 8 条业务线自助搭建看板，减少重复开发约 60%。',
        '推动前端工程化：引入微前端与按需构建，CI 构建耗时下降 35%。',
      ],
    },
    {
      role: 'UI 设计师（实习 → 转正）',
      period: '2018.07 — 2019.02',
      org: '明远互动 · 用户体验组',
      points: [
        '参与电商 App 改版，负责商品详情与结算流程的体验优化，转化率提升 11%。',
        '输出高保真原型与交互动效规范，建立团队首个可复用的组件草稿库。',
      ],
    },
  ],
};

/** 版本默认名称 */
export const DEFAULT_RESUME_NAME = '默认版本';
