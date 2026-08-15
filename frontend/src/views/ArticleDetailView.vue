<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import ArticleCover from '@/components/ArticleCover.vue'
import { articleContent, articleTitles } from '@/data/articleContent'
import { renderMarkdown } from '@/utils/markdown'
import { useApi } from '@/composables/useApi'

const route = useRoute()
const api = useApi()

/* ===== 当前文章 ===== */
const slug = computed(() => route.params.slug)

// 从后端按 slug 拉取知识库文章详情；字段缺失/失败时降级到静态数据
const loading = ref(true)
const notFound = ref(false)
const article = ref({
  title: '',
  summary: '',
  content: '',
  coverImage: '',
  author: '',
  tags: [],
  categoryKey: '',
  createdAt: '',
  viewCount: 0,
})

async function loadArticle() {
  loading.value = true
  notFound.value = false
  try {
    const data = await api.get(`/articles/slug/${encodeURIComponent(slug.value)}`)
    article.value = {
      title: data.title || '',
      summary: data.summary || '',
      content: data.content || '',
      coverImage: data.coverImage || '',
      author: data.author || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      categoryKey: data.categoryKey || '',
      createdAt: data.createdAt || '',
      viewCount: data.viewCount || 0,
    }
  } catch (e) {
    // 降级：使用前端静态 mock 内容，保证页面不空白
    const md = articleContent[slug.value] || ''
    article.value = {
      title: articleTitles[slug.value] || slug.value,
      summary: '',
      content: md,
      coverImage: '',
      author: '林深',
      tags: [],
      categoryKey: '',
      createdAt: '',
      viewCount: 0,
    }
    if (e && e.message === '文章不存在或未发布') notFound.value = true
  } finally {
    loading.value = false
  }
}

const articleTitle = computed(() => article.value.title)
const articleMd = computed(() => article.value.content)
const articleHtml = computed(() => renderMarkdown(articleMd.value))

/* ===== 阅读进度条 ===== */
const progress = ref(0)

function onScroll() {
  const h = document.documentElement
  progress.value = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100
}

/* ===== 目录：扫描正文 h1/h2/h3/h4，构建四级嵌套树（h1 为根节点） ===== */
const contentEl = ref(null)
const tocTree = ref([])
const activeId = ref('')

/** id -> 上级 id（h1 为 null，h2 挂最近的 h1，h3 挂最近的 h2，h4 挂最近的 h3），构建后不再变化 */
let parentOf = new Map()
/** id -> 标题 DOM，供点击目录跳转使用 */
let headingById = new Map()
let observer = null

function buildToc() {
  if (!contentEl.value) return []
  // 限定在 .markdown-body 内扫描，避免把页面顶部独立的 .article-title h1 也扫进目录
  const headings = Array.from(
    contentEl.value.querySelectorAll(
      '.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4',
    ),
  )
  const parents = new Map()
  const elements = new Map()
  const nodes = new Map()
  const tree = []
  let lastH1 = null
  let lastH2 = null
  let lastH3 = null

  headings.forEach((h) => {
    let parentId = null
    if (h.tagName === 'H1') {
      lastH1 = h.id
      lastH2 = null
      lastH3 = null
    } else if (h.tagName === 'H2') {
      parentId = lastH1
      lastH2 = h.id
      lastH3 = null
    } else if (h.tagName === 'H3') {
      parentId = lastH2
      lastH3 = h.id
    } else {
      // h4：优先挂最近的 h3，没有 h3 则回退到最近的 h2
      parentId = lastH3 || lastH2
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

/** markdown 渲染完成后重建 TOC 与滚动监听 */
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

/* ===== scroll-spy：当前小节高亮 + 祖先链浅色标记 ===== */
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

/** 走 scrollIntoView 而非原生锚点，避免 hash 路由被 #id 顶掉；落点偏移由 scroll-margin-top 负责 */
function scrollToHeading(id) {
  const target = headingById.get(id)
  if (target) target.scrollIntoView()
}

/* ===== 代码块一键复制（事件委托，挂在正文容器上） ===== */
function onContentClick(e) {
  const btn = e.target.closest('.code-copy')
  if (!btn) return
  const wrap = btn.closest('.code-block-wrap')
  const codeEl = wrap && wrap.querySelector('pre.code-block code')
  if (!codeEl) return
  const text = codeEl.textContent || ''
  const done = () => {
    const old = btn.textContent
    btn.textContent = '已复制'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = old
      btn.classList.remove('copied')
    }, 1500)
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallbackCopy)
  } else {
    fallbackCopy()
  }
  function fallbackCopy() {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      done()
    } catch (_) {
      /* ignore */
    }
    document.body.removeChild(ta)
  }
}

onMounted(() => {
  loadArticle()

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  if (contentEl.value) contentEl.value.addEventListener('click', onContentClick)
})

/* slug 变化时（同组件内路由切换）重新加载文章并重建 TOC */
watch(slug, () => {
  loadArticle()
})

// 正文渲染完成后重建 TOC 与滚动监听
watch(articleHtml, () => {
  // 等待 v-html 把新 DOM 写入后再扫描
  requestAnimationFrame(setupContentObservers)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (observer) observer.disconnect()
  observer = null
  if (contentEl.value) contentEl.value.removeEventListener('click', onContentClick)
})
</script>

<template>
  <div class="progress" :style="{ width: progress + '%' }" />

  <AppHeader active-key="kb" />

  <div class="layout">
    <article ref="contentEl" class="article">
      <RouterLink to="/articles" class="back-link">
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
        返回文章列表
      </RouterLink>

      <p v-if="loading" class="empty-hint">文章加载中…</p>
      <p v-else-if="notFound" class="empty-hint">找不到该文章，或文章尚未发布。</p>
      <template v-else>
      <nav class="breadcrumb" aria-label="当前分类路径">
        <RouterLink to="/articles">文章</RouterLink>
        <span class="sep">/</span>
        <a href="#">{{ article.categoryKey || '知识库' }}</a>
        <span class="sep">/</span>
        <span class="current">{{ articleTitle }}</span>
      </nav>

      <h1 class="article-title">{{ articleTitle }}</h1>
      <p v-if="article.summary" class="article-lead">{{ article.summary }}</p>

      <ArticleCover
        :title="articleTitle"
        :cover-image="article.coverImage"
        ratio="16/9"
        :max-lines="3"
        class="cover"
      />

      <div class="content markdown-body" v-html="articleHtml" />
      <p v-if="!articleHtml" class="empty-hint">该文章暂无正文内容。</p>

      <div v-if="article.tags.length" class="tags">
        <a v-for="t in article.tags" :key="t" href="#" class="tag">{{ t }}</a>
      </div>

      <div class="author-card">
        <span class="avatar">{{ (article.author || '作')[0] }}</span>
        <div>
          <div class="a-name">{{ article.author || '匿名作者' }}</div>
          <div class="a-bio">知识库作者</div>
        </div>
      </div>
      </template>
    </article>

    <aside class="toc">
      <nav aria-label="文章目录">
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
                <ul v-if="lv2.children.length">
                  <li v-for="lv3 in lv2.children" :key="lv3.id">
                    <a
                      :href="`#${lv3.id}`"
                      :class="linkClass(lv3.id)"
                      :aria-current="lv3.id === activeId ? 'location' : undefined"
                      @click.prevent="scrollToHeading(lv3.id)"
                    >
                      {{ lv3.text }}
                    </a>
                    <ul v-if="lv3.children.length">
                      <li v-for="lv4 in lv3.children" :key="lv4.id">
                        <a
                          :href="`#${lv4.id}`"
                          :class="linkClass(lv4.id)"
                          :aria-current="lv4.id === activeId ? 'location' : undefined"
                          @click.prevent="scrollToHeading(lv4.id)"
                        >
                          {{ lv4.text }}
                        </a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  </div>

  <AppFooter />
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

.breadcrumb .current {
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

.article-lead {
  font-size: 17px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 24px;
  font-weight: 300;
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

.article-meta .author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2d8264, #5fc59a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.article-meta .author-name {
  color: var(--text-primary);
  font-weight: 500;
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

/* ===== Cover ===== */
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
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
  font-family: var(--font-serif);
  font-size: 120px;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  letter-spacing: 0.1em;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.35);
}

.cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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

/* ===== Tags & author ===== */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 48px 0 36px;
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

.author-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 24px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  margin-bottom: 40px;
}

.author-card .avatar {
  width: 52px;
  height: 52px;
  font-size: 20px;
}

.author-card .a-name {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
}

.author-card .a-bio {
  font-size: 13.5px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ===== TOC sidebar (multi-level, up to 3 levels) ===== */
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

.toc-list ul ul a {
  padding-left: 12px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.toc-list ul ul ul a {
  padding-left: 12px;
  font-size: 12.5px;
  color: var(--text-tertiary);
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

.toc-list ul ul a.active,
.toc-list ul ul ul a.active {
  font-weight: 500;
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
    font-size: 72px;
  }
}

@media (max-width: 480px) {
  .article-meta {
    gap: 10px;
  }
}
</style>

<!-- markdown 内容由 v-html 渲染，scoped 样式无法穿透，因此排版样式以非 scoped 块单独声明 -->
<style>
/* ===== Body typography（原型 article-detail.html 逐条对齐） ===== */
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

.content.markdown-body h4 {
  font-family: var(--font-sans);
  font-size: 15.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 26px 0 10px;
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

/* inline code */
.content.markdown-body code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background-color: var(--accent-light);
  color: var(--accent-hover);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ===== Code block（marked + highlight.js 输出） ===== */
/* ===== One Dark Pro 主题 ===== */
.content.markdown-body .code-block-wrap {
  margin: 0 0 26px;
  border: 1px solid #181a1f;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: #282c34;
}

.content.markdown-body .code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background-color: #21252b;
  border-bottom: 1px solid #181a1f;
}

.content.markdown-body .code-lang {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #abb2bf;
}

.content.markdown-body .code-copy {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  color: #abb2bf;
  background: transparent;
  border: 1px solid #3a3f4b;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.content.markdown-body .code-copy:hover {
  color: #ffffff;
  border-color: #61afef;
}

.content.markdown-body .code-copy.copied {
  color: #98c379;
  border-color: #98c379;
}

.content.markdown-body .code-block {
  background-color: #282c34;
  color: #abb2bf;
  border-radius: 0;
  border: none;
  padding: 18px 22px;
  overflow-x: auto;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.75;
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

/* highlight.js token 配色 —— One Dark Pro 主题 */
.content.markdown-body .hljs-comment,
.content.markdown-body .hljs-quote {
  color: #5c6370;
  font-style: italic;
}

.content.markdown-body .hljs-keyword,
.content.markdown-body .hljs-selector-tag,
.content.markdown-body .hljs-literal,
.content.markdown-body .hljs-section,
.content.markdown-body .hljs-doctag {
  color: #c678dd;
}

.content.markdown-body .hljs-string,
.content.markdown-body .hljs-template-tag,
.content.markdown-body .hljs-addition,
.content.markdown-body .hljs-regexp {
  color: #98c379;
}

.content.markdown-body .hljs-attr,
.content.markdown-body .hljs-attribute {
  color: #d19a66;
}

.content.markdown-body .hljs-number,
.content.markdown-body .hljs-type,
.content.markdown-body .hljs-built_in,
.content.markdown-body .hljs-class .hljs-title,
.content.markdown-body .hljs-symbol,
.content.markdown-body .hljs-meta {
  color: #d19a66;
}

.content.markdown-body .hljs-variable,
.content.markdown-body .hljs-property,
.content.markdown-body .hljs-params,
.content.markdown-body .hljs-tag {
  color: #e06c75;
}

.content.markdown-body .hljs-title,
.content.markdown-body .hljs-function .hljs-title,
.content.markdown-body .hljs-name {
  color: #61afef;
}

.content.markdown-body .hljs-meta .hljs-keyword {
  color: #56b6c2;
}

.content.markdown-body .hljs-deletion {
  color: #e06c75;
}

.content.markdown-body .hljs-link {
  color: #61afef;
  text-decoration: underline;
}

.content.markdown-body .hljs-emphasis {
  font-style: italic;
}

.content.markdown-body .hljs-strong {
  font-weight: 600;
  color: #ffffff;
}

/* ===== :::callout 提示框（复用原型 .callout 外观） ===== */
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

/* md-callout 由 :::tip / :::warning / :::info 生成，复用 .callout 全量外观，
   仅通过 data-type 切换左边框颜色区分类型 */
.content.markdown-body .md-callout[data-type='warning'] {
  border-left-color: #e0a458;
}

.content.markdown-body .md-callout[data-type='info'] {
  border-left-color: #5b8def;
}

/* ===== Figure / image / table / hr（原型 article-detail.html 对齐） ===== */
.content.markdown-body figure {
  margin: 30px 0;
}

.content.markdown-body figure .fig-img {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: linear-gradient(135deg, #5b8def, #2d8264 70%);
}

.content.markdown-body figcaption {
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 10px;
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
