<template>
  <div class="articles-page">
    <header class="articles-page__header">
      <h1>文章</h1>
      <p class="subtitle">分享我的思考与见解</p>
    </header>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadArticles" class="btn btn-secondary">重试</button>
    </div>

    <div v-else-if="articles.length === 0" class="empty-state">
      <p>暂无文章</p>
    </div>

    <div v-else class="articles-grid">
      <article
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        @click="goToArticle(article.id)"
      >
        <span class="article-card__category">{{ article.category }}</span>
        <h2 class="article-card__title">{{ article.title }}</h2>
        <p class="article-card__excerpt">{{ article.excerpt }}</p>
        <time class="article-card__date">{{ formatDate(article.publishedAt) }}</time>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
}

const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const articles = ref<Article[]>([]);

// TODO: 替换为真实 API 调用
const loadArticles = async () => {
  loading.value = true;
  error.value = null;
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500));
    articles.value = [
      {
        id: '1',
        title: '信息架构的 5 条黄金法则',
        excerpt: '探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。',
        category: '设计洞察',
        publishedAt: '2024-05-15'
      },
      {
        id: '2',
        title: '多维内容分发的优先级算法',
        excerpt: '探索内容分发算法的设计原则和实现细节，帮助你更好地理解推荐系统。',
        category: '产品策略',
        publishedAt: '2024-05-10'
      },
      {
        id: '3',
        title: '设计师的年度总结',
        excerpt: '回顾过去一年的成长与挑战，分享设计工作中的心得体会。',
        category: '个人随笔',
        publishedAt: '2024-04-28'
      }
    ];
  } catch (err) {
    error.value = '加载文章失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
};

const formatDate = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};

const goToArticle = (id: string) => {
  router.push(`/articles/${id}`);
};

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.articles-page {
  max-width: 900px;
  margin: 0 auto;
}

.articles-page__header {
  margin-bottom: 2rem;
}

.articles-page__header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--public-text-secondary);
  margin: 0;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 4rem 0;
  color: var(--public-text-secondary);
}

.articles-grid {
  display: grid;
  gap: 1.5rem;
}

.article-card {
  background: var(--public-surface);
  border-radius: var(--public-radius-lg);
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid var(--public-border);
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--public-shadow-hover);
}

.article-card__category {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--public-bg);
  border-radius: 9999px;
  font-size: var(--public-font-size-xs);
  font-weight: 500;
  color: var(--public-text-secondary);
  margin-bottom: 0.75rem;
}

.article-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--public-text);
}

.article-card__excerpt {
  color: var(--public-text-secondary);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.article-card__date {
  font-size: var(--public-font-size-xs);
  color: var(--public-text-muted);
}

@media (max-width: 640px) {
  .articles-page__header h1 {
    font-size: 1.5rem;
  }

  .article-card {
    padding: 1.25rem;
  }
}
</style>