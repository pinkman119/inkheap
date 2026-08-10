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

    <section class="panel wide">
      <header>
        <h3>创作活跃度</h3>
        <span class="period">近 365 天</span>
      </header>
      <div class="heatmap">
        <div
          v-for="(level, index) in heatmapData"
          :key="index"
          class="cell"
          :style="{ backgroundColor: getLevelColor(level) }"
          :title="getTooltip(index)"
        ></div>
      </div>
      <div class="legend">
        <span>少</span>
        <div class="legend-bars">
          <div class="bar" v-for="i in 5" :key="i" :style="{ backgroundColor: getLevelColor(i - 1) }"></div>
        </div>
        <span>多</span>
      </div>
    </section>

    <section class="panel">
      <header>
        <h3>快速入口</h3>
        <RouterLink to="/admin/articles">查看全部</RouterLink>
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
import { ref } from 'vue';

// 生成模拟的热力图数据（0-4 五个等级）
const heatmapData = ref<number[]>(generateHeatmapData());

function generateHeatmapData(): number[] {
  const totalCells = 52 * 7; // 52 周 × 7 天 = 364 个格子
  const data: number[] = [];
  for (let i = 0; i < totalCells; i++) {
    // 随机生成 0-4 的等级，偏向 0 和 1
    const rand = Math.random();
    if (rand < 0.4) {
      data.push(0);
    } else if (rand < 0.65) {
      data.push(1);
    } else if (rand < 0.85) {
      data.push(2);
    } else if (rand < 0.95) {
      data.push(3);
    } else {
      data.push(4);
    }
  }
  return data;
}

// 浅绿到深绿的配色
const levelColors = [
  'rgba(200, 240, 200, 0.5)',  // 空白/极少 - 非常浅的绿
  '#9be9a8',                    // 等级 1 - 浅绿
  '#40c463',                    // 等级 2 - 中绿
  '#30a14e',                    // 等级 3 - 深绿
  '#216e39',                    // 等级 4 - 非常深的绿
];

function getLevelColor(level: number): string {
  return levelColors[level] || levelColors[0];
}

function getTooltip(index: number): string {
  const date = getDateFromIndex(index);
  const level = heatmapData.value[index];
  const contributions = level === 0 ? 0 : level * Math.floor(Math.random() * 3) + 1;
  return `${date} · ${contributions} 次贡献`;
}

function getDateFromIndex(index: number): string {
  const today = new Date();
  const daysAgo = (52 * 7 - 1) - index;
  const date = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// TODO: 接通真实数据
</script>

<style scoped>
.overview {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(3, 1fr);
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

.panel header h3 {
  color: var(--text-primary);
}

.period {
  font-size: 0.8rem;
  opacity: 0.7;
}

.highlight {
  grid-column: 1 / -1;
}

.wide {
  grid-column: span 2;
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

/* 热力图样式 */
.heatmap {
  display: grid;
  grid-template-columns: repeat(52, 1fr);
  gap: 3px;
  margin-top: 0.5rem;
}

.cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  cursor: pointer;
  transition: transform 80ms ease;
}

.cell:hover {
  transform: scale(1.3);
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.legend-bars {
  display: flex;
  gap: 3px;
}

.bar {
  width: 10px;
  height: 10px;
  border-radius: 2px;
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
  .overview {
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  }

  .wide {
    grid-column: 1 / -1;
  }

  .heatmap {
    grid-template-columns: repeat(26, 1fr);
  }

  .timeline li {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  time {
    justify-self: flex-start;
  }
}

@media (max-width: 600px) {
  .heatmap {
    grid-template-columns: repeat(18, 1fr);
    gap: 2px;
  }

  .cell {
    border-radius: 1px;
  }

  .legend {
    justify-content: center;
  }
}
</style>