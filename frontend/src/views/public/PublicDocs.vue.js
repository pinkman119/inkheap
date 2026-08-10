import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
// ==================== 路由 ====================
const router = useRouter();
const route = useRoute();
// ==================== 分类数据 ====================
const categories = [
    {
        name: '后端开发',
        children: [
            { name: 'Java后台开发', desc: 'Java核心技术、并发编程与JVM调优', image: 'https://picsum.photos/seed/java/400/240', date: '2025-06-10' },
            { name: 'Spring Boot实战', desc: 'Spring生态、微服务与企业级应用开发', image: 'https://picsum.photos/seed/spring/400/240', date: '2025-06-08' },
            { name: '微服务架构', desc: '服务治理、分布式系统与云原生实践', image: 'https://picsum.photos/seed/microservice/400/240', date: '2025-05-25' },
            { name: '性能调优', desc: '系统瓶颈分析、缓存策略与代码优化', image: 'https://picsum.photos/seed/perf/400/240', date: '2025-05-20' },
            { name: '消息队列', desc: 'Kafka、RabbitMQ异步通信与削峰填谷', image: 'https://picsum.photos/seed/mq/400/240', date: '2025-05-15' },
            { name: '分布式事务', desc: 'Seata、TCC与最终一致性方案实践', image: 'https://picsum.photos/seed/distributed/400/240', date: '2025-05-10' }
        ]
    },
    {
        name: '人工智能',
        children: [
            { name: 'Prompt提示词优化', desc: '提示工程技巧与LLM交互最佳实践', image: 'https://picsum.photos/seed/prompt/400/240', date: '2025-06-12' },
            { name: '大模型应用', desc: 'LLM集成、Agent开发与模型部署', image: 'https://picsum.photos/seed/llm/400/240', date: '2025-06-05' },
            { name: '机器学习基础', desc: '经典算法、特征工程与模型评估', image: 'https://picsum.photos/seed/ml/400/240', date: '2025-05-28' },
            { name: 'RAG技术', desc: '检索增强生成、向量数据库与知识库', image: 'https://picsum.photos/seed/rag/400/240', date: '2025-05-22' },
            { name: '深度学习框架', desc: 'PyTorch、TensorFlow模型训练与调优', image: 'https://picsum.photos/seed/dl/400/240', date: '2025-05-18' },
            { name: 'NLP自然语言处理', desc: '文本分类、命名实体识别与情感分析', image: 'https://picsum.photos/seed/nlp/400/240', date: '2025-05-12' }
        ]
    },
    {
        name: '数据库',
        children: [
            { name: '数据库查询优化', desc: '索引设计、执行计划分析与查询重构', image: 'https://picsum.photos/seed/sqlopt/400/240', date: '2025-06-09' },
            { name: 'SQL性能调优', desc: '慢查询优化、锁机制与事务隔离级别', image: 'https://picsum.photos/seed/sqlperf/400/240', date: '2025-06-01' },
            { name: 'NoSQL实践', desc: 'Redis、MongoDB等非关系型数据库应用', image: 'https://picsum.photos/seed/nosql/400/240', date: '2025-05-26' },
            { name: '数据建模', desc: 'ER建模、范式设计与反范式化策略', image: 'https://picsum.photos/seed/datamodel/400/240', date: '2025-05-20' },
            { name: '分库分表', desc: 'ShardingSphere、水平拆分与读写分离', image: 'https://picsum.photos/seed/shard/400/240', date: '2025-05-14' },
            { name: '数据迁移', desc: '异构数据同步、全量增量迁移方案', image: 'https://picsum.photos/seed/migrate/400/240', date: '2025-05-08' }
        ]
    },
    {
        name: '网络安全',
        children: [
            { name: 'Web安全', desc: 'XSS、CSRF、SQL注入等常见漏洞防护', image: 'https://picsum.photos/seed/websec/400/240', date: '2025-06-11' },
            { name: '渗透测试', desc: '安全评估方法论与渗透工具实战', image: 'https://picsum.photos/seed/pentest/400/240', date: '2025-06-04' },
            { name: '安全架构', desc: '零信任架构、身份认证与授权体系', image: 'https://picsum.photos/seed/secarch/400/240', date: '2025-05-27' },
            { name: '密码学基础', desc: '加密算法、数字签名与安全通信协议', image: 'https://picsum.photos/seed/crypto/400/240', date: '2025-05-21' },
            { name: '代码审计', desc: '静态分析、漏洞扫描与安全编码规范', image: 'https://picsum.photos/seed/audit/400/240', date: '2025-05-16' },
            { name: '应急响应', desc: '入侵检测、日志分析与攻击溯源流程', image: 'https://picsum.photos/seed/incident/400/240', date: '2025-05-10' }
        ]
    },
    {
        name: '前端开发',
        children: [
            { name: 'Vue.js进阶', desc: '组合式API、状态管理与组件设计模式', image: 'https://picsum.photos/seed/vue/400/240', date: '2025-06-07' },
            { name: 'React生态', desc: 'Hooks、Next.js与服务端渲染实践', image: 'https://picsum.photos/seed/react/400/240', date: '2025-06-02' },
            { name: 'CSS深度技巧', desc: '现代布局、动画与响应式设计精要', image: 'https://picsum.photos/seed/css/400/240', date: '2025-05-24' },
            { name: '工程化实践', desc: '构建工具、自动化测试与CI/CD流程', image: 'https://picsum.photos/seed/engineering/400/240', date: '2025-05-19' },
            { name: 'TypeScript精讲', desc: '类型系统、泛型编程与工程化应用', image: 'https://picsum.photos/seed/ts/400/240', date: '2025-05-13' },
            { name: '跨端开发', desc: 'uniapp、Taro多端统一开发方案', image: 'https://picsum.photos/seed/cross/400/240', date: '2025-05-07' }
        ]
    },
    {
        name: '运维部署',
        children: [
            { name: 'Docker容器化', desc: '镜像构建、编排管理与多容器协作', image: 'https://picsum.photos/seed/docker/400/240', date: '2025-06-06' },
            { name: 'CI/CD流水线', desc: '持续集成、自动化部署与发布策略', image: 'https://picsum.photos/seed/cicd/400/240', date: '2025-05-30' },
            { name: 'Linux运维', desc: '系统管理、Shell脚本与性能监控', image: 'https://picsum.photos/seed/linux/400/240', date: '2025-05-23' },
            { name: '监控告警', desc: '日志采集、指标监控与告警体系搭建', image: 'https://picsum.photos/seed/monitor/400/240', date: '2025-05-17' },
            { name: 'K8s编排', desc: 'Pod调度、Service网络与集群运维', image: 'https://picsum.photos/seed/k8s/400/240', date: '2025-05-11' },
            { name: '灾备方案', desc: '异地多活、数据备份与故障恢复演练', image: 'https://picsum.photos/seed/dr/400/240', date: '2025-05-05' }
        ]
    },
    {
        name: '移动开发',
        children: [
            { name: 'Flutter实战', desc: '跨平台UI、状态管理与原生交互', image: 'https://picsum.photos/seed/flutter/400/240', date: '2025-06-03' },
            { name: 'React Native', desc: 'JS引擎桥接、性能优化与热更新', image: 'https://picsum.photos/seed/rn/400/240', date: '2025-05-29' },
            { name: 'iOS开发', desc: 'SwiftUI、Combine与App生命周期', image: 'https://picsum.photos/seed/ios/400/240', date: '2025-05-22' },
            { name: 'Android进阶', desc: 'Jetpack Compose、协程与性能优化', image: 'https://picsum.photos/seed/android/400/240', date: '2025-05-15' },
            { name: '小程序开发', desc: '微信/支付宝小程序架构与云开发', image: 'https://picsum.photos/seed/miniapp/400/240', date: '2025-05-09' },
            { name: '推送与即时通讯', desc: 'WebSocket、MQTT与长连接方案', image: 'https://picsum.photos/seed/im/400/240', date: '2025-05-03' }
        ]
    },
    {
        name: '测试与质量',
        children: [
            { name: '单元测试', desc: 'JUnit、Mockito与TDD开发实践', image: 'https://picsum.photos/seed/unittest/400/240', date: '2025-06-05' },
            { name: '自动化测试', desc: 'Selenium、Playwright端到端测试', image: 'https://picsum.photos/seed/autotest/400/240', date: '2025-05-28' },
            { name: '性能测试', desc: 'JMeter压测、瓶颈定位与容量规划', image: 'https://picsum.photos/seed/perftest/400/240', date: '2025-05-21' },
            { name: '安全测试', desc: '漏洞扫描、渗透报告与修复验证', image: 'https://picsum.photos/seed/sectest/400/240', date: '2025-05-14' },
            { name: '持续测试', desc: '测试左移、流水线集成与质量门禁', image: 'https://picsum.photos/seed/conttest/400/240', date: '2025-05-08' },
            { name: '混沌工程', desc: '故障注入、韧性测试与系统验证', image: 'https://picsum.photos/seed/chaos/400/240', date: '2025-05-02' }
        ]
    }
];
// ==================== 模拟文章数据 ====================
const generateMockArticles = () => {
    const articles = [];
    const baseDate = new Date('2025-06-01');
    const templates = [
        // 后端开发
        {
            title: 'Java并发编程：从synchronized到AQS的深度解析',
            excerpt: '深入探讨Java并发编程的核心机制，从最基础的synchronized关键字开始，逐步剖析JUC包中AQS（AbstractQueuedSynchronizer）的实现原理，帮助开发者理解锁升级、偏向锁、轻量级锁和重量级锁的转换过程，以及如何在实际项目中合理选择并发工具类来提升系统吞吐量。',
            categoryL1: '后端开发',
            categoryL2: 'Java后台开发'
        },
        {
            title: 'Spring Boot 3.x 新特性实战指南',
            excerpt: 'Spring Boot 3.x带来了诸多令人振奋的新特性，包括原生镜像支持、Observability可观测性增强、ProblemDetail错误处理标准化等。本文将逐一介绍这些新特性的使用方式，并通过实际代码示例演示如何在项目中落地这些改进，帮助团队顺利完成从2.x到3.x的迁移工作。',
            categoryL1: '后端开发',
            categoryL2: 'Spring Boot实战'
        },
        {
            title: '微服务间通信的最佳实践：gRPC vs REST',
            excerpt: '在微服务架构中，服务间通信方案的选择直接影响系统的性能和可维护性。本文对比分析了gRPC和REST两种主流通信协议的优缺点，从序列化效率、类型安全、流式传输、生态工具等维度进行量化评估，并给出不同业务场景下的选型建议。',
            categoryL1: '后端开发',
            categoryL2: '微服务架构'
        },
        {
            title: 'JVM调优实战：从Full GC频繁到QPS翻倍',
            excerpt: '记录一次线上JVM调优的完整过程，从发现问题、分析GC日志、定位内存泄漏、调整堆大小和垃圾回收器参数，最终将Full GC频率从每小时15次降低到每天2次，系统QPS提升了120%。详细讲解了jstat、jmap、MAT等工具的使用技巧。',
            categoryL1: '后端开发',
            categoryL2: '性能调优'
        },
        // 人工智能
        {
            title: 'Prompt提示词优化的十大黄金法则',
            excerpt: '好的Prompt是获取高质量AI输出的关键。本文总结了十条经过大量实验验证的Prompt优化法则，涵盖角色设定、分步引导、Few-shot示例、思维链（Chain-of-Thought）、输出格式约束等核心技巧，帮助开发者和普通用户最大化发挥大语言模型的潜力。',
            categoryL1: '人工智能',
            categoryL2: 'Prompt提示词优化'
        },
        {
            title: 'LangChain + RAG：构建企业级知识库问答系统',
            excerpt: '详细介绍如何使用LangChain框架结合RAG（检索增强生成）技术构建企业级知识库问答系统。从文档加载、文本分割、向量化存储、相似度检索到最终答案生成，覆盖完整的RAG pipeline实现，并讨论了分块策略、重排序（Re-ranking）等优化手段。',
            categoryL1: '人工智能',
            categoryL2: 'RAG技术'
        },
        {
            title: '从零训练一个中文情感分析模型',
            excerpt: '手把手教你使用PyTorch和HuggingFace Transformers从零训练一个中文情感分析模型。包括数据采集与清洗、分词器训练、模型选型（BERT/RoBERTa）、微调策略、评估指标以及模型部署上线，完整覆盖NLP项目的全生命周期。',
            categoryL1: '人工智能',
            categoryL2: '机器学习基础'
        },
        // 数据库
        {
            title: 'MySQL慢查询优化的系统性方法论',
            excerpt: '面对MySQL慢查询问题，很多开发者习惯于临时加索引解决。本文提出了一套系统性的慢查询优化方法论，从EXPLAIN执行计划分析、索引设计原则、SQL重写技巧、表结构优化、参数调优五个维度，建立起完整的数据库性能优化知识体系。',
            categoryL1: '数据库',
            categoryL2: '数据库查询优化'
        },
        {
            title: 'Redis缓存设计与高可用架构',
            excerpt: 'Redis作为最流行的缓存中间件，其设计和使用方式直接影响系统性能。本文深入讨论缓存穿透、缓存击穿、缓存雪崩三大经典问题的解决方案，介绍Redis Sentinel和Cluster的高可用架构设计，以及缓存与数据库双写一致性的最佳实践。',
            categoryL1: '数据库',
            categoryL2: 'NoSQL实践'
        },
        {
            title: '数据库索引优化：B+树原理与实战',
            excerpt: '理解B+树的数据结构和操作原理是做好索引优化的基础。本文从B+树的插入、分裂、查找过程讲起，结合MySQL InnoDB引擎的聚簇索引和二级索引设计，通过大量实例演示如何设计高效索引、避免索引失效，以及覆盖索引、索引下推等高级优化技巧。',
            categoryL1: '数据库',
            categoryL2: 'SQL性能调优'
        },
        // 网络安全
        {
            title: 'OWASP Top 10 2025：Web应用安全防护指南',
            excerpt: 'OWASP Top 10是Web应用安全领域的权威指南。本文逐条解析最新版Top 10安全风险，包括失效的访问控制、加密失败、注入攻击、不安全的设计等，并结合Spring Security、JWT等实际技术栈，给出每类风险的防护方案和代码示例。',
            categoryL1: '网络安全',
            categoryL2: 'Web安全'
        },
        {
            title: '渗透测试入门：从信息收集到漏洞利用',
            excerpt: '面向初学者的渗透测试入门教程，按照标准渗透测试流程，从被动信息收集、主动扫描、漏洞识别、漏洞利用到后渗透阶段，系统性地讲解每个阶段使用的工具（Nmap、Burp Suite、Metasploit）和技术方法，帮助安全爱好者建立完整的渗透测试知识框架。',
            categoryL1: '网络安全',
            categoryL2: '渗透测试'
        },
        // 前端开发
        {
            title: 'Vue 3 Composition API 高级模式与最佳实践',
            excerpt: 'Composition API为Vue 3带来了全新的代码组织方式。本文总结了一系列高级使用模式，包括可组合函数（Composables）的设计原则、响应式数据的性能优化、provide/inject的状态共享模式、自定义ref的实现，以及如何在大型项目中构建可复用的逻辑层。',
            categoryL1: '前端开发',
            categoryL2: 'Vue.js进阶'
        },
        {
            title: 'CSS Container Queries：组件级响应式设计新时代',
            excerpt: 'Container Queries（容器查询）的广泛支持标志着响应式设计进入新时代。本文详细介绍Container Queries的语法和使用场景，对比与传统Media Queries的差异，演示如何基于组件自身容器尺寸而非视口尺寸来实现真正的组件级响应式设计。',
            categoryL1: '前端开发',
            categoryL2: 'CSS深度技巧'
        },
        // 运维部署
        {
            title: 'Docker Compose 实战：一键部署全栈应用',
            excerpt: '使用Docker Compose可以优雅地管理多容器应用。本文以部署一个包含Vue前端、Spring Boot后端、MySQL数据库、Redis缓存的典型全栈应用为例，详细讲解docker-compose.yml的编写技巧、网络配置、数据卷管理、健康检查以及环境变量的最佳实践。',
            categoryL1: '运维部署',
            categoryL2: 'Docker容器化'
        },
        {
            title: 'GitHub Actions 自动化CI/CD流水线搭建',
            excerpt: '从零搭建一套完整的GitHub Actions CI/CD流水线，覆盖代码检查、单元测试、构建打包、Docker镜像制作、自动部署到云服务器等环节。包含多环境部署策略、密钥管理、缓存优化、Matrix构建等进阶技巧，让团队实现真正的持续集成与持续交付。',
            categoryL1: '运维部署',
            categoryL2: 'CI/CD流水线'
        }
    ];
    templates.forEach((tmpl, idx) => {
        const daysAgo = Math.floor(idx * 5 + Math.random() * 3);
        const date = new Date(baseDate);
        date.setDate(date.getDate() + daysAgo);
        articles.push({
            id: `article-${idx + 1}`,
            title: tmpl.title,
            excerpt: tmpl.excerpt,
            content: tmpl.excerpt + '\n\n' + '这是文章的详细内容部分，包含了更多的技术细节、代码示例和实践经验分享。在实际项目中，这部分内容会更加丰富，涵盖问题背景、解决思路、具体实现步骤和最终效果评估。',
            categoryL1: tmpl.categoryL1,
            categoryL2: tmpl.categoryL2,
            publishedAt: date.toISOString().split('T')[0]
        });
    });
    return articles;
};
// ==================== 响应式状态 ====================
const loading = ref(true);
const allArticles = ref([]);
const searchKeyword = ref('');
const isSearchMode = ref(false);
// 分类选中状态
const activeL1 = ref(null);
const activeL2 = ref(null);
const expandedL1 = ref(new Set());
// 懒加载相关
const pageSize = 6;
const currentPage = ref(1);
const blogListRef = ref(null);
const loadMoreRef = ref(null);
let intersectionObserver = null;
// ==================== 计算属性 ====================
/** 根据分类筛选后的文章列表 */
const filteredArticles = computed(() => {
    let result = allArticles.value;
    if (isSearchMode.value && searchKeyword.value.trim()) {
        const keyword = searchKeyword.value.trim().toLowerCase();
        result = result.filter(a => a.title.toLowerCase().includes(keyword) ||
            a.excerpt.toLowerCase().includes(keyword) ||
            a.categoryL1.toLowerCase().includes(keyword) ||
            a.categoryL2.toLowerCase().includes(keyword));
    }
    if (activeL1.value) {
        result = result.filter(a => a.categoryL1 === activeL1.value);
        if (activeL2.value) {
            result = result.filter(a => a.categoryL2 === activeL2.value);
        }
    }
    // 按时间倒序
    return result.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
});
/** 懒加载后当前展示的文章 */
const displayedArticles = computed(() => {
    return filteredArticles.value.slice(0, currentPage.value * pageSize);
});
/** 是否还有更多文章可加载 */
const hasMore = computed(() => {
    return displayedArticles.value.length < filteredArticles.value.length;
});
// ==================== 分类相关方法 ====================
const getL1Count = (l1Name) => {
    return allArticles.value.filter(a => a.categoryL1 === l1Name).length;
};
const getL2Count = (l1Name, l2Name) => {
    return allArticles.value.filter(a => a.categoryL1 === l1Name && a.categoryL2 === l2Name).length;
};
const l2AreaRef = ref(null);
const groupRefs = {};
const setGroupRef = (name, el) => {
    groupRefs[name] = el;
};
const toggleL1 = (name) => {
    expandedL1.value = new Set([name]);
    selectCategory(name, null);
    nextTick(() => {
        const el = groupRefs[name];
        const container = l2AreaRef.value;
        if (el && container) {
            const elTop = el.getBoundingClientRect().top;
            const containerTop = container.getBoundingClientRect().top;
            const target = container.scrollTop + (elTop - containerTop) - 8;
            container.scrollTo({ top: target, behavior: 'smooth' });
        }
    });
};
const selectAllCategories = () => {
    selectCategory(null);
    nextTick(() => {
        l2AreaRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
    });
};
const selectCategory = (l1, l2 = null) => {
    activeL1.value = l1;
    activeL2.value = l2;
    resetPagination();
};
// ==================== 搜索相关方法 ====================
const handleSearch = () => {
    const keyword = searchKeyword.value.trim();
    if (keyword) {
        isSearchMode.value = true;
        activeL1.value = null;
        activeL2.value = null;
        resetPagination();
    }
};
const clearSearch = () => {
    searchKeyword.value = '';
    isSearchMode.value = false;
    activeL1.value = null;
    activeL2.value = null;
    resetPagination();
};
/** 关键词高亮 */
const highlightKeyword = (text) => {
    if (!searchKeyword.value.trim())
        return text;
    const keyword = searchKeyword.value.trim();
    // 转义正则特殊字符
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="highlight-mark">$1</mark>');
};
// ==================== 懒加载 ====================
const resetPagination = () => {
    currentPage.value = 1;
};
const loadMore = () => {
    if (hasMore.value) {
        currentPage.value++;
    }
};
const setupIntersectionObserver = () => {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
    }
    intersectionObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore.value) {
            loadMore();
        }
    }, { rootMargin: '0px' });
};
const observeLoadMore = () => {
    if (loadMoreRef.value && intersectionObserver) {
        intersectionObserver.observe(loadMoreRef.value);
    }
};
// ==================== 工具方法 ====================
const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};
const formatCardDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};
const goToArticle = (id) => {
    const resolved = router.resolve(`/articles/${id}`);
    window.open(resolved.href, '_blank');
};
// ==================== 回到顶部 ====================
const showBackToTop = ref(false);
const handlePageScroll = () => {
    showBackToTop.value = window.scrollY > 400;
};
const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
// ==================== 生命周期 ====================
onMounted(async () => {
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 600));
    allArticles.value = generateMockArticles();
    loading.value = false;
    // 默认展开第一个一级分类
    if (categories.length > 0) {
        expandedL1.value = new Set([categories[0].name]);
    }
    // 设置懒加载观察器
    setupIntersectionObserver();
    await nextTick();
    observeLoadMore();
    // 监听页面滚动
    window.addEventListener('scroll', handlePageScroll);
});
// 当 loadMoreRef 变化时重新观察
watch(loadMoreRef, () => {
    observeLoadMore();
});
// 当 hasMore 变化时重新观察（确保 sentinel 可见时能触发）
watch(hasMore, async () => {
    await nextTick();
    observeLoadMore();
});
onBeforeUnmount(() => {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
    }
    window.removeEventListener('scroll', handlePageScroll);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box__input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-item']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-group']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__image']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__image']} */ ;
/** @type {__VLS_StyleScopedClasses['search-mode-banner__back']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card']} */ ;
/** @type {__VLS_StyleScopedClasses['back-to-top']} */ ;
/** @type {__VLS_StyleScopedClasses['back-to-top']} */ ;
/** @type {__VLS_StyleScopedClasses['back-to-top']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__body']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-list']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-header']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-content']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-page']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-list']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__title']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "notes-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-header__search" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    ...{ class: "search-box__icon" },
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "11",
    cy: "11",
    r: "8",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "m21 21-4.35-4.35",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeyup: (__VLS_ctx.handleSearch) },
    value: (__VLS_ctx.searchKeyword),
    type: "text",
    ...{ class: "search-box__input" },
    placeholder: "搜索文章...",
});
if (__VLS_ctx.searchKeyword) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSearch) },
        ...{ class: "search-box__clear" },
        'aria-label': "清除搜索",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "category-bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "category-bar__body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "category-bar__l1-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.selectAllCategories();
        } },
    ...{ class: "category-bar__l1-item" },
    ...{ class: ({ 'category-bar__l1-item--active': __VLS_ctx.activeL1 === null }) },
});
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleL1(cat.name);
            } },
        key: (cat.name),
        ...{ class: "category-bar__l1-item" },
        ...{ class: ({ 'category-bar__l1-item--active': __VLS_ctx.activeL1 === cat.name && __VLS_ctx.activeL2 === null }) },
    });
    (cat.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "category-bar__l2-area" },
    ref: "l2AreaRef",
});
/** @type {typeof __VLS_ctx.l2AreaRef} */ ;
for (const [cat] of __VLS_getVForSourceType((__VLS_ctx.categories))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (cat.name),
        ref: (el => __VLS_ctx.setGroupRef(cat.name, el)),
        ...{ class: "category-bar__l2-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: "category-bar__l2-group-title" },
    });
    (cat.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "category-bar__l2-list" },
    });
    for (const [sub] of __VLS_getVForSourceType((cat.children))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.selectCategory(cat.name, sub.name);
                } },
            key: (sub.name),
            ...{ class: "sub-category-card" },
            ...{ class: ({ 'sub-category-card--active': __VLS_ctx.activeL1 === cat.name && __VLS_ctx.activeL2 === sub.name }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub-category-card__image" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (sub.image),
            alt: (sub.name),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "sub-category-card__text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub-category-card__date" },
        });
        (__VLS_ctx.formatCardDate(sub.date));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub-category-card__title" },
        });
        (sub.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub-category-card__desc" },
        });
        (sub.desc);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "blog-list-section" },
});
if (__VLS_ctx.isSearchMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "search-mode-banner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.searchKeyword);
    (__VLS_ctx.filteredArticles.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSearch) },
        ...{ class: "search-mode-banner__back" },
    });
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-hint__spinner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else if (__VLS_ctx.displayedArticles.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.isSearchMode ? '未找到匹配的文章' : '该分类下暂无文章');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "blog-list" },
        ref: "blogListRef",
    });
    /** @type {typeof __VLS_ctx.blogListRef} */ ;
    for (const [article] of __VLS_getVForSourceType((__VLS_ctx.displayedArticles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.displayedArticles.length === 0))
                        return;
                    __VLS_ctx.goToArticle(article.id);
                } },
            key: (article.id),
            ...{ class: "blog-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "blog-card__meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "blog-card__category" },
        });
        (article.categoryL2 || article.categoryL1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
            ...{ class: "blog-card__date" },
        });
        (__VLS_ctx.formatDate(article.publishedAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "blog-card__title" },
        });
        if (__VLS_ctx.isSearchMode) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightKeyword(article.title)) }, null, null);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (article.title);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "blog-card__excerpt" },
        });
        if (__VLS_ctx.isSearchMode) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.highlightKeyword(article.excerpt)) }, null, null);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (article.excerpt);
        }
    }
    if (__VLS_ctx.hasMore) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "load-more-sentinel" },
            ref: "loadMoreRef",
        });
        /** @type {typeof __VLS_ctx.loadMoreRef} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "state-hint__spinner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else if (__VLS_ctx.displayedArticles.length > __VLS_ctx.pageSize) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "state-hint state-hint--end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.scrollToTop) },
    ...{ class: "back-to-top" },
    ...{ class: ({ 'back-to-top--visible': __VLS_ctx.showBackToTop }) },
    'aria-label': "回到顶部",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2.5",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
    points: "18 15 12 9 6 15",
});
/** @type {__VLS_StyleScopedClasses['notes-page']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-content']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-header']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-header__search']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box__input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-body']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__body']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-list']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-item']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l1-item']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-area']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-group']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-group-title']} */ ;
/** @type {__VLS_StyleScopedClasses['category-bar__l2-list']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__image']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__text']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__date']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-category-card__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-list-section']} */ ;
/** @type {__VLS_StyleScopedClasses['search-mode-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['search-mode-banner__back']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint__spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-list']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__category']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__date']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['blog-card__excerpt']} */ ;
/** @type {__VLS_StyleScopedClasses['load-more-sentinel']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint__spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['state-hint--end']} */ ;
/** @type {__VLS_StyleScopedClasses['back-to-top']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            categories: categories,
            loading: loading,
            searchKeyword: searchKeyword,
            isSearchMode: isSearchMode,
            activeL1: activeL1,
            activeL2: activeL2,
            pageSize: pageSize,
            blogListRef: blogListRef,
            loadMoreRef: loadMoreRef,
            filteredArticles: filteredArticles,
            displayedArticles: displayedArticles,
            hasMore: hasMore,
            l2AreaRef: l2AreaRef,
            setGroupRef: setGroupRef,
            toggleL1: toggleL1,
            selectAllCategories: selectAllCategories,
            selectCategory: selectCategory,
            handleSearch: handleSearch,
            clearSearch: clearSearch,
            highlightKeyword: highlightKeyword,
            formatDate: formatDate,
            formatCardDate: formatCardDate,
            goToArticle: goToArticle,
            showBackToTop: showBackToTop,
            scrollToTop: scrollToTop,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
