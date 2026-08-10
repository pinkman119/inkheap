<template>
  <div class="resume-page">
    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadResume" class="btn btn-secondary">重试</button>
    </div>

    <div v-else-if="resume" class="resume-layout">
      <!-- 左侧栏：个人信息简洁 + 教育 + 技能 -->
      <aside class="resume-left">
        <!-- 个人信息（简洁版） -->
        <div class="left-card">
          <div class="profile-compact">
            <div class="profile-compact__avatar">
              <span class="profile-compact__initials">{{ getInitials(resume.fullName) }}</span>
            </div>
            <h2 class="profile-compact__name">{{ resume.fullName }}</h2>
            <p class="profile-compact__title">{{ resume.title }}</p>
          </div>

          <div class="profile-compact__contact">
            <div v-if="resume.email" class="contact-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>{{ resume.email }}</span>
            </div>
            <div v-if="resume.phone" class="contact-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>{{ resume.phone }}</span>
            </div>
            <div v-if="resume.location" class="contact-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{{ resume.location }}</span>
            </div>
          </div>

          <div v-if="resume.github || resume.blog" class="profile-compact__links">
            <a v-if="resume.github" :href="resume.github" target="_blank" rel="noopener" class="inline-link">GitHub</a>
            <a v-if="resume.blog" :href="resume.blog" target="_blank" rel="noopener" class="inline-link">博客</a>
          </div>
        </div>

        <!-- 教育经历 -->
        <section class="left-card">
          <h3 class="left-card__title">
            <span class="left-card__icon">🎓</span>教育经历
          </h3>
          <div v-for="record in resume.educationRecords" :key="record.id" class="edu-item">
            <div class="edu-item__date">{{ formatDateRange(record.startDate, record.endDate) }}</div>
            <div class="edu-item__school">{{ record.school }}</div>
            <div class="edu-item__major">{{ record.degree }} · {{ record.fieldOfStudy }}</div>
            <p v-if="record.description" class="edu-item__desc">{{ record.description }}</p>
          </div>
        </section>

        <!-- 专业技能 -->
        <section class="left-card">
          <h3 class="left-card__title">
            <span class="left-card__icon">🛠</span>专业技能
          </h3>
          <div v-for="category in resume.skillCategories" :key="category.name" class="skill-group">
            <h4 class="skill-group__name">{{ category.name }}</h4>
            <div class="skill-group__tags">
              <span v-for="skill in category.skills" :key="skill" class="skill-tag">{{ skill }}</span>
            </div>
          </div>
        </section>
      </aside>

      <!-- 右侧栏：工作经历 + 项目经历 -->
      <main class="resume-right">
        <!-- 个人简介 -->
        <section v-if="resume.summary" class="right-section">
          <h2 class="right-section__title">个人简介</h2>
          <p class="summary-text">{{ resume.summary }}</p>
        </section>

        <!-- 工作经历 -->
        <section class="right-section">
          <h2 class="right-section__title">工作经历</h2>
          <div class="timeline">
            <div v-for="item in resume.workExperiences" :key="item.id" class="timeline-item">
              <div class="timeline-item__dot"></div>
              <div class="timeline-item__card">
                <div class="timeline-item__header">
                  <div>
                    <h3 class="timeline-item__company">{{ item.company }}</h3>
                    <p class="timeline-item__role">{{ item.title }}</p>
                  </div>
                  <time class="timeline-item__date">{{ formatDateRange(item.startDate, item.endDate) }}</time>
                </div>
                <p v-if="item.description" class="timeline-item__desc">{{ item.description }}</p>
                <ul v-if="item.highlights && item.highlights.length" class="timeline-item__points">
                  <li v-for="(h, idx) in item.highlights" :key="idx">{{ h }}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- 项目经历 -->
        <section class="right-section">
          <h2 class="right-section__title">项目经历</h2>
          <div class="projects">
            <div v-for="project in resume.projects" :key="project.id" class="project-card">
              <div class="project-card__header">
                <h3 class="project-card__name">{{ project.name }}</h3>
                <span v-if="project.role" class="project-card__role">{{ project.role }}</span>
              </div>
              <div v-if="project.period" class="project-card__period">{{ project.period }}</div>
              <p v-if="project.description" class="project-card__desc">{{ project.description }}</p>
              <ul v-if="project.highlights && project.highlights.length" class="project-card__points">
                <li v-for="(h, idx) in project.highlights" :key="idx">{{ h }}</li>
              </ul>
              <div v-if="project.techStack && project.techStack.length" class="project-card__tech">
                <span v-for="tech in project.techStack" :key="tech" class="tech-tag">{{ tech }}</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const mockResume = {
  fullName: '张三',
  title: 'Java 开发工程师 · AI 应用开发',
  email: 'zhangsan@example.com',
  phone: '138-0000-0000',
  location: '深圳',
  github: 'https://github.com/zhangsan',
  blog: 'https://zhangsan.dev',
  summary:
    '拥有 5 年 Java 后端开发经验，近 2 年深耕 AI 应用落地。擅长 Spring Boot / Spring Cloud 微服务架构、高并发系统设计，熟悉 LLM 应用开发（LangChain、蒸馏）、模型微调与部署。热爱技术分享，坚持写技术博客，追求用工程化思维解决实际问题。',
  skillCategories: [
    {
      name: '后端开发',
      skills: ['Java 8/17', 'Spring Boot', 'Spring Cloud', 'MyBatis', 'JPA', 'MySQL', 'Redis', 'RabbitMQ', 'Kafka', 'Elasticsearch']
    },
    {
      name: 'AI 应用',
      skills: ['LangChain', '蒸馏', 'LLM Fine-tuning', 'Prompt Engineering', 'Agent 开发', 'OpenAI API', '向量数据库', 'Embedding']
    },
    {
      name: '前端 & 工具',
      skills: ['Vue.js', 'TypeScript', 'Docker', 'Kubernetes', 'Git', 'CI/CD', 'Jenkins', 'Nginx', 'Linux']
    }
  ],
  workExperiences: [
    {
      id: '1',
      company: '某 AI 科技公司',
      title: '高级 Java 开发工程师',
      startDate: '2023-03',
      endDate: null,
      description: '负责 AI 应用平台后端架构设计与核心功能开发，推动大模型在企业级场景的落地。',
      highlights: [
        '主导设计基于 Spring Cloud Alibaba 的微服务架构，支撑日均千万级 API 调用',
        '开发 蒸馏 知识库系统，结合 LangChain + 向量数据库实现企业文档智能问答，准确率达 92%',
        '搭建 LLM Agent 框架，支持多工具链编排与流式输出，已服务 3 个核心业务线',
        '优化大模型推理网关，通过缓存 + 请求合并将平均响应延迟降低 60%'
      ]
    },
    {
      id: '2',
      company: '某互联网公司',
      title: 'Java 开发工程师',
      startDate: '2021-01',
      endDate: '2023-02',
      description: '参与电商平台后端服务开发，负责订单、支付等核心模块的设计与实现。',
      highlights: [
        '重构订单系统，将接口响应时间从 800ms 优化至 200ms，支撑大促期间 10 倍流量峰值',
        '设计并实现分布式事务方案（Seata + 消息队列），保证订单与支付数据最终一致性',
        '开发智能推荐引擎，基于用户行为数据实现个性化商品推荐，点击率提升 25%'
      ]
    },
    {
      id: '3',
      company: '某软件公司',
      title: '初级 Java 开发工程师',
      startDate: '2019-07',
      endDate: '2020-12',
      description: '负责企业内部管理系统及数据平台的后端开发工作。',
      highlights: [
        '独立完成数据报表平台后端开发，支持多维度数据聚合与可视化导出',
        '引入 Redis 缓存方案，将热点数据查询性能提升 10 倍',
        '参与项目 CI/CD 流水线搭建，实现自动化构建、测试与部署'
      ]
    }
  ],
  projects: [
    {
      id: 'p1',
      name: '智能知识库问答系统',
      role: '核心开发者 & 架构师',
      period: '2024.06 - 至今',
      description: '面向企业的 蒸馏 知识库问答平台，支持 PDF、Word、网页等多源文档导入，实现基于大模型的智能检索与问答。',
      highlights: [
        '基于 LangChain + Milvus 向量数据库构建 蒸馏 pipeline，支持分块策略与多路召回',
        '实现混合检索（关键词 + 语义）与重排序，Top-5 召回准确率 95%+',
        '设计多轮对话管理模块，支持上下文感知与追问澄清',
        '开发可视化配置后台，支持 Prompt 模板管理与效果 A/B 测试'
      ],
      techStack: ['Spring Boot', 'LangChain', 'Milvus', 'OpenAI', 'Redis', 'MySQL', 'Vue.js']
    },
    {
      id: 'p2',
      name: 'AI 辅助代码审查工具',
      role: '项目负责人',
      period: '2023.09 - 2024.03',
      description: '基于大模型的代码审查助手，自动分析 Git Diff 并生成审查建议，提升团队 Code Review 效率。',
      highlights: [
        '设计 Prompt 工程策略，针对 Java 项目定制代码审查维度（安全、性能、规范）',
        '集成 GitLab Webhook，实现提交自动触发审查并评论至 MR',
        '引入 Function Calling 机制，支持调用静态分析工具增强审查深度',
        '团队 Code Review 平均耗时从 2 小时降至 30 分钟'
      ],
      techStack: ['Python', 'FastAPI', 'LangChain', 'GitLab API', 'PostgreSQL', 'Docker']
    },
    {
      id: 'p3',
      name: '高并发秒杀系统',
      role: '后端负责人',
      period: '2022.03 - 2022.08',
      description: '电商平台限时秒杀系统，支持百万级并发请求，保障系统稳定性与数据一致性。',
      highlights: [
        '采用 Redis + Lua 脚本实现库存预扣减，消除超卖风险',
        '使用 RabbitMQ 异步下单削峰，将峰值 TPS 从 3000 提升至 50000',
        '设计多层限流策略（Nginx + Sentinel），保障核心服务不被冲垮',
        '全链路压测验证，秒杀场景下 99 分位延迟 < 100ms'
      ],
      techStack: ['Spring Boot', 'Redis', 'RabbitMQ', 'Sentinel', 'MySQL', 'Nginx']
    }
  ],
  educationRecords: [
    {
      id: '1',
      school: '某某大学',
      degree: '硕士',
      fieldOfStudy: '计算机科学与技术',
      startDate: '2017-09',
      endDate: '2019-06',
      description: '研究方向：自然语言处理。发表 2 篇 EI 论文，获研究生国家奖学金。'
    },
    {
      id: '2',
      school: '某某理工大学',
      degree: '学士',
      fieldOfStudy: '软件工程',
      startDate: '2013-09',
      endDate: '2017-06',
      description: 'GPA 3.7/4.0，获 ACM 程序设计竞赛省级银奖，校级优秀毕业生。'
    }
  ]
};

const loading = ref(true);
const error = ref<string | null>(null);
const resume = ref<typeof mockResume | null>(null);

const loadResume = async () => {
  loading.value = true;
  error.value = null;
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    resume.value = mockResume;
  } catch (err) {
    error.value = '加载简历失败，请稍后重试。';
    console.error('[PublicResume] loadResume', err);
  } finally {
    loading.value = false;
  }
};

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split('').slice(0, 2).join('').toUpperCase();
};

const formatDateRange = (start: string, end: string | null) => {
  const fmt = (v: string) => v.replace('-', '.');
  return `${fmt(start)} — ${end ? fmt(end) : '至今'}`;
};

onMounted(() => {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  loadResume();
});

onBeforeUnmount(() => {
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* ── 页面容器：fixed 定位在 header(80px) 下方，占满剩余视口 ── */
.resume-page {
  position: fixed;
  top: 80px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background: var(--public-bg);
  z-index: 1;
  font-size: 17px;
}

.loading-state,
.error-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--public-text-secondary);
}

/* ── 双栏布局 ── */
.resume-layout {
  display: flex;
  height: 100%;
}

/* ═══════════ 左侧栏 ═══════════ */
.resume-left {
  width: 38%;
  min-width: 340px;
  max-width: 440px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 1.5rem 2rem;
  background: var(--public-bg);
  border-right: 1px solid var(--public-border-light);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}

.resume-left::-webkit-scrollbar { width: 5px; }
.resume-left::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
}

.left-card {
  background: var(--public-surface);
  border: 1px solid var(--public-border-light);
  border-radius: var(--public-radius-lg);
  padding: 1.25rem;
}

.left-card__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--public-text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--public-border-light);
}

.left-card__icon { font-size: 1.1rem; }

/* 个人信息（简洁版） */
.profile-compact { text-align: center; margin-bottom: 1rem; }

.profile-compact__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #333333 0%, #666666 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.75rem;
}

.profile-compact__initials {
  color: #fff;
  font-size: 1.9rem;
  font-weight: 700;
}

.profile-compact__name {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--public-text);
  margin-bottom: 0.2rem;
}

.profile-compact__title {
  font-size: 0.92rem;
  color: var(--public-text-secondary);
  font-weight: 500;
  line-height: 1.4;
}

.profile-compact__contact {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.92rem;
  color: var(--public-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-compact__links {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.inline-link {
  font-size: 0.9rem;
  color: var(--public-text-secondary);
  text-decoration: none;
  padding: 0.2rem 0.7rem;
  border: 1px solid var(--public-border-light);
  border-radius: 4px;
  transition: all 0.2s;
}

.inline-link:hover { background: var(--public-border-light); color: var(--public-text); }

/* 教育经历 */
.edu-item {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--public-border-light);
}

.edu-item:last-child { border-bottom: none; padding-bottom: 0; }

.edu-item__date { font-size: 0.85rem; color: var(--public-text-muted); margin-bottom: 0.15rem; }
.edu-item__school { font-size: 1rem; font-weight: 600; color: var(--public-text); }
.edu-item__major { font-size: 0.9rem; color: var(--public-text-secondary); margin-bottom: 0.25rem; }
.edu-item__desc { font-size: 0.9rem; color: var(--public-text-muted); line-height: 1.5; }

/* 技能分组 */
.skill-group { margin-bottom: 0.9rem; }
.skill-group:last-child { margin-bottom: 0; }

.skill-group__name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--public-text);
  margin-bottom: 0.4rem;
}

.skill-group__tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }

.skill-tag {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--public-text);
  background: rgba(51, 51, 51, 0.06);
  border: 1px solid rgba(51, 51, 51, 0.12);
  border-radius: 5px;
  transition: all 0.2s;
}

.skill-tag:hover { background: var(--public-text-secondary); color: var(--public-bg); }

/* ═══════════ 右侧栏 ═══════════ */
.resume-right {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem 2rem 2rem;

  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}

.resume-right::-webkit-scrollbar { width: 5px; }
.resume-right::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
}

.right-section { margin-bottom: 2.5rem; }
.right-section:last-child { margin-bottom: 0; }

.right-section__title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--public-text);
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--public-text-secondary);
  display: inline-block;
}

.summary-text {
  font-size: 1.2rem;
  line-height: 1.9;
  color: var(--public-text-secondary);
  text-align: justify;
}

/* ── Timeline 时间轴 ── */
.timeline {
  position: relative;
  padding-left: 1.5rem;
  border-left: 2px solid var(--public-border-light);
}

.timeline-item { position: relative; margin-bottom: 1.5rem; }
.timeline-item:last-child { margin-bottom: 0; }

.timeline-item__dot {
  position: absolute;
  left: -1.65rem;
  top: 0.4rem;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--public-text-secondary);
  border: 2px solid var(--public-bg);
  box-shadow: 0 0 0 2px var(--public-text-secondary);
}

.timeline-item__card {
  background: var(--public-surface);
  border: 1px solid var(--public-border-light);
  border-radius: var(--public-radius-lg);
  padding: 1.25rem 1.5rem;
  transition: box-shadow 0.2s;
}

.timeline-item__card:hover { box-shadow: 0 2px 12px var(--public-shadow); }

.timeline-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.timeline-item__company { font-size: 1.4rem; font-weight: 600; color: var(--public-text); }
.timeline-item__role { font-size: 0.95rem; color: var(--public-text-secondary); margin-top: 0.15rem; }
.timeline-item__date { font-size: 0.9rem; color: var(--public-text-muted); white-space: nowrap; margin-top: 0.15rem; }
.timeline-item__desc { font-size: 1rem; color: var(--public-text-secondary); line-height: 1.7; margin-bottom: 0.65rem; }

.timeline-item__points { list-style: none; padding: 0; }

.timeline-item__points li {
  position: relative;
  padding-left: 0.9rem;
  font-size: 1.25rem;
  color: var(--public-text-secondary);
  line-height: 1.75;
}

.timeline-item__points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--public-text-secondary);
}

/* ── 项目卡片 ── */
.projects { display: flex; flex-direction: column; gap: 1.25rem; }

.project-card {
  background: var(--public-surface);
  border: 1px solid var(--public-border-light);
  border-radius: var(--public-radius-lg);
  padding: 1.25rem 1.5rem;
  transition: box-shadow 0.2s;
}

.project-card:hover { box-shadow: 0 2px 12px var(--public-shadow); }

.project-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.3rem;
}

.project-card__name { font-size: 1.4rem; font-weight: 600; color: var(--public-text); }

.project-card__role {
  font-size: 0.85rem;
  color: var(--public-text);
  font-weight: 500;
  white-space: nowrap;
  padding: 0.15rem 0.55rem;
  background: rgba(51, 51, 51, 0.06);
  border-radius: 4px;
}

.project-card__period { font-size: 0.9rem; color: var(--public-text-muted); margin-bottom: 0.65rem; }
.project-card__desc { font-size: 1rem; color: var(--public-text-secondary); line-height: 1.7; margin-bottom: 0.65rem; }

.project-card__points { list-style: none; padding: 0; margin-bottom: 0.75rem; }

.project-card__points li {
  position: relative;
  padding-left: 0.9rem;
  font-size: 1.35rem;
  color: var(--public-text-secondary);
  line-height: 1.75;
}

.project-card__points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--public-text-secondary);
}

.project-card__tech { display: flex; flex-wrap: wrap; gap: 0.35rem; }

.tech-tag {
  display: inline-block;
  padding: 0.12rem 0.55rem;
  font-size: 0.84rem;
  color: var(--public-text-muted);
  background: var(--public-bg);
  border: 1px solid var(--public-border-light);
  border-radius: 4px;
}

/* ── 响应式：窄屏恢复正常流 ── */
@media (max-width: 860px) {
  .resume-page {
    position: static;
    height: auto;
    overflow: visible;
  }

  .resume-layout { flex-direction: column; height: auto; }

  .resume-left {
    width: 100%;
    max-width: none;
    border-right: none;
    border-bottom: 1px solid var(--public-border-light);
    overflow: visible;
    padding: 1.5rem 1.25rem 1.5rem;
  }

  .resume-right { overflow: visible; padding: 1.5rem 1.25rem 2rem; }
}

@media (max-width: 480px) {
  .resume-page { font-size: 16px; }
  .resume-left { padding: 1rem 1rem 1rem; }
  .resume-right { padding: 1rem 1rem 1.5rem; }
  .timeline-item__header { flex-direction: column; gap: 0.25rem; }
  .project-card__header { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
}
</style>