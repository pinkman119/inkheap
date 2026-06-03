<template>
  <div class="overview">
    <section class="panel highlight">
      <h3>今日节奏</h3>
      <div class="metric-grid">
        <div class="metric">
          <span class="metric__label">已发布文章</span>
          <strong>24</strong>
          <span class="metric__trend up">+3 本周新增</span>
        </div>
        <div class="metric">
          <span class="metric__label">日记连续记录</span>
          <strong>12</strong>
          <span class="metric__trend">天 streak</span>
        </div>
        <div class="metric">
          <span class="metric__label">简历完成度</span>
          <strong>86%</strong>
          <span class="metric__trend muted">待补充项目经历</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <header>
        <h3>快速入口</h3>
        <RouterLink to="/articles">查看全部</RouterLink>
      </header>
      <div class="quick-actions">
        <button type="button">写文章</button>
        <button type="button">记录日记</button>
        <button type="button">更新简历</button>
      </div>
    </section>

    <section class="panel timeline">
      <header>
        <h3>最近动态</h3>
        <span>同步于 3 分钟前</span>
      </header>
      <ul>
        <li>
          <span class="tag">文章</span>
          <div>
            <strong>「信息架构的 5 条黄金法则」</strong>
            <p>完善了分类标签并发布最新版本。</p>
          </div>
          <time>13:24</time>
        </li>
        <li>
          <span class="tag">日记</span>
          <div>
            <strong>完成每日反思</strong>
            <p>记录了新项目 kick-off 的灵感与感受。</p>
          </div>
          <time>09:12</time>
        </li>
        <li>
          <span class="tag">简历</span>
          <div>
            <strong>添加了「产品策略顾问」经历</strong>
            <p>完善关键成果与量化指标。</p>
          </div>
          <time>昨天</time>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
// TODO: 接通真实数据
</script>

<style scoped>
.overview {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}

.panel {
  background: var(--surface-card);
  border-radius: 1.5rem;
  padding: 1.75rem;
  box-shadow: 0 16px 36px rgba(55, 64, 120, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
}

.highlight {
  grid-column: 1 / -1;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1.25rem;
}

.metric {
  background: var(--surface-pill);
  border-radius: 1.2rem;
  padding: 1.1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.metric__label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric strong {
  font-size: 1.85rem;
  font-weight: 700;
}

.metric__trend {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric__trend.up {
  color: #48bb78;
}

.metric__trend.muted {
  opacity: 0.6;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.quick-actions button {
  border: none;
  background: var(--surface-pill);
  padding: 0.75rem 1.35rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 160ms ease, background 160ms ease;
}

.quick-actions button:hover {
  transform: translateY(-1px);
  background: rgba(76, 93, 240, 0.35);
}

.timeline ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.tag {
  background: rgba(76, 93, 240, 0.16);
  color: #4c5df0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .timeline li {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  time {
    justify-self: flex-start;
  }
}
</style>
