<template>
  <div class="article-board">
    <header class="article-board__header">
      <div>
        <h3>文章库</h3>
        <p>以主题与标签掌控知识体系</p>
      </div>
      <button type="button">创建新文章</button>
    </header>

    <div class="article-board__content">
      <aside>
        <h4>分类标签</h4>
        <ul>
          <li class="active">全部（24）</li>
          <li>设计洞察</li>
          <li>产品策略</li>
          <li>个人随笔</li>
        </ul>
      </aside>

      <section class="cards">
        <article class="card" v-for="n in 4" :key="n">
          <span class="badge">产品策略</span>
          <h5>多维内容分发的优先级算法</h5>
          <p>
            探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。
          </p>
          <footer>
            <span>更新于 2 天前</span>
            <RouterLink to="/articles/preview">查看详情</RouterLink>
          </footer>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// TODO: 绑定实际文章列表数据与分类筛选
</script>

<style scoped>
.article-board {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  height: 100%;
}

.article-board__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.article-board__header h3 {
  margin: 0;
  font-size: 1.5rem;
}

.article-board__header p {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
}

.article-board__header button {
  border: none;
  background: linear-gradient(135deg, #ef476f, #ffd166);
  color: #1f213a;
  padding: 0.65rem 1.35rem;
  border-radius: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(239, 71, 111, 0.28);
}

.article-board__content {
  display: grid;
  grid-template-columns: 15rem 1fr;
  gap: 1.5rem;
  flex: 1;
  overflow: hidden;
}

aside {
  background: var(--surface-card);
  padding: 1.25rem;
  border-radius: 1.25rem;
  box-shadow: 0 14px 32px rgba(55, 64, 120, 0.08);
}

aside h4 {
  margin-top: 0;
  margin-bottom: 1rem;
}

aside ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

aside li {
  padding: 0.45rem 0.55rem;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 160ms ease;
}

aside li:hover,
aside li.active {
  background: rgba(76, 93, 240, 0.15);
  color: #4c5df0;
}

.cards {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
}

.card {
  background: var(--surface-card);
  border-radius: 1.35rem;
  padding: 1.4rem;
  box-shadow: 0 10px 26px rgba(55, 64, 120, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  background: rgba(76, 93, 240, 0.18);
  font-size: 0.75rem;
  color: #4c5df0;
  text-transform: uppercase;
}

.card footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
}

@media (max-width: 960px) {
  .article-board__content {
    grid-template-columns: 1fr;
  }
}
</style>
