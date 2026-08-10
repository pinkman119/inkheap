<template>
  <div class="article-detail-page">
    <div class="container">
      <!-- 左侧：文章内容 -->
      <div class="article-content">
        <h1 class="article-title">{{ articleData.title }}</h1>
        <div class="article-meta">
          <span class="author">作者：{{ articleData.author }}</span>
          <span class="date">发布时间：{{ articleData.date }}</span>
          <span class="category">分类：{{ articleData.category }}</span>
        </div>

        <img :src="articleData.cover" alt="文章配图" class="article-cover">

        <div class="article-body markdown-body" v-html="renderedContent"></div>

        <div class="article-footer">
          <div class="tags">
            <span class="tag" v-for="tag in articleData.tags" :key="tag">{{ tag }}</span>
          </div>
          <!-- <div class="social-share">
            <button class="share-btn">分享</button>
            <button class="like-btn">点赞</button>
          </div> -->
        </div>
      </div>

      <!-- 右侧：固定栏 -->
      <div class="article-sidebar">
        <!-- 文章统计 -->
        <div class="sidebar-section">
          <div class="toc-header mb-4 pb-3 border-b border-b-gray-200 dark:border-b-border-dimmed-primary">
            <div class="text-sm font-bold text-zinc-700 dark:text-text-dimmed-primary uppercase tracking-wide flex items-center gap-2">
<svg t="1781268672968" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3315" width="16" height="16"><path d="M704 128a32 32 0 0 1 0 64h-21.333333v160.789333a10.666667 10.666667 0 0 0 1.088 4.693334l180.874666 369.6c28.48 58.218667 4.384 128.490667-53.813333 156.970666A117.333333 117.333333 0 0 1 759.242667 896H264.746667c-64.8 0-117.333333-52.533333-117.333334-117.333333a117.333333 117.333333 0 0 1 11.946667-51.573334l180.874667-369.621333a10.666667 10.666667 0 0 0 1.088-4.693333V192h-21.333334a32 32 0 0 1-31.946666-30.122667L288 160a32 32 0 0 1 32-32z m51.968 522.666667H268.010667l-51.157334 104.554666A53.333333 53.333333 0 0 0 264.757333 832H759.253333a53.333333 53.333333 0 0 0 47.893334-76.778667L755.978667 650.666667zM618.666667 192H405.333333v160.789333a74.666667 74.666667 0 0 1-7.594666 32.821334L299.328 586.666667h425.322667l-98.389334-201.066667A74.666667 74.666667 0 0 1 618.666667 352.8V192z" fill="#000000" p-id="3316"></path></svg>              简介
            </div>
          </div>
          <p class="intro-text">{{ articleData.intro }}</p>
          <div class="stats-row">
            <span class="stat-text">{{ wordCount }} 字</span>
            <span class="stat-dot">·</span>
            <span class="stat-text">{{ readingTime }}</span>
            <span class="stat-dot">·</span>
            <span class="stat-text">{{ articleData.views }} 阅读</span>
            <span class="stat-dot">·</span>
            <span class="stat-text">{{ articleData.likes }} 分类</span>
          </div>
        </div>

        <!-- 目录导航 -->
        <div class="sidebar-section">
          <div class="toc-header mb-4 pb-3 border-b border-b-gray-200 dark:border-b-border-dimmed-primary">
            <div class="text-sm font-bold text-zinc-700 dark:text-text-dimmed-primary uppercase tracking-wide flex items-center gap-2">
              <svg aria-hidden="true" focusable="false" class="octicon octicon-list-unordered" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom">
                <path d="M5.75 2.5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zm0 5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zm0 5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zM2 14a1 1 0 110-2 1 1 0 010 2zm1-6A1 1 0 111 8a1 1 0 012 0zM2 4a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
              大纲
            </div>
          </div>
          <ul class="toc-list">
            <li
              v-for="heading in tocHeadings"
              :key="heading.id"
              class="toc-item"
              :class="{ active: currentSection === heading.id }"
              :style="{ paddingLeft: (heading.level - 2) * 12 + 'px' }"
            >
              <a :href="'#' + heading.id" class="toc-link" @click.prevent="scrollToHeading(heading.id)">{{ heading.text }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';

// 模拟 Markdown 文章内容
const markdownContent = ref(`
探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。本文将深入分析信息架构的核心原则，分享在实际项目中的应用经验。
配图 1. 用户中心原则

信息架构的首要原则是以用户为中心。无论设计多么复杂的信息系统，最终目标都是让用户能够快速、准确地找到所需信息。这要求我们在设计过程中始终站在用户的角度思考，理解他们的需求、习惯和期望。

# 1.1 用户调研方法

常见的用户调研方法包括问卷调查、用户访谈、焦点小组和可用性测试。每种方法都有其适用场景和局限性，需要根据项目实际情况灵活选择。

# 1.2 用户画像构建

通过收集用户的行为数据、人口统计学特征和心理特征，构建精准的用户画像，帮助团队更好地理解目标用户群体。

## 2. 清晰的层级结构

一个良好的信息架构需要清晰的层级结构。通过合理的分类和分组，使用户能够轻松理解信息的组织方式。层级不宜过深，一般建议不超过3-4层，以避免用户迷失在复杂的导航中。

### 2.1 金字塔结构

将最重要的信息放在最上层，逐步展开细节。这种结构符合人类的认知习惯，让用户能够快速获取核心信息。

### 2.2 矩阵结构

对于需要多维度访问的信息，矩阵结构允许用户从不同入口到达同一内容，提高了信息的可访问性。

## 3. 一致性设计

在整个系统中保持一致的设计语言和交互模式。一致的导航、标签和操作方式能够降低用户的学习成本，提升用户体验。一致性不仅体现在视觉上，还包括交互逻辑和术语使用。

### 3.1 视觉一致性

统一色彩、字体、图标和间距等视觉元素，确保用户在不同页面间切换时不会感到困惑。

### 3.2 交互一致性

相同功能的操作方式应保持一致，例如所有删除操作都使用相同的确认流程，所有表单都采用相同的验证方式。

## 4. 灵活的导航系统

提供多种导航方式，满足不同用户的需求。除了传统的菜单导航，还可以考虑搜索、标签、相关内容推荐等方式。灵活的导航系统能够适应不同场景和用户习惯。

### 4.1 面包屑导航

面包屑导航帮助用户了解当前位置，并能快速返回上级页面。它是层级结构网站中不可或缺的导航辅助工具。

### 4.2 搜索导航

对于内容丰富的网站，搜索功能比菜单导航更高效。良好的搜索体验包括智能提示、筛选和排序功能。

## 5. 持续优化与迭代

信息架构不是一成不变的，需要根据用户反馈和数据分析持续优化。通过用户测试、数据分析等手段，不断调整和改进信息架构，使其更加符合用户需求。

### 5.1 数据驱动决策

通过分析用户行为数据（如点击热力图、页面停留时间、跳出率等），发现信息架构中的问题并制定优化方案。

### 5.2 A/B 测试

在推出新的信息架构前，通过 A/B 测试验证其效果，确保改动确实能提升用户体验，而非仅凭直觉做决策。

---

> 好的信息架构就像一座城市的道路规划——让每个人都能轻松找到目的地，同时享受沿途的风景。
`);

// 文章元数据
const articleData = {
  title: '信息架构的 5 条黄金法则',
  author: '张三',
  date: '2024-05-15',
  category: '设计洞察',
  intro: '探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。本文将深入分析信息架构的核心原则，分享在实际项目中的应用经验。',
  cover: 'https://picsum.photos/800/400',
  tags: ['信息架构', '用户体验', '设计原则'],
  views: 1286,
  likes: 73
};

// 文章统计
const wordCount = computed(() => {
  const text = markdownContent.value.replace(/[#*>\-`]/g, '').replace(/\s+/g, '');
  return text.length.toLocaleString();
});

const readingTime = computed(() => {
  const text = markdownContent.value.replace(/[#*>\-`]/g, '').replace(/\s+/g, '');
  const minutes = Math.ceil(text.length / 400); // 中文约400字/分钟
  return `${minutes} 分钟`;
});

// 提取标题并生成 ID
interface TocHeading {
  id: string;
  text: string;
  level: number;
}

const tocHeadings = ref<TocHeading[]>([]);
const currentSection = ref('');

// 自定义 renderer：给标题添加 id
const renderer = new marked.Renderer();
let headingIndex = 0;

renderer.heading = function ({ text, depth }) {
  const id = `heading-${headingIndex++}`;
  return `<h${depth} id="${id}">${text}</h${depth}>`;
};

marked.setOptions({ renderer });

// 渲染 Markdown 为 HTML
const renderedContent = computed(() => {
  headingIndex = 0;
  const headings: TocHeading[] = [];

  // 先解析提取标题
  const tokens = marked.lexer(markdownContent.value);
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth >= 2) {
      const id = `heading-${headings.length}`;
      headings.push({
        id,
        text: token.text,
        level: token.depth
      });
    }
  }

  tocHeadings.value = headings;
  if (headings.length > 0 && !currentSection.value) {
    currentSection.value = headings[0].id;
  }

  return marked(markdownContent.value);
});

// 滚动到指定标题
const scrollToHeading = (headingId: string) => {
  const element = document.getElementById(headingId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    currentSection.value = headingId;
  }
};

// 滚动监听：高亮当前可见的标题
const handleScroll = () => {
  const headings = tocHeadings.value;
  for (let i = headings.length - 1; i >= 0; i--) {
    const el = document.getElementById(headings[i].id);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 100) {
        currentSection.value = headings[i].id;
        return;
      }
    }
  }
  if (headings.length > 0) {
    currentSection.value = headings[0].id;
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.article-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 0;
}

.container {
  display: flex;
  gap: 2rem;
}

/* 左侧文章内容 */
.article-content {
  flex: 2;
  max-width: 66.67%;
}

.article-title {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--public-text);
}

.article-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--public-text-secondary);
  font-size: 0.875rem;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.article-cover {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: var(--public-radius-lg);
  margin-bottom: 1.5rem;
}

/* Markdown 渲染样式 */
.markdown-body {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--public-text-secondary);
}

.markdown-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 2rem 0 1rem;
  color: var(--public-text);
  padding-top: 0.5rem;
}

.markdown-body :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--public-text);
}

.markdown-body :deep(h4) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
  color: var(--public-text);
}

.markdown-body :deep(p) {
  margin-bottom: 1.25rem;
}

.markdown-body :deep(blockquote) {
  margin: 1.5rem 0;
  padding: 0.75rem 1.25rem;
  border-left: 4px solid var(--public-accent, #6366f1);
  background: #f4f4f5;
  border-radius: 0 8px 8px 0;
  color: var(--public-text-secondary);
}

.markdown-body :deep(blockquote p) {
  margin-bottom: 0;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--public-border-light);
  margin: 2rem 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1.25rem;
}

.markdown-body :deep(li) {
  margin-bottom: 0.5rem;
}

.markdown-body :deep(code) {
  background: #f4f4f5;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background: #18181b;
  color: #e4e4e7;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1.25rem;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.markdown-body :deep(img) {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: var(--public-radius-lg);
  margin-bottom: 1.5rem;
}

.article-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--public-border-light);
}

.tags {
  display: flex;
  gap: 0.75rem;
}

.tag {
  padding: 0.5rem 1rem;
  background: #f4f4f5;
  border: 1px solid var(--public-border-light);
  border-radius: 9999px;
  font-size: 0.875rem;
  color: var(--public-text-secondary);
}

.social-share {
  display: flex;
  gap: 1rem;
}

.share-btn,
.like-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--public-border-light);
  border-radius: var(--public-radius-md);
  background: var(--public-bg);
  color: var(--public-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-btn:hover,
.like-btn:hover {
  background: var(--public-surface);
}

/* 右侧固定栏 */
.article-sidebar {
  flex: 1;
  max-width: 33.33%;
  position: sticky;
  top: 2rem;
  height: fit-content;
}

.sidebar-section {
  background: #f4f4f5;
  border-radius: var(--public-radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--public-text-secondary);
}

.intro-text {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--public-text-secondary);
  margin-bottom: 0.75rem;
}

.stats-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}

.stat-text {
  font-size: 0.8125rem;
  color: var(--public-text-secondary);
}

.stat-dot {
  margin: 0 0.5rem;
  color: #d4d4d8;
  font-size: 0.8125rem;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 260px;
  overflow-y: auto;
}

.toc-list::-webkit-scrollbar {
  width: 4px;
}

.toc-list::-webkit-scrollbar-track {
  background: transparent;
}

.toc-list::-webkit-scrollbar-thumb {
  background: #d4d4d8;
  border-radius: 2px;
}

.toc-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1aa;
}

.toc-item {
  margin: 0;
  padding: 0;
}

.toc-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 1rem;
  color: var(--public-text-secondary);
  text-decoration: none;
  border-radius: 5px;
  transition: all 0.2s ease;
  font-size: 15px;
  background: transparent;
  box-shadow: none;
}

.toc-link:hover {
  background: #ebebed;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: var(--public-text);
  padding-left: calc(1rem + 5px);
}

.toc-item.active .toc-link {
  background: #ffffff;
  color: var(--public-text);
  font-weight: 500;
}

.toc-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.toc-header {
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--public-border-light);
}

.toc-header.mb-4 {
  margin-bottom: 1rem;
}

.toc-header.pb-3 {
  padding-bottom: 0.75rem;
}

.toc-header.border-b {
  border-bottom: 1px solid var(--public-border-light);
}

.toc-header.border-b-gray-200 {
  border-bottom-color: #e5e7eb;
}

.dark .toc-header.border-b-border-dimmed-primary {
  border-bottom-color: var(--public-border);
}

.toc-header .font-bold {
  font-weight: 700;
}

.toc-header .text-zinc-700 {
  color: #3f3f46;
}

.dark .toc-header .dark\:text-text-dimmed-primary {
  color: var(--public-text-secondary);
}

.toc-header .uppercase {
  text-transform: uppercase;
}

.toc-header .tracking-wide {
  letter-spacing: 0.025em;
}

.toc-header .flex {
  display: flex;
}

.toc-header .items-center {
  align-items: center;
}

.toc-header .gap-2 {
  gap: 0.5rem;
}

.toc-icon {
  color: var(--public-accent);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }

  .article-content,
  .article-sidebar {
    max-width: 100%;
  }

  .article-sidebar {
    position: static;
  }
}
</style>
