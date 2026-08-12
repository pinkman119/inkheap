<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()
const stats = ref({ articles: 0, published: 0, draft: 0, categories: 0 })
const recent = ref([])

onMounted(async () => {
  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      api.get('/admin/articles?pageSize=5'),
      api.get('/admin/categories'),
    ])
    const { items, total } = articlesRes
    stats.value = {
      articles: total,
      published: items.filter(a => a.published).length,
      draft: items.filter(a => !a.published).length,
      categories: categoriesRes.length,
    }
    recent.value = items
  } catch (e) {
    console.error('Dashboard load error:', e)
  }
})

const statCards = [
  { label: '文章总数', value: stats.value.articles, icon: 'doc', color: 'var(--accent)' },
  { label: '已发布', value: stats.value.published, icon: 'check', color: '#2d8264' },
  { label: '草稿', value: stats.value.draft, icon: 'edit', color: '#e8590c' },
  { label: '分类', value: stats.value.categories, icon: 'folder', color: '#1c7ed6' },
]
</script>

<template>
  <div class="dashboard">
    <div class="page-head">
      <h2>仪表盘</h2>
      <p class="page-desc">概览你的内容数据</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="card in statCards" :key="card.label" class="stat-card">
        <div class="stat-icon" :style="{ background: card.color + '15', color: card.color }">
          <svg v-if="card.icon === 'doc'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <svg v-else-if="card.icon === 'check'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>
          <svg v-else-if="card.icon === 'edit'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats[card.icon === 'doc' ? 'articles' : card.icon === 'check' ? 'published' : card.icon === 'edit' ? 'draft' : 'categories'] }}</span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
      </div>
    </div>

    <!-- 最近文章 -->
    <div class="section">
      <div class="section-head">
        <h3>最近文章</h3>
        <router-link to="/admin/articles" class="link-all">查看全部 →</router-link>
      </div>
      <div v-if="recent.length" class="recent-list">
        <div v-for="item in recent" :key="item.id" class="recent-item">
          <div class="recent-info">
            <span class="recent-title">{{ item.title }}</span>
            <span class="recent-meta">{{ item.author }} · {{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</span>
          </div>
          <span class="recent-badge" :class="item.published ? 'badge-pub' : 'badge-draft'">
            {{ item.published ? '已发布' : '草稿' }}
          </span>
        </div>
      </div>
      <div v-else class="empty-hint">暂无文章，快去创建一篇吧</div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { max-width: 1200px; }

.page-head { margin-bottom: 28px; }
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 0; }

/* 统计卡片 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition);
}
.stat-card:hover { box-shadow: var(--shadow-sm); }

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); line-height: 1.2; }
.stat-label { font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }

/* 最近文章 */
.section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.section-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--text-primary); }

.link-all { font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 500; }
.link-all:hover { color: var(--accent-hover); }

.recent-list { padding: 4px 0; }

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  transition: background var(--transition);
}
.recent-item:hover { background: var(--bg-soft); }
.recent-item + .recent-item { border-top: 1px solid var(--border-light); }

.recent-info { display: flex; flex-direction: column; gap: 2px; }
.recent-title { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.recent-meta { font-size: 12px; color: var(--text-tertiary); }

.recent-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 100px;
  font-weight: 500;
}
.badge-pub { background: var(--accent-light); color: var(--accent); }
.badge-draft { background: #fff3bf; color: #e67700; }

.empty-hint {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
