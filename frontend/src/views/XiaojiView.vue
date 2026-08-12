<script setup>
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { noteTags, notes } from '@/data/notes'

/* ===== Tag filter（对应原型的 filterBar 点击逻辑） ===== */
const activeTag = ref('all')

const visibleNotes = computed(() =>
  activeTag.value === 'all' ? notes : notes.filter((n) => n.tag === activeTag.value),
)

// 原型：countEl.textContent = visible + ' / ' + cards.length + ' 篇'
const countText = computed(() => `${visibleNotes.value.length} / ${notes.length} 篇`)

function selectTag(key) {
  activeTag.value = key
}
</script>

<template>
  <AppHeader active-key="notes" />

  <main class="page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-glow" />
      <div class="page-hero-inner">
        <span class="kicker">Xiaoji · Notes</span>
        <h1>小记</h1>
        <p class="lede">
          生活里那些不值得发朋友圈、却舍不得忘的碎片。酿酒、摄影、BTC，以及一切杂谈——记录下来，就是抵抗遗忘的方式。
        </p>
      </div>
    </section>

    <div class="container">
      <!-- Filter -->
      <div class="filter-bar" role="tablist" aria-label="文章分类">
        <button
          v-for="tag in noteTags"
          :key="tag.key"
          type="button"
          class="filter-btn"
          :class="{ active: tag.key === activeTag }"
          :aria-pressed="tag.key === activeTag"
          @click="selectTag(tag.key)"
        >
          {{ tag.label }}
        </button>
        <span class="filter-count">{{ countText }}</span>
      </div>

      <!-- Notes -->
      <div class="note-grid">
        <!-- key 带上当前标签：切换筛选时卡片重新挂载，等价于原型里重放 fadeUp 动画 -->
        <article v-for="note in visibleNotes" :key="`${activeTag}-${note.id}`" class="note-card">
          <div class="note-cover">
            <span class="glyph">{{ note.glyph }}</span>
            <span class="cover-tag">{{ note.coverTag }}</span>
          </div>
          <div class="note-body">
            <div class="note-meta">{{ note.meta }}</div>
            <h3 class="note-title">{{ note.title }}</h3>
            <p class="note-excerpt">{{ note.excerpt }}</p>
            <RouterLink class="note-link" :to="'/xiaoji/' + note.id">
              阅读
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
  </main>

  <AppFooter padding-y="28px" />
</template>

<style scoped>
/* ===== Page layout ===== */
.page {
  flex: 1;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Page hero */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 64px 24px 40px;
  border-bottom: 1px solid var(--border-light);
}

.hero-glow {
  position: absolute;
  top: -80px;
  right: -60px;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px);
  pointer-events: none;
}

[data-theme='dark'] .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%);
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
}

.kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px;
  background-color: var(--accent-light);
  margin-bottom: 16px;
}

.page-hero h1 {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.page-hero .lede {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 600px;
}

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 28px 0 8px;
}

.filter-btn {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  padding: 7px 16px;
  border-radius: 100px;
  cursor: pointer;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  transition: all var(--transition);
}

.filter-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-btn.active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}

[data-theme='dark'] .filter-btn.active {
  color: #0f0f0f;
}

.filter-count {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-left: auto;
  font-family: var(--font-mono);
}

/* Note grid */
.note-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding: 24px 0 64px;
}

.note-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  overflow: hidden;
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    border-color var(--transition);
  animation: fadeUp .45s cubic-bezier(.22, 1, .36, 1) both;
}

.note-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.note-cover {
  position: relative;
  height: 132px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 14px 16px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.16), transparent 50%),
    linear-gradient(135deg, #2d8264, #143f30);
}

[data-theme='dark'] .note-cover {
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.13), transparent 50%),
    linear-gradient(135deg, #2f6b54, #0e2a20);
}

.note-cover .glyph {
  font-family: var(--font-mono);
  font-size: 30px;
  opacity: 0.92;
}

.note-cover .cover-tag {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border-radius: 100px;
  background-color: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.28);
}

.note-body {
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.note-meta {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--accent);
  margin-bottom: 8px;
}

.note-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.note-excerpt {
  font-size: 14px;
  color: var(--text-secondary);
  flex: 1;
  margin-bottom: 16px;
}

.note-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  transition: gap var(--transition);
}

.note-link:hover {
  gap: 10px;
}

.note-link svg {
  width: 15px;
  height: 15px;
}

/* Responsive */
@media (max-width: 1024px) {
  .note-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding: 40px 16px 32px;
  }

  .page-hero h1 {
    font-size: 32px;
  }

  .note-grid {
    grid-template-columns: 1fr;
    padding: 20px 0 48px;
  }
}

/* 原型 @media (max-width: 480px) 内只有 .nav-links { display: none }，属顶栏样式，已在 AppHeader.vue 中还原 */
</style>
