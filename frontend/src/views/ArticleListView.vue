<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { articles, categoryTree, feedItems } from '@/data/articles'

/* ===== 分类筛选 + 文本搜索 ===== */
const currentKey = ref(null)
const searchTerm = ref('')
const searchInput = ref(null)

// 原型里搜索的是卡片的 textContent（分类 + 标题 + 摘要 + 作者 + 日期 + 阅读数），这里等价预拼一份
const searchIndex = articles.map((a) =>
  [a.category, a.title, a.excerpt, a.author, a.date, a.reads].join(' ').toLowerCase(),
)

/** 分类前缀匹配 + 关键词匹配，两者取交集（与原型 applyFilters 一致） */
const hiddenFlags = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const key = currentKey.value
  return articles.map((a, i) => {
    const matchCat = !key || a.key.startsWith(key)
    const matchText = !term || searchIndex[i].includes(term)
    return !(matchCat && matchText)
  })
})

const isEmpty = computed(() => hiddenFlags.value.every(Boolean))

function clearFilter() {
  searchTerm.value = ''
  searchInput.value?.focus()
}

/* ===== 分类树 ===== */
const hasChildren = (node) => Array.isArray(node.children) && node.children.length > 0

// 每个节点右侧的计数：统计 key 以该节点 key 为前缀的文章数（原型 countUnder）
const countCache = new Map()
function countUnder(key) {
  if (!countCache.has(key)) {
    countCache.set(key, articles.filter((a) => a.key.startsWith(key)).length)
  }
  return countCache.get(key)
}

// 折叠状态：默认全部展开，收进集合的才是折叠的
const collapsedKeys = reactive(new Set())
const isCollapsed = (key) => collapsedKeys.has(key)

function toggleNode(node) {
  if (!hasChildren(node)) return
  if (collapsedKeys.has(node.key)) collapsedKeys.delete(node.key)
  else collapsedKeys.add(node.key)
}

function selectCategory(node) {
  currentKey.value = node ? node.key : null
}

function resetCategory() {
  currentKey.value = null
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

/* ===== 面包屑 ===== */
function findPath(key, nodes = categoryTree, path = []) {
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

/* ===== 右侧「动态」栏：折叠 + 刷新重排 ===== */
const feedExpanded = ref(true)
const refreshing = ref(false)
const feedList = ref([...feedItems])
let refreshTimer = null

function refreshFeed() {
  if (refreshing.value) return
  refreshing.value = true // 图标旋转 360° + 列表淡出
  refreshTimer = setTimeout(() => {
    feedList.value = [...feedList.value].sort((a, b) => b.date.localeCompare(a.date))
    refreshing.value = false // 列表淡入
    refreshTimer = null
  }, 600)
}

onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
})
</script>

<template>
  <AppHeader active-key="kb" />

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
        <button class="tree-reset" type="button" @click="resetCategory">清空</button>
      </div>

      <!-- 分类树最多三层，逐层 v-for；不拆子组件是为了让 `.tree ul` 这类后代选择器在 scoped 下仍然命中 -->
      <nav class="tree" aria-label="文章分类">
        <ul class="tree">
          <li v-for="l1 in categoryTree" :key="l1.key">
            <div
              class="tree-item"
              :class="{ active: currentKey === l1.key }"
              role="button"
              tabindex="0"
              :aria-pressed="currentKey === l1.key"
              :aria-expanded="hasChildren(l1) ? String(!isCollapsed(l1.key)) : undefined"
              @click="selectCategory(l1)"
              @keydown="onItemKeydown($event, l1)"
            >
              <span
                class="tree-toggle"
                :class="{ collapsed: isCollapsed(l1.key), leaf: !hasChildren(l1) }"
                aria-hidden="true"
                @click.stop="toggleNode(l1)"
              >
                <svg
                  v-if="hasChildren(l1)"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              <span class="tree-label">{{ l1.name }}</span>
              <span class="tree-count">{{ countUnder(l1.key) }}</span>
            </div>

            <div v-if="hasChildren(l1)" v-show="!isCollapsed(l1.key)" class="tree-children">
              <ul>
                <li v-for="l2 in l1.children" :key="l2.key">
                  <div
                    class="tree-item"
                    :class="{ active: currentKey === l2.key }"
                    role="button"
                    tabindex="0"
                    :aria-pressed="currentKey === l2.key"
                    :aria-expanded="hasChildren(l2) ? String(!isCollapsed(l2.key)) : undefined"
                    @click="selectCategory(l2)"
                    @keydown="onItemKeydown($event, l2)"
                  >
                    <span
                      class="tree-toggle"
                      :class="{ collapsed: isCollapsed(l2.key), leaf: !hasChildren(l2) }"
                      aria-hidden="true"
                      @click.stop="toggleNode(l2)"
                    >
                      <svg
                        v-if="hasChildren(l2)"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                    <span class="tree-label">{{ l2.name }}</span>
                    <span class="tree-count">{{ countUnder(l2.key) }}</span>
                  </div>

                  <div
                    v-if="hasChildren(l2)"
                    v-show="!isCollapsed(l2.key)"
                    class="tree-children"
                  >
                    <ul>
                      <li v-for="l3 in l2.children" :key="l3.key">
                        <div
                          class="tree-item"
                          :class="{ active: currentKey === l3.key }"
                          role="button"
                          tabindex="0"
                          :aria-pressed="currentKey === l3.key"
                          @click="selectCategory(l3)"
                          @keydown="onItemKeydown($event, l3)"
                        >
                          <span class="tree-toggle leaf" aria-hidden="true" />
                          <span class="tree-label">{{ l3.name }}</span>
                          <span class="tree-count">{{ countUnder(l3.key) }}</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </li>
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
          v-for="(article, index) in articles"
          :key="article.key"
          class="article-card"
          :class="{ hidden: hiddenFlags[index] }"
          :to="`/articles/${article.slug}`"
        >
          <img :src="article.thumbnail" alt="" class="article-thumbnail" />
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
                {{ article.author }}
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
            :aria-expanded="String(feedExpanded)"
            aria-controls="feedTimeline"
            @click="feedExpanded = !feedExpanded"
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
          class="timeline"
          :style="{ display: feedExpanded ? 'block' : 'none', opacity: refreshing ? '0.35' : '1' }"
        >
          <li v-for="item in feedList" :key="item.slug" class="timeline-item">
            <div class="timeline-date">{{ item.date }}</div>
            <RouterLink class="timeline-title" :to="`/articles/${item.slug}`">
              {{ item.title }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </aside>
  </main>

  <AppFooter padding-y="40px" />
</template>

<style scoped>
/* Layout: 3 columns */
.container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 24px 80px;
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr) 300px;
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

.tree-reset:hover {
  color: var(--accent-hover);
}

.tree,
.tree ul {
  list-style: none;
}

.tree ul {
  margin-left: 14px;
  border-left: 1px solid var(--border);
  padding-left: 6px;
}

.tree li {
  margin: 2px 0;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all var(--transition);
  user-select: none;
  position: relative;
}

.tree-item:hover {
  background-color: var(--bg-card);
  color: var(--text-primary);
}

.tree-item.active {
  background-color: var(--accent);
  color: var(--bg-card);
  font-weight: 600;
}

.tree-item.active::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background-color: var(--bg-card);
  border-radius: 2px;
}

.tree-toggle {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition);
  color: var(--text-tertiary);
}

.tree-toggle.collapsed {
  transform: rotate(-90deg);
}

.tree-toggle.leaf {
  visibility: hidden;
}

.tree-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
  background-color: var(--bg-card);
  padding: 1px 7px;
  border-radius: 100px;
}

.tree-item.active .tree-count {
  background-color: var(--bg-card);
  color: var(--accent);
}

.tree-label {
  flex: 1;
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

.timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: linear-gradient(rgba(45, 130, 100, 0.35), rgba(45, 130, 100, 0.12));
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
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
