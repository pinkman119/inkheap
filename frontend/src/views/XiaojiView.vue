<script setup>
import { computed, ref, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useApi } from '@/composables/useApi'
import {
  notes as staticNotes,
  noteTags as staticTags,
  xiaojiStats as staticStats,
  img,
} from '@/data/xiaoji.js'

const api = useApi()
const { assetUrl } = api

/* ===== 数据：优先后端接口，接口失败时降级静态数据 ===== */
const notes = ref([])
const noteTags = ref([])
const stats = ref({ total: 0, albums: 0, photos: 0 })
const loading = ref(true)

function normalize(item, isStatic = false) {
  if (isStatic) {
    return {
      ...item,
      slug: String(item.id),
      cover: item.cover ? img(item.cover, 800, 600) : '',
      photoCount: item.photoCount || 0,
      summary: item.excerpt,
      tags: [item.tag],
    }
  }
  return {
    ...item,
    slug: item.slug,
    cover: item.photos?.[0]?.url ? assetUrl(item.photos[0].url) : '',
    photoCount: item.photos?.length || 0,
    summary: item.summary || item.excerpt || '',
    tags: item.tags || [],
  }
}

function applyStatic() {
  notes.value = staticNotes.map((n) => normalize(n, true))
  noteTags.value = [
    { key: 'all', label: '全部' },
    ...staticTags.filter((t) => t.key !== 'all').map((t) => ({ key: t.key, label: t.label })),
  ]
  stats.value = staticStats
}

async function load() {
  try {
    const [list, cats, stat] = await Promise.all([
      api.get('/xiaoji'),
      api.get('/xiaoji/categories'),
      api.get('/xiaoji/stats'),
    ])
    notes.value = (list || []).map((n) => normalize(n))
    noteTags.value = [
      { key: 'all', label: '全部' },
      ...(cats || []).map((c) => ({ key: c.key, label: c.name })),
    ]
    stats.value = stat || { total: 0, albums: 0, photos: 0 }
  } catch {
    applyStatic()
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ===== 分类筛选（与原型 filter-bar 一致：切换 hidden，不重排 DOM） ===== */
const activeTag = ref('all')

function matches(n) {
  return activeTag.value === 'all' || (n.tags || []).includes(activeTag.value)
}

const visibleCount = computed(() => notes.value.filter((n) => matches(n)).length)

/* ===== 工具 ===== */
function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${y}.${m}.${day}`
}

// 离线兜底：图片加载失败时换成内联 SVG 占位
function onErr(e) {
  const el = e.target
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
    <rect width='100%' height='100%' fill='#eef1ee'/>
    <text x='50%' y='50%' fill='#8a948d' font-size='28' font-family='serif' text-anchor='middle' dominant-baseline='middle'>小记 · 图片离线</text>
  </svg>`
  el.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
</script>

<template>
  <AppHeader active-key="" />

  <main class="journal-page">
    <!-- Hero -->
    <section class="page-hero journal-hero">
      <div class="hero-glow"></div>
      <div class="page-hero-content">
        <span class="kicker">Travel · 旅行小记</span>
        <h1 class="page-title">小记</h1>
        <p class="page-lede">
          相册与随笔。这里有登山的喘息、徒步的泥泞、City walk 的悠闲，也有一碗面里的城市脾气。
          不追求宏大，只记录路上那些让我停下来的瞬间。
        </p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">{{ stats.total }}</span>
            <span class="stat-label">篇小记</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ stats.albums }}</span>
            <span class="stat-label">组相册</span>
          </div>
          <div class="stat">
            <span class="stat-num">{{ stats.photos }}+</span>
            <span class="stat-label">张照片</span>
          </div>
        </div>
      </div>
    </section>

    <div class="journal-container">
      <!-- 筛选条 -->
      <nav class="filter-bar" aria-label="小记分类">
        <button
          v-for="t in noteTags"
          :key="t.key"
          class="filter-btn"
          :class="{ active: activeTag === t.key }"
          type="button"
          @click="activeTag = t.key"
        >
          {{ t.label }}
        </button>
        <div class="filter-count">{{ visibleCount }} / {{ notes.length }} 篇</div>
      </nav>

      <!-- 卡片网格 -->
      <div class="journal-grid">
        <RouterLink
          v-for="n in notes"
          :key="n.slug"
          class="journal-card"
          :class="[n.type, { hidden: !matches(n) }]"
          :to="`/xiaoji/${n.slug}`"
        >
          <!-- 相册封面 -->
          <div v-if="n.type === 'album'" class="journal-cover">
            <img
              :src="n.cover"
              :alt="n.title"
              loading="lazy"
              @error="onErr"
            />
            <span class="j-type">相册</span>
            <span class="j-photocount">{{ n.photoCount }} 张</span>
          </div>

          <!-- 随笔封面：优先引文，无引文则用标题文字 -->
          <div v-else-if="n.quote" class="journal-cover essay-quote">
            <span class="j-quote-mark">&ldquo;</span>
            <p class="j-quote">{{ n.quote }}</p>
          </div>
          <div v-else class="journal-cover essay-title">
            <p class="j-title-cover">{{ n.title }}</p>
          </div>

          <div class="j-body">
            <div class="j-meta">
              <span class="j-loc">{{ n.location }}</span>
              <span class="j-dot"></span>
              <time :datetime="n.date">{{ fmtDate(n.date) }}</time>
            </div>
            <h3 class="j-title">{{ n.title }}</h3>
            <p class="j-excerpt">{{ n.summary }}</p>
            <span class="j-link">
              {{ n.type === 'album' ? '查看相册' : '阅读全文' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </main>

  <AppFooter />
</template>

<style scoped>
/* ===== Journal Page（严格按 prototypes/xiaoji.html） ===== */
.journal-page {
  --j-line: #e3e7e2;
}

.journal-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Hero */
.journal-hero {
  position: relative;
  padding: 80px 0 48px;
  text-align: center;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 640px;
  height: 640px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(45, 130, 100, 0.10), transparent 70%);
  pointer-events: none;
}

.page-hero-content {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  padding: 0 24px;
}

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 11px;
}

.kicker::before {
  content: '';
  width: 32px;
  height: 1px;
  background: currentColor;
}

.page-title {
  margin: 0 0 13px;
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--text-primary);
}

.page-lede {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 27px;
}

.stat {
  text-align: center;
}

.stat-num {
  display: block;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.05em;
}

/* 筛选条 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  padding-top: 48px;
  border-top: 1px solid var(--j-line);
}

.filter-btn {
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 100px;
  cursor: pointer;
  transition: all var(--transition);
}

.filter-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.filter-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.filter-count {
  margin-left: auto;
  font-size: 14px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* 卡片网格 */
.journal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-bottom: 120px;
}

.journal-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    border-color var(--transition);
  animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.journal-card:nth-child(1) { animation-delay: 0.05s; }
.journal-card:nth-child(2) { animation-delay: 0.1s; }
.journal-card:nth-child(3) { animation-delay: 0.15s; }
.journal-card:nth-child(4) { animation-delay: 0.2s; }
.journal-card:nth-child(5) { animation-delay: 0.25s; }
.journal-card:nth-child(6) { animation-delay: 0.3s; }
.journal-card:nth-child(7) { animation-delay: 0.35s; }
.journal-card:nth-child(8) { animation-delay: 0.4s; }
.journal-card:nth-child(9) { animation-delay: 0.45s; }

.journal-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: rgba(45, 130, 100, 0.35);
}

.journal-card.hidden {
  display: none;
}

.journal-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.journal-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--bg-soft);
  overflow: hidden;
}

.journal-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.journal-card:hover .journal-cover img {
  transform: scale(1.05);
}

.j-type {
  position: absolute;
  top: 14px;
  left: 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: rgba(26, 26, 26, 0.65);
  backdrop-filter: blur(4px);
  padding: 4px 12px;
  border-radius: 100px;
}

.j-photocount {
  position: absolute;
  bottom: 12px;
  right: 12px;
  font-size: 12px;
  color: #fff;
  background: rgba(26, 26, 26, 0.65);
  padding: 4px 10px;
  border-radius: 100px;
}

/* 随笔引文封面 */
.essay-quote {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 28px 30px;
  background: linear-gradient(135deg, rgba(45, 130, 100, 0.08), rgba(45, 130, 100, 0.03));
  aspect-ratio: auto;
  min-height: 230px;
  border-bottom: 1px solid var(--j-line);
}

/* 随笔标题封面（未填写引文时） */
.essay-title {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 28px 30px;
  text-align: center;
  background: linear-gradient(135deg, rgba(45, 130, 100, 0.08), rgba(45, 130, 100, 0.03));
  aspect-ratio: auto;
  min-height: 230px;
  border-bottom: 1px solid var(--j-line);
}

.j-title-cover {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  line-height: 1.5;
  color: var(--text-primary);
}

.j-quote-mark {
  font-family: var(--font-serif);
  font-size: 56px;
  line-height: 0.5;
  color: var(--accent);
  opacity: 0.4;
}

.j-quote {
  margin: 22px 0 0;
  font-family: var(--font-serif);
  font-size: 19px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* 卡片内容 */
.j-body {
  padding: 22px 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.j-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.j-loc {
  color: var(--accent);
  font-weight: 500;
}

.j-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-tertiary);
  opacity: 0.6;
}

.j-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 20px;
  line-height: 1.45;
  color: var(--text-primary);
  transition: color var(--transition);
}

.journal-card:hover .j-title {
  color: var(--accent);
}

.j-excerpt {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.j-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 6px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.j-link svg {
  width: 14px;
  height: 14px;
  transition: transform var(--transition);
}

.journal-card:hover .j-link svg {
  transform: translateX(4px);
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .journal-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .journal-hero {
    padding: 64px 0 38px;
  }
}

@media (max-width: 768px) {
  .journal-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .filter-bar {
    padding-top: 32px;
  }

  .journal-hero {
    padding: 54px 0 28px;
  }

  .hero-stats {
    gap: 16px;
  }
}
</style>
