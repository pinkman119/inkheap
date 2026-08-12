<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { noteContent, noteTitles } from '@/data/noteContent'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()

/* ===== 当前笔记 ===== */
const noteId = computed(() => route.params.id)
const noteTitle = computed(() => noteTitles[noteId.value] || '小记')
const noteMd = computed(() => noteContent[noteId.value] || '')
const noteHtml = computed(() => renderMarkdown(noteMd.value))

/* ===== 阅读进度条 ===== */
const progress = ref(0)

function onScroll() {
  const h = document.documentElement
  progress.value = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100
}

/* ===== 目录：扫描正文 h2/h3，构建两级嵌套树 ===== */
const contentEl = ref(null)
const tocTree = ref([])
const activeId = ref('')

let parentOf = new Map()
let headingById = new Map()
let observer = null

function buildToc() {
  if (!contentEl.value) return []
  const headings = Array.from(contentEl.value.querySelectorAll('h2, h3'))
  const parents = new Map()
  const elements = new Map()
  const nodes = new Map()
  const tree = []
  let lastH2 = null

  headings.forEach((h) => {
    let parentId = null
    if (h.tagName === 'H2') {
      lastH2 = h.id
    } else {
      parentId = lastH2
    }

    const node = { id: h.id, text: h.textContent, children: [] }
    parents.set(h.id, parentId)
    elements.set(h.id, h)
    nodes.set(h.id, node)

    const parent = parentId ? nodes.get(parentId) : null
    if (parent) parent.children.push(node)
    else tree.push(node)
  })

  parentOf = parents
  headingById = elements
  tocTree.value = tree

  return headings
}

function setupContentObservers() {
  const headings = buildToc()

  if (observer) observer.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) activeId.value = entry.target.id
      })
    },
    { rootMargin: '-80px 0px -65% 0px', threshold: 0 },
  )
  headings.forEach((h) => observer.observe(h))
}

const branchIds = computed(() => {
  const chain = new Set()
  let cur = parentOf.get(activeId.value)
  while (cur) {
    chain.add(cur)
    cur = parentOf.get(cur)
  }
  return chain
})

function linkClass(id) {
  return { active: id === activeId.value, branch: branchIds.value.has(id) }
}

function scrollToHeading(id) {
  const target = headingById.get(id)
  if (target) target.scrollIntoView()
}

/* ===== 从 notes 数据中提取当前笔记元信息 ===== */
import { notes, noteTags } from '@/data/notes'

const currentNote = computed(() => notes.find((n) => n.id === noteId.value))
const currentTagLabel = computed(() => {
  if (!currentNote.value) return ''
  const tag = noteTags.find((t) => t.key === currentNote.value.tag)
  return tag ? tag.label : currentNote.value.coverTag
})

onMounted(() => {
  setupContentObservers()
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

watch(noteHtml, () => {
  requestAnimationFrame(setupContentObservers)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (observer) observer.disconnect()
  observer = null
})
</script>

<template>
  <div class="progress" :style="{ width: progress + '%' }" />

  <AppHeader active-key="notes" />

  <div class="layout">
    <article ref="contentEl" class="article">
      <RouterLink to="/xiaoji" class="back-link">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        返回小记列表
      </RouterLink>

      <nav class="breadcrumb" aria-label="当前位置">
        <RouterLink to="/xiaoji">小记</RouterLink>
        <span class="sep">/</span>
        <span v-if="currentTagLabel" class="current-tag">{{ currentTagLabel }}</span>
      </nav>

      <h1 class="article-title">{{ noteTitle }}</h1>

      <div v-if="currentNote" class="article-meta">
        <div class="meta-item">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {{ currentNote.meta }}
        </div>
        <span class="dot">·</span>
        <span class="meta-item tag-label">{{ currentNote.coverTag }}</span>
      </div>

      <div v-if="currentNote" class="cover">
        <div class="cover-glyph">{{ currentNote.glyph }}</div>
      </div>

      <div class="content markdown-body" v-html="noteHtml" />
      <p v-if="!noteHtml" class="empty-hint">该小记暂无正文内容。</p>

      <div v-if="currentNote" class="note-footer">
        <div class="tags">
          <a href="#" class="tag">{{ currentNote.coverTag }}</a>
          <a href="#" class="tag">小记</a>
          <a href="#" class="tag">生活</a>
        </div>
      </div>
    </article>

    <aside class="toc" v-if="tocTree.length">
      <nav aria-label="目录">
        <div class="toc-title">目录</div>
        <ul class="toc-list">
          <li v-for="lv1 in tocTree" :key="lv1.id">
            <a
              :href="`#${lv1.id}`"
              :class="linkClass(lv1.id)"
              :aria-current="lv1.id === activeId ? 'location' : undefined"
              @click.prevent="scrollToHeading(lv1.id)"
            >
              {{ lv1.text }}
            </a>
            <ul v-if="lv1.children.length">
              <li v-for="lv2 in lv1.children" :key="lv2.id">
                <a
                  :href="`#${lv2.id}`"
                  :class="linkClass(lv2.id)"
                  :aria-current="lv2.id === activeId ? 'location' : undefined"
                  @click.prevent="scrollToHeading(lv2.id)"
                >
                  {{ lv2.text }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  </div>

  <AppFooter padding-y="36px" />
</template>

<style scoped>
/* ===== Reading progress ===== */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background-color: var(--accent);
  z-index: 200;
  transition: width 0.1s linear;
}

/* ===== Layout ===== */
.layout {
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 24px 80px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 56px;
  align-items: start;
}

.article {
  min-width: 0;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .toc {
    display: none;
  }
}

/* ===== Breadcrumb ===== */
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 28px;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
}

.breadcrumb a:hover {
  color: var(--accent);
}

.breadcrumb .sep {
  color: var(--text-tertiary);
}

.breadcrumb .current-tag {
  color: var(--text-primary);
  font-weight: 500;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
  margin-bottom: 20px;
  font-weight: 500;
}

.back-link:hover {
  color: var(--accent-hover);
}

/* ===== Article header ===== */
.article-title {
  font-family: var(--font-serif);
  font-size: 38px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.01em;
  margin-bottom: 16px;
  padding-left: 20px;
  position: relative;
  scroll-margin-top: 90px;
}

.article-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 5px;
  background-color: var(--accent);
  border-radius: 2px;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 36px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.article-meta .dot {
  color: var(--text-tertiary);
}

.article-meta .meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.article-meta svg {
  width: 15px;
  height: 15px;
  color: var(--text-tertiary);
}

.tag-label {
  padding: 2px 10px;
  border-radius: 100px;
  background-color: var(--accent-light);
  color: var(--accent-hover);
  font-weight: 500;
  font-size: 12px;
}

/* ===== Cover ===== */
.cover {
  width: 100%;
  aspect-ratio: 21 / 9;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
  position: relative;
  box-shadow: var(--shadow-sm);
  background:
    radial-gradient(120% 140% at 12% 18%, #ff8a5c 0%, transparent 42%),
    radial-gradient(120% 140% at 88% 22%, #5b8def 0%, transparent 45%),
    radial-gradient(140% 150% at 70% 95%, #2d8264 0%, transparent 50%),
    linear-gradient(135deg, #1a1a1a, #2b2b2b);
}

.cover-glyph {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.35);
}

/* ===== Content container ===== */
.content {
  font-size: 16px;
  color: var(--text-primary);
}

.empty-hint {
  color: var(--text-tertiary);
  font-size: 15px;
  padding: 40px 0;
  text-align: center;
}

/* ===== Footer ===== */
.note-footer {
  margin-top: 48px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  font-size: 13px;
  color: var(--text-secondary);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 100px;
  text-decoration: none;
  transition: all var(--transition);
}

.tag:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}

/* ===== TOC sidebar ===== */
.toc {
  position: sticky;
  top: 92px;
  max-height: calc(100vh - 116px);
  overflow-y: auto;
  padding-right: 4px;
}

.toc::-webkit-scrollbar {
  width: 6px;
}

.toc::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.toc::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.toc-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 16px;
  padding-left: 8px;
}

.toc-list,
.toc-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.toc-list {
  border-left: 1px solid var(--border);
}

.toc-list ul {
  border-left: 1px solid var(--border);
  margin-left: 14px;
}

.toc-list a {
  display: block;
  padding: 7px 14px 7px 12px;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -1px;
  transition:
    color var(--transition),
    border-color var(--transition),
    background-color var(--transition);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-list ul a {
  padding-left: 12px;
  font-size: 13.5px;
}

.toc-list a:hover {
  color: var(--text-primary);
  background-color: var(--bg-sidebar);
}

.toc-list a.branch {
  color: var(--text-primary);
}

.toc-list a.active {
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 500;
  background-color: var(--accent-light);
}

@media (max-width: 768px) {
  .layout {
    padding: 32px 16px 56px;
  }

  .article-title {
    font-size: 28px;
  }

  .cover {
    aspect-ratio: 16/9;
  }

  .cover-glyph {
    font-size: 56px;
  }
}
</style>

<!-- markdown 排版样式（非 scoped，穿透 v-html） -->
<style>
/* ===== Body typography（与 ArticleDetailView 一致的排版风格） ===== */
.content.markdown-body {
  font-size: 16px;
  color: var(--text-primary);
}

.content.markdown-body h1 {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.35;
  margin: 48px 0 18px;
  padding-left: 16px;
  position: relative;
  scroll-margin-top: 90px;
}

.content.markdown-body h1::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}

.content.markdown-body h2 {
  font-family: var(--font-serif);
  font-size: 25px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 48px 0 18px;
  padding-left: 16px;
  position: relative;
  scroll-margin-top: 90px;
}

.content.markdown-body h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}

.content.markdown-body h3 {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 34px 0 14px;
  scroll-margin-top: 90px;
}

.content.markdown-body p {
  margin-bottom: 22px;
  color: var(--text-primary);
}

.content.markdown-body a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--accent-light);
  transition: all var(--transition);
}

.content.markdown-body a:hover {
  color: var(--accent-hover);
  border-bottom-color: var(--accent-hover);
}

.content.markdown-body ul,
.content.markdown-body ol {
  margin: 0 0 22px;
  padding-left: 22px;
}

.content.markdown-body li {
  margin-bottom: 10px;
}

.content.markdown-body strong {
  font-weight: 600;
  color: var(--text-primary);
}

.content.markdown-body blockquote {
  margin: 28px 0;
  padding: 16px 22px;
  border-left: 3px solid var(--accent);
  background-color: var(--accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-style: normal;
}

.content.markdown-body blockquote p:last-child {
  margin-bottom: 0;
}

.content.markdown-body code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background-color: var(--accent-light);
  color: var(--accent-hover);
  padding: 2px 6px;
  border-radius: 4px;
}

.content.markdown-body .code-block {
  background-color: #161616;
  color: #e6e6e6;
  border-radius: var(--radius-md);
  padding: 20px 22px;
  overflow-x: auto;
  margin: 0 0 26px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.75;
  border: 1px solid #000;
}

.content.markdown-body .code-block code.hljs {
  display: block;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

/* highlight.js token 配色 */
.content.markdown-body .hljs-comment,
.content.markdown-body .hljs-quote {
  color: #6b6b6b;
  font-style: italic;
}

.content.markdown-body .hljs-keyword,
.content.markdown-body .hljs-selector-tag,
.content.markdown-body .hljs-literal,
.content.markdown-body .hljs-section,
.content.markdown-body .hljs-name {
  color: #5fc59a;
}

.content.markdown-body .hljs-string,
.content.markdown-body .hljs-attr,
.content.markdown-body .hljs-template-tag,
.content.markdown-body .hljs-addition {
  color: #e0b27a;
}

.content.markdown-body .hljs-number,
.content.markdown-body .hljs-type,
.content.markdown-body .hljs-built_in,
.content.markdown-body .hljs-class .hljs-title {
  color: #8fb3ff;
}

.content.markdown-body .hljs-attribute,
.content.markdown-body .hljs-variable,
.content.markdown-body .hljs-property {
  color: #d3c6a5;
}

.content.markdown-body .hljs-title,
.content.markdown-body .hljs-function .hljs-title {
  color: #c5e1a5;
}

.content.markdown-body .hljs-meta {
  color: #8a8a8a;
}

.content.markdown-body .hljs-emphasis {
  font-style: italic;
}

.content.markdown-body .hljs-strong {
  font-weight: 600;
}

[data-theme='dark'] .content.markdown-body .code-block {
  background-color: #0c0c0c;
  border-color: #000;
}

/* ===== :::callout ===== */
.content.markdown-body .callout {
  display: flex;
  gap: 14px;
  margin: 28px 0;
  padding: 18px 20px;
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}

.content.markdown-body .callout .c-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.content.markdown-body .callout p {
  font-size: 14.5px;
  color: var(--text-secondary);
  margin: 0;
}

.content.markdown-body .md-callout[data-type='warning'] {
  border-left-color: #e0a458;
}

.content.markdown-body .md-callout[data-type='info'] {
  border-left-color: #5b8def;
}

.content.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: 8px 0 24px;
  display: block;
}

.content.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 26px;
  font-size: 14.5px;
  overflow: hidden;
  border-radius: var(--radius-sm);
}

.content.markdown-body th,
.content.markdown-body td {
  border: 1px solid var(--border-light);
  padding: 10px 14px;
  text-align: left;
}

.content.markdown-body th {
  background-color: var(--bg-sidebar);
  font-weight: 600;
  color: var(--text-primary);
}

.content.markdown-body tr:nth-child(even) td {
  background-color: var(--bg-card);
}

.content.markdown-body hr {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 36px 0;
}
</style>
