<template>
  <div class="notes-page">
    <div class="notes-content">
      <!-- 页面头部：标题 + 搜索栏 -->
      <header class="notes-header">
      <div class="notes-header__title">
        <!-- TODO：看着有点突兀，暂时没想好怎么调整 -->
        <!-- <div class="title-text">文档</div> -->
      </div>
      <div class="notes-header__search">
        <div class="search-box">
          <svg class="search-box__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-box__input"
            placeholder="搜索文章..."
            @keyup.enter="handleSearch"
          />
          <button
            v-if="searchKeyword"
            class="search-box__clear"
            @click="clearSearch"
            aria-label="清除搜索"
          >×</button>
        </div>
      </div>
    </header>

    <!-- 主体区域：分类导航 + 博客列表（垂直布局） -->
    <div class="notes-body">
      <!-- 上方分类导航 -->
      <div class="category-bar">
        <!-- 一级分类在左、二级分类在右 -->
        <div class="category-bar__body">
          <div class="category-bar__l1-list">
            <button
              class="category-bar__l1-item"
              :class="{ 'category-bar__l1-item--active': activeL1 === null }"
              @click="selectAllCategories()"
            >
              全部
            </button>
            <button
              v-for="cat in categories"
              :key="cat.name"
              class="category-bar__l1-item"
              :class="{ 'category-bar__l1-item--active': activeL1 === cat.name && activeL2 === null }"
              @click="toggleL1(cat.name)"
            >
              {{ cat.name }}
            </button>
          </div>

          <div class="category-bar__l2-area" ref="l2AreaRef">
            <div
              v-for="cat in categories"
              :key="cat.name"
              :ref="el => setGroupRef(cat.name, el)"
              class="category-bar__l2-group"
            >
              <h4 class="category-bar__l2-group-title">{{ cat.name }}</h4>
              <div class="category-bar__l2-list">
                <button
                  v-for="sub in cat.children"
                  :key="sub.name"
                  class="sub-category-card"
                  :class="{ 'sub-category-card--active': activeL1 === cat.name && activeL2 === sub.name }"
                  @click="selectCategory(cat.name, sub.name)"
                >
                  <span class="sub-category-card__image">
                    <img :src="sub.image" :alt="sub.name" />
                  </span>
                  <div class="sub-category-card__text">
                    <span class="sub-category-card__date">{{ formatCardDate(sub.date) }}</span>
                    <span class="sub-category-card__title">{{ sub.name }}</span>
                    <span class="sub-category-card__desc">{{ sub.desc }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下方博客列表 -->
      <section class="blog-list-section">
        <!-- 搜索模式提示 -->
        <div v-if="isSearchMode" class="search-mode-banner">
          <span>搜索 "{{ searchKeyword }}" 的结果，共 {{ filteredArticles.length }} 篇</span>
          <button class="search-mode-banner__back" @click="clearSearch">返回全部文章</button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="state-hint">
          <div class="state-hint__spinner"></div>
          <span>正在加载...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="displayedArticles.length === 0" class="state-hint">
          <p>{{ isSearchMode ? '未找到匹配的文章' : '该分类下暂无文章' }}</p>
        </div>

        <!-- 文章列表 -->
        <div v-else class="blog-list" ref="blogListRef">
          <article
            v-for="article in displayedArticles"
            :key="article.id"
            class="blog-card"
            @click="goToArticle(article.id)"
          >
            <div class="blog-card__meta">
              <span class="blog-card__category">{{ article.categoryL2 || article.categoryL1 }}</span>
              <time class="blog-card__date">{{ formatDate(article.publishedAt) }}</time>
            </div>
            <h2 class="blog-card__title">
              <span v-if="isSearchMode" v-html="highlightKeyword(article.title)"></span>
              <span v-else>{{ article.title }}</span>
            </h2>
            <p class="blog-card__excerpt">
              <span v-if="isSearchMode" v-html="highlightKeyword(article.excerpt)"></span>
              <span v-else>{{ article.excerpt }}</span>
            </p>
          </article>

          <!-- 加载更多指示器 -->
          <div v-if="hasMore" class="load-more-sentinel" ref="loadMoreRef">
            <div class="state-hint__spinner"></div>
            <span>加载更多...</span>
          </div>

          <!-- 已全部加载 -->
          <div v-else-if="displayedArticles.length > pageSize" class="state-hint state-hint--end">
            <span>— 已加载全部文章 —</span>
          </div>
        </div>
      </section>
    </div>
    </div>

    <!-- 回到顶部 -->
    <button
      class="back-to-top"
      :class="{ 'back-to-top--visible': showBackToTop }"
      @click="scrollToTop"
      aria-label="回到顶部"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// ==================== 类型定义 ====================

interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  categoryL1: string;
  categoryL2: string;
  publishedAt: string;
}

interface SubCategory {
  name: string;
  desc: string;
  image: string;
  date: string;
}

interface CategoryNode {
  name: string;
  children: SubCategory[];
}

// ==================== 路由 ====================

const router = useRouter();
const route = useRoute();

// ==================== 分类数据 ====================

const categories: CategoryNode[] = [
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

const generateMockArticles = (): BlogArticle[] => {
  const articles: BlogArticle[] = [];
  const baseDate = new Date('2025-06-01');

  const templates: Array<{
    title: string;
    excerpt: string;
    categoryL1: string;
    categoryL2: string;
  }> = [
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
const allArticles = ref<BlogArticle[]>([]);
const searchKeyword = ref('');
const isSearchMode = ref(false);

// 分类选中状态
const activeL1 = ref<string | null>(null);
const activeL2 = ref<string | null>(null);
const expandedL1 = ref<Set<string>>(new Set());

// 懒加载相关
const pageSize = 6;
const currentPage = ref(1);
const blogListRef = ref<HTMLElement | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);
let intersectionObserver: IntersectionObserver | null = null;

// ==================== 计算属性 ====================

/** 根据分类筛选后的文章列表 */
const filteredArticles = computed(() => {
  let result = allArticles.value;

  if (isSearchMode.value && searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    result = result.filter(
      a =>
        a.title.toLowerCase().includes(keyword) ||
        a.excerpt.toLowerCase().includes(keyword) ||
        a.categoryL1.toLowerCase().includes(keyword) ||
        a.categoryL2.toLowerCase().includes(keyword)
    );
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

const getL1Count = (l1Name: string): number => {
  return allArticles.value.filter(a => a.categoryL1 === l1Name).length;
};

const getL2Count = (l1Name: string, l2Name: string): number => {
  return allArticles.value.filter(a => a.categoryL1 === l1Name && a.categoryL2 === l2Name).length;
};

const l2AreaRef = ref<HTMLElement | null>(null);
const groupRefs: Record<string, HTMLElement | null> = {};

const setGroupRef = (name: string, el: any) => {
  groupRefs[name] = el as HTMLElement | null;
};

const toggleL1 = (name: string) => {
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

const selectCategory = (l1: string | null, l2: string | null = null) => {
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
const highlightKeyword = (text: string): string => {
  if (!searchKeyword.value.trim()) return text;
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

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        loadMore();
      }
    },
    { rootMargin: '0px' }
  );
};

const observeLoadMore = () => {
  if (loadMoreRef.value && intersectionObserver) {
    intersectionObserver.observe(loadMoreRef.value);
  }
};

// ==================== 工具方法 ====================

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCardDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const goToArticle = (id: string) => {
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
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.notes-page {
  background: #ffffff;
  min-height: 100vh;
  margin: -2rem 0;
  padding: 1.5rem 2rem;
}

.notes-content {
  max-width: 1240px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 20px;
  /* box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 2px 4px rgba(0, 0, 0, 0.02),
    0 12px 40px rgba(0, 0, 0, 0.04); */
  padding: 1.25rem 3rem;
}

/* ==================== 页面头部 ==================== */
.notes-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.15rem;
  padding-bottom: 0.25rem;
  border-bottom: 2px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.notes-header__title h1 {
  font-size: 3.05rem;
  font-weight: 800;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', serif;
  margin-bottom: 0.35rem;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #0f172a 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.notes-header__search {
  margin-bottom: 0.55rem;
}

.subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
  font-weight: 400;
}

/* ==================== 搜索框 ==================== */
.search-box {
  display: flex;
  align-items: center;
  background: #f4f4f5;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.65rem 1.15rem;
  gap: 0.6rem;
  transition: all 0.25s ease;
  min-width: 300px;
}

.search-box:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
  background: #fff;
}

.search-box__icon {
  width: 20px;
  height: 20px;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-box__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #1e293b;
  font-family: inherit;
}

.search-box__input::placeholder {
  color: #94a3b8;
}

.search-box__clear {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.35rem;
  color: #94a3b8;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.search-box__clear:hover {
  color: #475569;
}

/* ==================== 主体区域 ==================== */
.notes-body {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

/* ==================== 分类导航栏 ==================== */
.category-bar {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #f4f4f5;
  border: 1.5px solid #e8ecf1;
  border-radius: 16px;
  padding: 1.5rem;
}

/* 一级在左、二级在右 */
.category-bar__body {
  display: flex;
  gap: 1.75rem;
}

.category-bar__l1-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 130px;
  flex-shrink: 0;
  border-right: 1.5px solid #e8ecf1;
  padding-right: 1.5rem;
}

.category-bar__l1-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.95rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  font-size: 1.15rem;
  font-weight: 500;
  color: #64748b;
  transition: all 0.18s ease;
  font-family: inherit;
  text-align: left;
}

.category-bar__l1-item:hover {
  background: rgba(59, 130, 246, 0.06);
  color: #3b82f6;
}

.category-bar__l1-item--active {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #3b82f6;
}

.category-bar__l2-area {
  flex: 1;
  min-height: 100px;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 0.5rem;
  scroll-behavior: smooth;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
}

.category-bar__l2-group {
  margin-bottom: 1.5rem;
}

.category-bar__l2-group:last-child {
  margin-bottom: 0;
}

.category-bar__l2-group-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #334155;
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1.5px solid #e8ecf1;
  letter-spacing: 0.01em;
}

.category-bar__l2-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

/* 二级分类卡片 — 图片在上、文字在下 */
.sub-category-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1.5px solid #e8ecf1;
  border-radius: var(--radius-3xl);
  background: #fff;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  text-align: left;
  overflow: hidden;
  padding: 0;
}

.sub-category-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.sub-category-card--active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.04);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.sub-category-card__image {
  width: 100%;
  aspect-ratio: 5 / 3;
  overflow: hidden;
  border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;
}

.sub-category-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.sub-category-card:hover .sub-category-card__image img {
  transform: scale(1.05);
}

.sub-category-card__text {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
  padding: 0.9rem 1rem 1rem;
}

.sub-category-card__date {
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}

.sub-category-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.35;
}

.sub-category-card__desc {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.5;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ==================== 搜索模式横幅 ==================== */
.search-mode-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.25rem;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 14px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  color: #2563eb;
}

.search-mode-banner__back {
  background: none;
  border: 1.5px solid #2563eb;
  color: #2563eb;
  padding: 0.45rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
  font-family: inherit;
}

.search-mode-banner__back:hover {
  background: #2563eb;
  color: #fff;
}

/* ==================== 博客列表 ==================== */
.blog-list-section {
  min-height: 400px;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ==================== 博客卡片 ==================== */
.blog-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.75rem 2rem;
  border: 1.5px solid #e8ecf1;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.blog-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
  border-radius: 4px 0 0 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.blog-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.07);
  border-color: #cbd5e1;
}

.blog-card:hover::before {
  opacity: 1;
}

.blog-card__meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

.blog-card__category {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  background: #eff6ff;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #2563eb;
}

.blog-card__date {
  font-size: 0.88rem;
  color: #94a3b8;
}

.blog-card__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.65rem;
  line-height: 1.45;
}

.blog-card__excerpt {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.75;
  margin: 0;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ==================== 关键词高亮 ==================== */
:deep(.highlight-mark) {
  background: linear-gradient(180deg, transparent 60%, #fde68a 60%);
  color: inherit;
  padding: 0 0.1em;
  border-radius: 2px;
}

/* ==================== 加载/空状态 ==================== */
.state-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.75rem;
  padding: 4rem 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.state-hint--end {
  padding: 1.5rem 0;
  font-size: 0.85rem;
}

.state-hint__spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid #e8ecf1;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.load-more-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0;
  color: #94a3b8;
  font-size: 0.85rem;
}
.title-text{
  font-size:35px;
  font-weight:600;
}
/* ==================== 回到顶部按钮 ==================== */
.back-to-top {
  position: fixed;
  right: 2rem;
  bottom: 2.5rem;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(12px);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 50;
}

.back-to-top svg {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.back-to-top:hover {
  border-color: #3b82f6;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.2);
}

.back-to-top:hover svg {
  color: #3b82f6;
}

.back-to-top--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* ==================== 响应式 ==================== */
@media (max-width: 860px) {
  .category-bar__body {
    flex-direction: column;
  }

  .category-bar__l1-list {
    flex-direction: row;
    flex-wrap: wrap;
    border-right: none;
    border-bottom: 1.5px solid #e8ecf1;
    padding-right: 0;
    padding-bottom: 1rem;
    min-width: unset;
  }

  .category-bar__l1-item--active {
    box-shadow: none;
  }

  .notes-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-box {
    min-width: 100%;
  }

  .blog-card {
    padding: 1.25rem 1.5rem;
  }
}

@media (max-width: 640px) {
  .notes-content {
    padding: 1.5rem;
    border-radius: 14px;
  }

  .notes-page {
    padding: 1rem 0.75rem;
  }

  .category-bar {
    padding: 1.1rem;
  }

  .category-bar__l2-list {
    grid-template-columns: 1fr;
  }

  .notes-header__title h1 {
    font-size: 1.6rem;
  }

  .blog-card__title {
    font-size: 1.05rem;
  }
}
</style>
<style>
/* ==================== 暗色模式 ==================== */
.dark-mode .notes-page {
  background: #1c2128;
}

.dark-mode .notes-content {
  background: #22272e;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04), 0 12px 40px rgba(0, 0, 0, 0.3);
}

/* 头部 */
.dark-mode .notes-header {
  border-bottom-color: #2d333b;
}

.dark-mode .notes-header__title h1 {
  background: linear-gradient(135deg, #e6edf3 0%, #58a6ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
}

.dark-mode .subtitle {
  color: #8b949e;
}

/* 搜索框 */
.dark-mode .search-box {
  background: #2d333b;
  border-color: #373e47;
}

.dark-mode .search-box:focus-within {
  border-color: #58a6ff;
  box-shadow: 0 0 0 4px rgba(88, 166, 255, 0.12);
  background: #22272e;
}

.dark-mode .search-box__icon {
  color: #6e7681;
}

.dark-mode .search-box__input {
  color: #c9d1d9;
}

.dark-mode .search-box__input::placeholder {
  color: #6e7681;
}

.dark-mode .search-box__clear {
  color: #6e7681;
}

.dark-mode .search-box__clear:hover {
  color: #c9d1d9;
}

/* 分类导航栏 */
.dark-mode .category-bar {
  background: #2d333b;
  border-color: #373e47;
}

.dark-mode .category-bar__l1-list {
  border-right-color: #373e47;
}

.dark-mode .category-bar__l1-item {
  color: #8b949e;
}

.dark-mode .category-bar__l1-item:hover {
  background: rgba(88, 166, 255, 0.1);
  color: #58a6ff;
}

.dark-mode .category-bar__l1-item--active {
  background: rgba(88, 166, 255, 0.15);
  color: #58a6ff;
  box-shadow: inset 3px 0 0 #58a6ff;
}

/* 分组标题 */
.dark-mode .category-bar__l2-group-title {
  color: #c9d1d9;
  border-bottom-color: #373e47;
}

/* 二级分类卡片 */
.dark-mode .sub-category-card {
  background: #2d333b;
  border-color: #373e47;
}

.dark-mode .sub-category-card:hover {
  border-color: #58a6ff;
  box-shadow: 0 4px 16px rgba(88, 166, 255, 0.12);
}

.dark-mode .sub-category-card--active {
  border-color: #58a6ff;
  background: rgba(88, 166, 255, 0.08);
  box-shadow: 0 0 0 1px rgba(88, 166, 255, 0.25);
}

.dark-mode .sub-category-card__date {
  color: #6e7681;
}

.dark-mode .sub-category-card__title {
  color: #c9d1d9;
}

.dark-mode .sub-category-card__desc {
  color: #6e7681;
}

/* 搜索模式横幅 */
.dark-mode .search-mode-banner {
  background: rgba(88, 166, 255, 0.08);
  border-color: rgba(88, 166, 255, 0.2);
  color: #58a6ff;
}

.dark-mode .search-mode-banner__back {
  border-color: #58a6ff;
  color: #58a6ff;
}

.dark-mode .search-mode-banner__back:hover {
  background: #58a6ff;
  color: #fff;
}

/* 博客卡片 */
.dark-mode .blog-card {
  background: #2d333b;
  border-color: #373e47;
}

.dark-mode .blog-card:hover {
  border-color: #444c56;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.dark-mode .blog-card::before {
  background: linear-gradient(180deg, #58a6ff, #8b5cf6);
}

.dark-mode .blog-card__category {
  background: rgba(88, 166, 255, 0.12);
  color: #58a6ff;
}

.dark-mode .blog-card__date {
  color: #6e7681;
}

.dark-mode .blog-card__title {
  color: #c9d1d9;
}

.dark-mode .blog-card__excerpt {
  color: #8b949e;
}

/* 关键词高亮 */
.dark-mode .highlight-mark {
  background: linear-gradient(180deg, transparent 60%, rgba(253, 230, 138, 0.35) 60%);
}

/* 加载状态 */
.dark-mode .state-hint {
  color: #6e7681;
}

.dark-mode .state-hint__spinner {
  border-color: #373e47;
  border-top-color: #58a6ff;
}

.dark-mode .load-more-sentinel {
  color: #6e7681;
}

/* 滚动条 */
.dark-mode .category-bar__l2-area::-webkit-scrollbar {
  width: 6px;
}

.dark-mode .category-bar__l2-area::-webkit-scrollbar-track {
  background: transparent;
}

.dark-mode .category-bar__l2-area::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

.dark-mode .category-bar__l2-area::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 响应式暗色 */
@media (max-width: 860px) {
  .dark-mode .category-bar__l1-list {
    border-bottom-color: #373e47;
  }
}

/* 回到顶部暗色 */
.dark-mode .back-to-top {
  background: #2d333b;
  border-color: #444c56;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dark-mode .back-to-top svg {
  color: #8b949e;
}

.dark-mode .back-to-top:hover {
  border-color: #58a6ff;
  box-shadow: 0 6px 20px rgba(88, 166, 255, 0.2);
}

.dark-mode .back-to-top:hover svg {
  color: #58a6ff;
}
</style>
