<script setup>
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import CategoryTreeNode from '@/components/CategoryTreeNode.vue'
import ArticleCover from '@/components/ArticleCover.vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { takePreloaded } from '@/composables/usePreload'
import { useSiteIdentity } from '@/composables/useSiteIdentity'
import { resolveAuthor } from '@/utils/author'

const api = useApi()
const router = useRouter()

// 站点身份：文章未设置作者时，回退展示站点名（后台「首页管理」配置）
const { siteName, loadSiteIdentity } = useSiteIdentity()

/* ===== 真实数据（来自后端公开接口） ===== */
const categoryTree = ref([])
const articleList = ref([])
const allCount = ref(null) // 全部已发布文章总数（单一数字，用于"全部"节点计数）
const loading = ref(true)

/* ===== 文章列表分页（首页先渲染 20 篇，滚动触底再追加 20 篇） ===== */
const PAGE_SIZE = 20
const articlePage = ref(1)
const articleTotal = ref(0)
const articleLoadingMore = ref(false)
// 当前筛选条件：选中分类的「含子孙 key 集合」与搜索关键词，用于重新拉取与翻页追加
const activeCategoryKeys = ref(null) // null 表示全部；否则为逗号分隔的 key 串
const activeSearch = ref('')
const articleListEnded = computed(() => articleList.value.length >= articleTotal.value && articleTotal.value > 0)

// 后端文章字段 → 模板字段映射
function mapArticle(a) {
  // 作者链接：未配置时默认跳站点首页；站外链接需新窗口打开
  const authorResolved = resolveAuthor(a.author, a.authorUrl, '')
  return {
    key: a.slug || a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.summary || '',
    thumbnail: a.coverImage || '',
    categoryKey: a.categoryKey,
    category: categoryNameMap.value[a.categoryKey] || a.categoryKey,
    // 作者名留空时在模板中回退到站点名（响应式，站点身份加载后会刷新）
    authorRaw: authorResolved.name,
    authorHref: authorResolved.href,
    authorExternal: authorResolved.isExternal,
    date: a.createdAt ? a.createdAt.slice(0, 10) : '',
    // 后端返回字段是 viewCount（此处此前误写成 a.views，导致列表阅读量恒为 0）；
    // 设置了虚拟阅读量时按 displayViewCount 展示
    reads: Number(a.displayViewCount ?? a.viewCount ?? 0).toLocaleString(),
    tagList: Array.isArray(a.tags) ? a.tags : [],
    plainAuthorIcon: false,
  }
}

// 分类 key -> name 映射
const categoryNameMap = computed(() => {
  const m = {}
  const walk = (ns) => ns.forEach((n) => { m[n.key] = n.name; if (n.children) walk(n.children) })
  walk(categoryTree.value)
  return m
})

// 组装文章列表请求地址：始终携带当前分类（含子孙）与搜索条件
function buildArticleQuery(page) {
  const usp = new URLSearchParams()
  usp.set('page', page)
  usp.set('pageSize', PAGE_SIZE)
  if (activeCategoryKeys.value) usp.set('categoryKey', activeCategoryKeys.value)
  if (activeSearch.value.trim()) usp.set('search', activeSearch.value.trim())
  return `/articles?${usp.toString()}`
}

// 拉取文章列表：reset=true 时重新加载第一页（首屏 / 切换分类 / 搜索），否则追加下一页
async function loadArticles(reset = true) {
  if (reset) {
    articlePage.value = 1
    loading.value = true
  } else {
    if (articleLoadingMore.value || articleListEnded.value) return
    articleLoadingMore.value = true
  }
  try {
    const res = await api.get(buildArticleQuery(articlePage.value))
    const items = (res && res.items) ? res.items : (Array.isArray(res) ? res : [])
    articleList.value = reset ? items.map(mapArticle) : articleList.value.concat(items.map(mapArticle))
    if (typeof res.total === 'number') {
      articleTotal.value = res.total
      if (reset && activeCategoryKeys.value === null) allCount.value = res.total
    }
    if (typeof res.page === 'number') articlePage.value = res.page
  } catch (e) {
    console.error('加载文章失败', e)
  } finally {
    loading.value = false
    articleLoadingMore.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const tree = await api.get('/categories/tree')
    categoryTree.value = tree || []
  } catch (e) {
    console.error('加载分类树失败', e)
  } finally {
    loading.value = false
  }
  // 文章列表由 loadArticles 按当前筛选条件加载（首屏为「全部」）
  await loadArticles(true)
}

// 滚动触底再加载下一页（每页 20 篇，沿用当前筛选条件）
async function loadMoreArticles() {
  if (articleLoadingMore.value || articleListEnded.value || loading.value) return
  articleLoadingMore.value = true
  const nextPage = articlePage.value + 1
  try {
    const res = await api.get(buildArticleQuery(nextPage))
    const items = (res && res.items) ? res.items : (Array.isArray(res) ? res : [])
    articleList.value = articleList.value.concat(items.map(mapArticle))
    if (typeof res.total === 'number') articleTotal.value = res.total
    if (typeof res.page === 'number') articlePage.value = res.page
  } catch (e) {
    console.error('加载更多文章失败', e)
  } finally {
    articleLoadingMore.value = false
  }
}

// 命中首页预加载缓存：直接装配首屏数据（分类树 + 文章第一页 + 动态第一页），跳过网络请求
function applyPreloaded(cached) {
  categoryTree.value = Array.isArray(cached.tree) ? cached.tree : []
  const listRes = cached.list && typeof cached.list === 'object' ? cached.list : {}
  const listItems = Array.isArray(listRes.items) ? listRes.items : []
  articleList.value = listItems.map(mapArticle)
  if (typeof listRes.total === 'number') {
    articleTotal.value = listRes.total
    // 预加载始终是「全部」条件，total 即全部文章数
    allCount.value = listRes.total
  }
  if (typeof listRes.page === 'number') articlePage.value = listRes.page
  const feedRes = cached.feed && typeof cached.feed === 'object' ? cached.feed : {}
  const feedItems = Array.isArray(feedRes.items) ? feedRes.items : []
  feedList.value = feedItems.map(mapFeedItem)
  if (typeof feedRes.total === 'number') feedTotal.value = feedRes.total
  if (typeof feedRes.page === 'number') feedPage.value = feedRes.page
  loading.value = false
}

onMounted(() => {
  loadSiteIdentity()
  const cached = takePreloaded('articles')
  if (cached) {
    applyPreloaded(cached)
  } else {
    loadAll()
    loadFeed()
  }
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  onWindowScroll()
})

// 页面滚动：触底追加文章
function onWindowScroll() {
  const y = window.scrollY || window.pageYOffset || 0
  if (y + window.innerHeight >= document.documentElement.scrollHeight - 240) {
    loadMoreArticles()
  }
}

// 作者点击：站外链接新窗口打开，站内（默认首页）走路由跳转
function openAuthorLink(article) {
  if (article.authorExternal) {
    window.open(article.authorHref, '_blank', 'noopener')
  } else {
    router.push(article.authorHref)
  }
}

/* ===== 分类筛选 + 文本搜索 ===== */
const currentKey = ref(null)
const searchTerm = ref('')
const searchInput = ref(null)

// 收集某分类 key 及其所有子孙 key（前端按含子孙过滤）
function descendantKeys(key) {
  const find = (ns) => {
    for (const n of ns) {
      if (n.key === key) return n
      if (n.children) {
        const f = find(n.children)
        if (f) return f
      }
    }
    return null
  }
  const node = find(categoryTree.value)
  const set = new Set()
  if (node) {
    const walk = (n) => { set.add(n.key); if (n.children) n.children.forEach(walk) }
    walk(node)
  } else {
    set.add(key)
  }
  return set
}

// 当前筛选条件下的文章条数（来自后端 total），用于「显示 N 篇文章」文案
const showingCount = computed(() => articleTotal.value)

const isEmpty = computed(() => !loading.value && articleList.value.length === 0)

function clearFilter() {
  searchTerm.value = ''
  activeSearch.value = ''
  searchInput.value?.focus()
  loadArticles(true)
}

// 搜索：输入即按关键词向后端重新拉取（防抖 250ms）
let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    activeSearch.value = searchTerm.value
    loadArticles(true)
  }, 250)
}

/* ===== 分类树 ===== */
const hasChildren = (node) => Array.isArray(node.children) && node.children.length > 0

// 每个节点右侧的计数：直接数 / 含子孙数（均来自后端分类数据）
function countInfo(key) {
  const find = (ns) => {
    for (const n of ns) {
      if (n.key === key) return n
      if (n.children) {
        const f = find(n.children)
        if (f) return f
      }
    }
    return null
  }
  const node = find(categoryTree.value)
  if (!node) return { direct: 0, withChildren: 0 }
  return {
    direct: typeof node.articleCount === 'number' ? node.articleCount : 0,
    withChildren: typeof node.articleCountWithChildren === 'number'
      ? node.articleCountWithChildren
      : (typeof node.articleCount === 'number' ? node.articleCount : 0),
  }
}

// 折叠状态：默认全部展开，收进集合的才是折叠的
const collapsedKeys = reactive(new Set())
const isCollapsed = (key) => collapsedKeys.has(key)

// 全局展开/收起：展开时清空折叠集合，收起时折叠所有含子节点的分类
const allExpanded = ref(true)
function toggleExpandAll() {
  if (allExpanded.value) {
    collapsedKeys.clear()
    const walk = (ns) => ns.forEach((n) => {
      if (hasChildren(n)) {
        collapsedKeys.add(n.key)
        if (n.children) walk(n.children)
      }
    })
    walk(categoryTree.value)
    allExpanded.value = false
  } else {
    collapsedKeys.clear()
    allExpanded.value = true
  }
}

function toggleNode(node) {
  if (!hasChildren(node)) return
  if (collapsedKeys.has(node.key)) collapsedKeys.delete(node.key)
  else collapsedKeys.add(node.key)
}

function selectCategory(node) {
  currentKey.value = node ? node.key : null
  // 选中分类（含子孙）后，按当前筛选条件向后端重新拉取文章列表
  activeCategoryKeys.value = node ? Array.from(descendantKeys(node.key)).join(',') : null
  loadArticles(true)
}

function resetCategory() {
  currentKey.value = null
  activeCategoryKeys.value = null
  loadArticles(true)
}

// 树节点在原型里是 div + click，这里补上键盘可达：Enter/Space 选中，左右方向键展开收起
function onItemKeydown(event, node) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectCategory(node)
    return
  }
  if (!hasChildren(node)) return
  if (event.key === 'ArrowRight' && isCollapsed(node.key)) {
    event.preventDefault()
    collapsedKeys.delete(node.key)
  } else if (event.key === 'ArrowLeft' && !isCollapsed(node.key)) {
    event.preventDefault()
    collapsedKeys.add(node.key)
  }
}

// 通过 provide 把交互函数注入递归子组件（支持任意层级）
// 注意：必须在所有被引用的函数/const 声明完成后再调用，避免 TDZ
provide('catHasChildren', hasChildren)
provide('catCountInfo', countInfo)
provide('catIsCollapsed', isCollapsed)
provide('catToggleNode', toggleNode)
provide('catSelectCategory', selectCategory)
provide('catOnItemKeydown', onItemKeydown)
provide('catCurrentKey', currentKey)

/* ===== 面包屑 ===== */
function findPath(key, nodes = categoryTree.value, path = []) {
  for (const node of nodes) {
    const next = [...path, node]
    if (node.key === key) return next
    if (node.children) {
      const found = findPath(key, node.children, next)
      if (found) return found
    }
  }
  return null
}

const breadcrumbPath = computed(() =>
  currentKey.value ? (findPath(currentKey.value) ?? []) : [],
)

/* ===== 移动端分类树折叠（≤1024px 生效） ===== */
const treeCollapsed = ref(false)

/* ===== 右侧「动态」栏：按创建时间倒序加载（支持滚动触底追加下一页） ===== */
const refreshing = ref(false)
const feedList = ref([])
const FEED_PAGE_SIZE = 20
const feedPage = ref(1)
const feedTotal = ref(0)
const feedLoadingMore = ref(false)
const feedTimelineRef = ref(null)
let refreshTimer = null

const feedListEnded = computed(() => feedList.value.length >= feedTotal.value && feedTotal.value > 0)

function mapFeedItem(a) {
  return {
    slug: a.slug,
    title: a.title,
    // 固定显示创建时间：阅读量自增等操作会刷新 updatedAt，不能作为动态时间
    date: a.createdAt ? a.createdAt.slice(0, 10) : '',
  }
}

// 拉取动态列表：后端已按 createdAt 倒序返回（创建越晚越靠前，顺序不随浏览行为变化）
// reset=true 时重新加载第一页（首屏 / 刷新），否则追加下一页
async function loadFeed(reset = true) {
  try {
    const nextPage = reset ? 1 : feedPage.value + 1
    const res = await api.get(`/articles/feed?page=${nextPage}&pageSize=${FEED_PAGE_SIZE}`)
    const items = (res && res.items) ? res.items : (Array.isArray(res) ? res : [])
    feedList.value = reset
      ? items.map(mapFeedItem)
      : feedList.value.concat(items.map(mapFeedItem))
    if (typeof res.total === 'number') feedTotal.value = res.total
    feedPage.value = nextPage
  } catch (e) {
    console.error('加载动态列表失败', e)
  }
}

// 触底追加下一页动态（已加载完 / 正在加载时忽略）
function loadMoreFeed() {
  if (feedLoadingMore.value || feedListEnded.value) return
  feedLoadingMore.value = true
  loadFeed(false).finally(() => { feedLoadingMore.value = false })
}

// 监听动态栏滚动容器，触底（留 24px 余量）时追加
function onFeedScroll() {
  const el = feedTimelineRef.value
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
    loadMoreFeed()
  }
}

function refreshFeed() {
  if (refreshing.value) return
  refreshing.value = true // 图标旋转 360° + 列表淡出
  refreshTimer = setTimeout(async () => {
    await loadFeed()
    refreshing.value = false // 列表淡入
    refreshTimer = null
  }, 600)
}

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
  window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
  <AppHeader active-key="" />

  <main class="container">
    <!-- LEFT: 分类树 -->
    <aside class="cat-tree" :class="{ collapsed: treeCollapsed }">
      <div class="cat-tree-title">
        <button
          class="tree-mobile-toggle"
          type="button"
          aria-label="展开或收起分类"
          :aria-expanded="String(!treeCollapsed)"
          @click="treeCollapsed = !treeCollapsed"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button class="tree-expand-all" type="button" @click="toggleExpandAll">
          {{ allExpanded ? '收起' : '展开' }}
        </button>
        <button class="tree-reset" type="button" @click="resetCategory">清空</button>
      </div>

      <!-- 分类树递归渲染，支持任意层级嵌套 -->
      <nav class="tree" aria-label="文章分类">
        <ul class="tree">
          <li class="tree-item--all">
            <div
              class="tree-row tree-row--all"
              :class="{ 'tree-row--active': currentKey === null }"
              role="treeitem"
              :aria-selected="String(currentKey === null)"
              tabindex="0"
              @click="selectCategory(null)"
              @keydown.enter.prevent="selectCategory(null)"
              @keydown.space.prevent="selectCategory(null)"
            >
              <span class="tree-label">全部</span>
              <span v-if="allCount !== null" class="tree-count">{{ allCount }}</span>
            </div>
          </li>
          <category-tree-node
            v-for="node in categoryTree"
            :key="node.key"
            :node="node"
          />
        </ul>
      </nav>
    </aside>

    <!-- CENTER: 文章列表 -->
    <section class="main-content">
      <div class="list-toolbar">
        <nav class="breadcrumb" aria-label="当前分类路径">
          <a href="#" @click.prevent="resetCategory">全部</a>
          <template v-for="(node, index) in breadcrumbPath" :key="node.key">
            <span class="sep">/</span>
            <span v-if="index === breadcrumbPath.length - 1" class="current">{{ node.name }}</span>
            <a v-else href="#" @click.prevent="selectCategory(node)">{{ node.name }}</a>
          </template>
        </nav>

        <div class="list-filter">
          <svg
            class="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref="searchInput"
            v-model="searchTerm"
            type="search"
            class="filter-input"
            placeholder="搜索文章…"
            aria-label="按标题或内容筛选文章"
            @input="onSearchInput"
          />
          <button
            type="button"
            class="filter-clear"
            aria-label="清除筛选"
            :hidden="searchTerm.length === 0"
            @click="clearFilter"
          >
            &times;
          </button>
        </div>
      </div>

      <div class="article-list">
        <RouterLink
          v-for="(article, index) in articleList"
          :key="article.key"
          class="article-card"
          :to="`/articles/${article.slug}`"
        >
          <ArticleCover
            :title="article.title"
            :cover-image="article.thumbnail"
            ratio="4/3"
            class="article-thumbnail"
          />
          <div class="article-content">
            <span class="article-category">{{ article.category }}</span>
            <h2 class="article-title">{{ article.title }}</h2>
            <p class="article-excerpt">{{ article.excerpt }}</p>
            <div class="article-meta">
              <span>
                <!-- 原型首张卡片的作者图标描边是 2 且无 linecap，其余是 1.5 + round，如实保留 -->
                <svg
                  v-if="article.plainAuthorIcon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <a
                  class="author-link"
                  :href="article.authorExternal ? article.authorHref : `#${article.authorHref}`"
                  :target="article.authorExternal ? '_blank' : undefined"
                  :rel="article.authorExternal ? 'noopener' : undefined"
                  @click.stop.prevent="openAuthorLink(article)"
                >{{ article.authorRaw || siteName }}</a>
              </span>
              <span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {{ article.date }}
              </span>
              <span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {{ article.reads }}
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <div class="list-more" v-if="!loading && articleList.length">
        <span v-if="articleLoadingMore" class="list-more-loading">加载中…</span>
        <span v-else-if="articleListEnded">已加载全部文章</span>
      </div>

      <div class="empty-state" :class="{ active: isEmpty }" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <p>该分类下暂无文章</p>
      </div>

    </section>

    <!-- RIGHT: 侧栏 -->
    <aside class="sidebar">
      <div class="sidebar-block sidebar-block--green">
        <div class="feed-header">
          <button
            class="feed-title"
            type="button"
            aria-controls="feedTimeline"
          >
            动态
          </button>
          <button
            class="feed-refresh"
            :class="{ spin: refreshing }"
            type="button"
            aria-label="刷新动态"
            @click="refreshFeed"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        <ul
          id="feedTimeline"
          ref="feedTimelineRef"
          class="timeline"
          :style="{ opacity: refreshing ? '0.35' : '1' }"
          @scroll="onFeedScroll"
        >
          <li v-for="item in feedList" :key="item.slug" class="timeline-item">
            <div class="timeline-date">{{ item.date }}</div>
            <RouterLink class="timeline-title" :to="`/articles/${item.slug}`">
              {{ item.title }}
            </RouterLink>
          </li>
          <li v-if="feedLoadingMore" class="feed-more">加载中…</li>
          <li v-else-if="feedListEnded" class="feed-more feed-more--end">已加载全部动态</li>
        </ul>
      </div>
    </aside>
  </main>

  <AppFooter />
</template>

<style scoped>
/* Layout: 3 columns */
.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 24px 80px;
  display: grid;
  grid-template-columns: 298px minmax(0, 1fr) 300px;
  gap: 52px;
  align-items: start;
}

/* ============ Category Tree (left) ============ */
.cat-tree {
  position: sticky;
  top: 76px;
  background-color: var(--bg-tree);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}

.cat-tree-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 14px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-reset {
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
  background: none;
  border: none;
  font-family: var(--font-sans);
  margin-left: auto;
}

.tree-expand-all {
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
  background: none;
  border: none;
  font-family: var(--font-sans);
  padding: 2px 6px;
  border-radius: 6px;
}
.tree-expand-all:hover { color: var(--accent); background: var(--bg-soft); }
.tree-expand-all + .tree-reset { margin-left: 4px; }

.tree-reset:hover {
  color: var(--accent-hover);
}

.tree,
.tree ul {
  list-style: none;
}

/* 分类树顶部"全部"节点 */
.tree-item--all {
  list-style: none;
}
.tree-row--all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  user-select: none;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  transition: background-color var(--transition), color var(--transition);
}
.tree-row--all:hover {
  background-color: var(--bg-card);
  color: var(--text-primary);
}
.tree-row--all.tree-row--active {
  background-color: var(--accent);
  color: var(--bg-card);
}
.tree-row--all:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* "全部"节点计数（单数字），与递归组件中 .tree-count 外观一致 */
.tree-count {
  margin-left: auto;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  background-color: var(--bg-soft);
  color: var(--text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
  min-width: max-content;
  line-height: 1;
  display: inline-block;
}
.tree-row--all.tree-row--active .tree-count {
  background-color: var(--bg-card);
  color: var(--accent);
}
.tree-row--all .tree-label {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============ Main content (center) ============ */
.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--text-tertiary);
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.list-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.list-filter .search-icon {
  position: absolute;
  left: 13px;
  width: 15px;
  height: 15px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.filter-input {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--text-primary);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 9px 38px 9px 36px;
  width: 220px;
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    width var(--transition);
}

.filter-input::placeholder {
  color: var(--text-tertiary);
}

.filter-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(45, 130, 100, 0.12);
  width: 260px;
}

.filter-clear {
  position: absolute;
  right: 11px;
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: var(--text-tertiary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.filter-clear:hover {
  color: var(--text-primary);
  background: var(--bg-soft);
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color var(--transition);
}

.breadcrumb a:hover {
  color: var(--accent);
}

.breadcrumb .sep {
  color: var(--text-tertiary);
  margin: 0 2px;
}

.breadcrumb .current {
  color: var(--text-primary);
  font-weight: 500;
  padding: 2px 4px;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.article-card {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 22px;
  padding: 22px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  transition: all var(--transition);
  text-decoration: none;
  color: inherit;
}

.article-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.article-card.hidden {
  display: none;
}

.article-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.article-thumbnail {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background-color: var(--bg-sidebar);
}

.article-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.article-category {
  display: inline-flex;
  align-self: flex-start;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background-color: var(--accent-light);
  padding: 4px 10px;
  border-radius: 100px;
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

.article-title {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 9px;
  line-height: 1.4;
  transition: color var(--transition);
}

.article-card:hover .article-title {
  color: var(--accent);
}

.article-excerpt {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.article-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.article-meta svg {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

/* 作者名：超链接，点击跳转作者主页（未配置时跳站点首页） */
.article-meta .author-link {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition);
}
.article-meta .author-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-secondary);
  display: none;
}

.empty-state.active {
  display: block;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: var(--text-tertiary);
}

.empty-state p {
  font-size: 15px;
}

.list-more {
  margin: 24px 0 8px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}
.list-more-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ============ Sidebar (right) ============ */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 92px;
}

.sidebar-block {
  background-color: var(--bg-soft);
  border-radius: var(--radius-md);
  padding: 22px;
  border: 1px solid var(--border-light);
}

.sidebar-block--green {
  background-color: var(--bg-green-soft);
  border-color: rgba(45, 130, 100, 0.18);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 140px);
}

.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 18px;
}

.feed-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #ffffff;
  background-color: #2d8264;
  border: 1px solid #2d8264;
  border-radius: 100px;
  padding: 7px 16px;
  cursor: pointer;
  line-height: 1;
  transition:
    color var(--transition),
    border-color var(--transition),
    background-color var(--transition);
}

.feed-title:hover {
  color: #ffffff;
  background-color: #246f53;
  border-color: #246f53;
}

.feed-title:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.feed-refresh {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color var(--transition),
    border-color var(--transition),
    background-color var(--transition);
}

.feed-refresh:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}

.feed-refresh:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.feed-refresh svg {
  width: 15px;
  height: 15px;
  transition: transform .55s cubic-bezier(.22, 1, .36, 1);
}

.feed-refresh.spin svg {
  transform: rotate(360deg);
}

.timeline {
  transition: opacity var(--transition);
}

/* ===== Update timeline ===== */
.timeline {
  list-style: none;
  position: relative;
  padding-left: 18px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  margin-right: -6px;
  padding-right: 6px;
}

.timeline::-webkit-scrollbar {
  width: 6px;
}

.timeline::-webkit-scrollbar-thumb {
  background: rgba(45, 130, 100, 0.25);
  border-radius: 100px;
}

.timeline::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.feed-more {
  list-style: none;
  padding: 8px 0 2px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.feed-more--end {
  opacity: 0.7;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -18px;
  top: 5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--bg-green-soft);
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 3px var(--bg-green-soft);
  z-index: 1;
}

/* 连接线：从本节点圆点下方一直连到下一个节点圆点，保证所有节点完全串接 */
.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: -13.5px;
  top: 14px;
  width: 2px;
  height: calc(100% - 9px);
  background: linear-gradient(rgba(45, 130, 100, 0.35), rgba(45, 130, 100, 0.12));
}

.timeline-date {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 3px;
  font-variant-numeric: tabular-nums;
}

.timeline-title {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-primary);
  text-decoration: none;
  display: block;
  transition: color var(--transition);
}

.timeline-title:hover {
  color: var(--accent);
}

/* Mobile tree toggle */
.tree-mobile-toggle {
  display: none;
}

/* ============ Responsive ============ */
@media (max-width: 1180px) {
  .container {
    grid-template-columns: 240px minmax(0, 1fr) 280px;
    gap: 36px;
  }
}

@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .cat-tree {
    position: static;
    max-height: none;
    order: -1;
  }

  .cat-tree.collapsed .tree {
    display: none;
  }

  .tree-mobile-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    padding: 0;
    margin-left: 8px;
  }

  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }

  .sidebar-block--green {
    max-height: none;
  }

  .timeline {
    overflow: visible;
    margin-right: 0;
    padding-right: 0;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 28px 16px 56px;
  }

  .article-card {
    grid-template-columns: 1fr;
    padding: 18px;
    gap: 16px;
  }

  .article-thumbnail {
    aspect-ratio: 16/9;
  }

  .article-title {
    font-size: 18px;
  }

  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .list-filter {
    width: 100%;
  }

  .filter-input {
    width: 100%;
  }

  .filter-input:focus {
    width: 100%;
  }
}
</style>
