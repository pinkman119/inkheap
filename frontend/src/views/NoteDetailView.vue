<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useApi } from '@/composables/useApi'
import { renderMarkdown } from '@/utils/markdown'
import { renderDiagrams } from '@/utils/diagram'
import { isDark } from '@/composables/useTheme'
import { notes as staticNotes, img } from '@/data/xiaoji.js'

const props = defineProps({
  slug: { type: String, default: '' },
})

const api = useApi()
const { assetUrl } = api

/* ===== 数据：优先后端接口，接口失败时降级静态数据 ===== */
const note = ref(null)
const prev = ref(null)
const next = ref(null)

function normalize(item, isStatic = false) {
  const photos = (item.photos || []).map((p) =>
    isStatic
      ? { url: img(p.s, 600, 450), caption: p.c }
      : { url: assetUrl(p.url), caption: p.caption || '' },
  )
  const cover = item.cover
    ? assetUrl(item.cover)
    : isStatic
      ? photos[0]?.url || img(item.cover || 'xiaoji', 1200, 520)
      : photos[0]?.url || ''
  return {
    ...item,
    slug: item.slug ?? String(item.id),
    photos,
    cover,
    content: item.content || item.body || '',
    excerpt: item.summary || item.excerpt || '',
  }
}

function applyStatic() {
  const i = staticNotes.findIndex((n) => String(n.id) === props.slug)
  const idx = i === -1 ? 0 : i
  note.value = normalize(staticNotes[idx], true)
  prev.value = normalize(staticNotes[(idx - 1 + staticNotes.length) % staticNotes.length], true)
  next.value = normalize(staticNotes[(idx + 1) % staticNotes.length], true)
}

async function load() {
  try {
    const d = await api.get(`/xiaoji/slug/${encodeURIComponent(props.slug)}`)
    note.value = normalize(d, false)
    prev.value = d.prev ? normalize(d.prev, false) : null
    next.value = normalize(d.next || {}, false)
    if (next.value && !next.value.slug) next.value = null
  } catch {
    applyStatic()
  }
}

watch(
  () => props.slug,
  () => load(),
  { immediate: true },
)

const typeLabel = computed(() => (note.value?.type === 'album' ? '相册' : '随笔'))
const bodyHtml = computed(() => renderMarkdown(note.value?.content || ''))

/* ===== 正文里的文本绘图（mermaid），v-html 写入后异步渲染 ===== */
const proseEl = ref(null)

watch(bodyHtml, () => {
  requestAnimationFrame(() => renderDiagrams(proseEl.value))
})

// 深浅色切换后 mermaid 的配色需要重绘
watch(isDark, () => {
  renderDiagrams(proseEl.value, { force: true })
})

/* ===== 阅读进度条 ===== */
const progressEl = ref(null)

function onScroll() {
  const h = document.documentElement
  const max = h.scrollHeight - h.clientHeight
  if (progressEl.value) {
    progressEl.value.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%'
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
})

/* ===== Lightbox ===== */
const lbOpen = ref(false)
const lbIndex = ref(0)
const lbPhotos = computed(() => note.value?.photos || [])
const lbPhoto = computed(() => lbPhotos.value[lbIndex.value] || { url: '', caption: '' })
let lastFocus = null

function showLb(i) {
  if (!lbPhotos.value.length) return
  lbIndex.value = (i + lbPhotos.value.length) % lbPhotos.value.length
}

function openLb(i, trigger) {
  if (!lbPhotos.value.length) return
  lastFocus = trigger || document.activeElement
  showLb(i)
  lbOpen.value = true
  document.body.style.overflow = 'hidden'
  nextTick(() => closeBtn.value?.focus())
}

function closeLb() {
  if (!lbOpen.value) return
  lbOpen.value = false
  document.body.style.overflow = ''
  if (lastFocus) lastFocus.focus()
}

const closeBtn = ref(null)

function onKeydown(e) {
  if (!lbOpen.value) return
  if (e.key === 'Escape') closeLb()
  else if (e.key === 'ArrowLeft') showLb(lbIndex.value - 1)
  else if (e.key === 'ArrowRight') showLb(lbIndex.value + 1)
}

watch(
  () => note.value?.slug,
  () => {
    closeLb()
    document.title = `${note.value?.title || '小记'} · 小记 · 墨堆`
    nextTick(() => window.scrollTo({ top: 0 }))
    onScroll()
  },
  { immediate: true },
)

/* ===== 图片离线兜底（与原型 fallbackImg 一致） ===== */
function fallbackImg(e) {
  const el = e.target
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='%232d8264'/><stop offset='1' stop-color='%23143f30'/>` +
    `</linearGradient></defs><rect width='800' height='600' fill='url(%23g)'/>` +
    `<text x='400' y='312' fill='rgba(255,255,255,0.72)' font-family='sans-serif' font-size='26' text-anchor='middle'>墨堆 · 旅行影像</text></svg>`
  el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(/%23/g, '#'))
}
</script>

<template>
  <div class="progress" ref="progressEl" aria-hidden="true"></div>

  <AppHeader active-key="" />

  <main class="page">
    <template v-if="note">
    <div class="container">
      <RouterLink class="back-link" to="/xiaoji">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回小记
      </RouterLink>

      <h1 class="d-title">{{ note.title }}</h1>

      <div class="d-meta">
        <span class="d-type">{{ typeLabel }}</span>
        <span v-if="note.location" class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 11-9 11s-9-4-9-11a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {{ note.location }}
        </span>
        <span v-if="note.date" class="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {{ note.date }}
        </span>
        <span class="d-tags">
          <span v-for="t in note.tags" :key="t" class="chip">{{ t }}</span>
        </span>
      </div>

      <template v-if="note.type === 'album'">
        <div class="d-cover">
          <img :src="note.cover" :alt="note.title" @error="fallbackImg" />
        </div>
      </template>
      <div v-else class="d-cover essay-quote">
        <span class="j-quote-mark">&ldquo;</span>
        <p class="j-quote">{{ note.quote || note.excerpt || note.title }}</p>
      </div>

      <!-- 相册 -->
      <template v-if="note.photos && note.photos.length">
        <section class="d-section">
          <h2>相册</h2>
          <span class="count">{{ note.photos.length }} 张</span>
        </section>
        <div class="gallery">
          <div
            v-for="(p, i) in note.photos"
            :key="p.url"
            class="g-thumb"
            tabindex="0"
            role="button"
            :aria-label="`查看照片：${p.caption}`"
            @click="openLb(i, $event.currentTarget)"
            @keydown.enter.prevent="openLb(i, $event.currentTarget)"
            @keydown.space.prevent="openLb(i, $event.currentTarget)"
          >
            <img :src="p.url" :alt="p.caption" loading="lazy" @error="fallbackImg" />
            <span class="g-cap">{{ p.caption }}</span>
          </div>
        </div>
      </template>

      <!-- 小记 -->
      <section class="d-section">
        <h2>小记</h2>
      </section>
      <!-- eslint-disable-next-line vue/no-v-html —— markdown 经 DOMPurify 清洗 -->
      <div ref="proseEl" class="d-prose" v-html="bodyHtml"></div>

      <!-- 上一篇 / 下一篇 -->
      <div class="d-nav">
        <RouterLink v-if="prev" :to="`/xiaoji/${prev.slug}`">
          <span class="dir">← 上一篇</span>
          <span class="nt">{{ prev.title }}</span>
        </RouterLink>
        <RouterLink v-if="next" class="next" :to="`/xiaoji/${next.slug}`">
          <span class="dir">下一篇 →</span>
          <span class="nt">{{ next.title }}</span>
        </RouterLink>
      </div>
    </div>
    </template>
  </main>

  <AppFooter />

  <!-- Lightbox -->
  <div
    class="lightbox"
    :class="{ open: lbOpen }"
    role="dialog"
    aria-modal="true"
    aria-label="照片查看"
    @click.self="closeLb"
  >
    <button ref="closeBtn" class="lightbox__btn lightbox__close" aria-label="关闭" @click="closeLb">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
    <div class="lightbox__inner">
      <img class="lightbox__img" :src="lbPhoto.url" :alt="lbPhoto.caption" @error="fallbackImg" />
      <div class="lightbox__bar">
        <button class="lightbox__btn" aria-label="上一张" @click="showLb(lbIndex - 1)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="lightbox__count">{{ lbIndex + 1 }} / {{ lbPhotos.length }}</span>
        <button class="lightbox__btn" aria-label="下一张" @click="showLb(lbIndex + 1)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div class="lightbox__cap">{{ lbPhoto.caption }}</div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Reading progress（与原型一致） ===== */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background-color: var(--accent);
  z-index: 200;
  transition: width 0.08s linear;
}

/* ===== Detail layout ===== */
.page {
  flex: 1;
}

.container {
  max-width: 920px;
  margin: 0 auto;
  padding: 0 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  margin: 28px 0 0;
  font-weight: 500;
}

.back-link:hover {
  color: var(--accent-hover);
}

.d-type {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  padding: 3px 12px;
  border-radius: 100px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  background-color: var(--accent-light);
  color: var(--accent);
}

.d-title {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.01em;
  margin: 28px 0 18px;
}

.d-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px 22px;
  padding: 16px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 32px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.d-meta .meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.d-meta svg {
  width: 15px;
  height: 15px;
  color: var(--accent);
}

.d-tags {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.d-tags .chip {
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 3px 11px;
  border-radius: 100px;
}

.d-cover {
  width: 100%;
  aspect-ratio: 21 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
  position: relative;
  box-shadow: var(--shadow-sm);
  background: linear-gradient(135deg, #2d8264, #143f30);
}

.d-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 随笔引文封面（与列表页 essay-quote 风格一致） */
.d-cover.essay-quote {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px 40px;
  background: linear-gradient(135deg, rgba(45, 130, 100, 0.08), rgba(45, 130, 100, 0.03));
  aspect-ratio: auto;
  min-height: 240px;
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

/* ===== Section heading（相册 / 旅行感受） ===== */
.d-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 22px;
}

.d-section h2 {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  padding-left: 16px;
}

.d-section h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}

.d-section .count {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ===== Gallery ===== */
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 56px;
}

.g-thumb {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: zoom-in;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #2d8264, #143f30);
  border: 1px solid var(--border-light);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.g-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.g-thumb:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.g-thumb:hover img {
  transform: scale(1.07);
}

.g-thumb .g-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 12px 10px;
  font-size: 12.5px;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.62));
  opacity: 0;
  transition: opacity var(--transition);
}

.g-thumb:hover .g-cap,
.g-thumb:focus-visible .g-cap {
  opacity: 1;
}

.g-thumb:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ===== Prose（旅行感受） ===== */
.d-prose {
  font-size: 16.5px;
  color: var(--text-primary);
}

.d-prose :deep(p) {
  margin-bottom: 22px;
  color: var(--text-primary);
}

.d-prose :deep(h3) {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 600;
  margin: 36px 0 14px;
}

.d-prose :deep(blockquote) {
  margin: 26px 0;
  padding: 16px 22px;
  border-left: 3px solid var(--accent);
  background-color: var(--accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-style: normal;
}

.d-prose :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.d-prose :deep(.lead) {
  font-size: 18px;
  color: var(--text-secondary);
  font-weight: 300;
  margin-bottom: 28px;
}

/* ===== Prev / Next ===== */
.d-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 64px 0 8px;
}

.d-nav a {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 22px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  text-decoration: none;
  color: inherit;
  transition: all var(--transition);
}

.d-nav a:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  box-shadow: var(--shadow-sm);
}

.d-nav .dir {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}

.d-nav .nt {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.d-nav .next {
  text-align: right;
  align-items: flex-end;
}

/* ===== Lightbox ===== */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(8, 8, 8, 0.86);
  backdrop-filter: blur(6px);
}

.lightbox.open {
  display: flex;
}

.lightbox__inner {
  max-width: 1100px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.lightbox__img {
  max-width: 100%;
  max-height: 78vh;
  border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  object-fit: contain;
}

.lightbox__cap {
  color: #e8e8e8;
  font-size: 14px;
  text-align: center;
}

.lightbox__bar {
  display: flex;
  align-items: center;
  gap: 18px;
}

.lightbox__btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.lightbox__btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: #fff;
}

.lightbox__count {
  font-family: var(--font-mono);
  font-size: 13px;
  color: #cfcfcf;
}

.lightbox__close {
  position: absolute;
  top: 24px;
  right: 24px;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }

  .d-title {
    font-size: 28px;
  }

  .gallery {
    grid-template-columns: repeat(2, 1fr);
  }

  .d-nav {
    grid-template-columns: 1fr;
  }

  .d-nav .next {
    text-align: left;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .gallery {
    grid-template-columns: 1fr;
  }
}
</style>
