<template>
  <div class="article-admin">
    <!-- ===== 左侧：分类管理侧栏（树形，多级标签） ===== -->
    <aside class="cat-sidebar">
      <div class="cat-sidebar__title">
        <span>分类管理</span>
        <button class="cat-collapse-all" @click="toggleExpandAll">{{ allExpanded ? '收起' : '展开' }}</button>
      </div>

      <div class="cat-tree">
        <div
          class="cat-node cat-node--root"
          :class="{ active: selectedCategoryKey === null }"
          @click="selectCategory(null)"
        >
          <span class="cat-node__toggle cat-node__toggle--leaf"></span>
          <span class="cat-node__label">全部</span>
          <span v-if="allTotal !== null" class="cat-node__count">{{ allTotal }}</span>
        </div>

        <template v-for="node in flatNodes" :key="node.key">
          <div
            class="cat-node"
            :class="{ active: selectedCategoryKey === node.key }"
            :style="{ paddingLeft: 10 + node.depth * 18 + 'px' }"
            @click="selectCategory(node.key)"
          >
            <button
              v-if="node.hasChildren"
              class="cat-node__toggle"
              @click.stop="toggleExpand(node.key)"
              :aria-label="isExpanded(node.key) ? '收起' : '展开'"
            >
              <span class="cat-node__arrow" :class="{ open: isExpanded(node.key) }">▸</span>
            </button>
            <span v-else class="cat-node__toggle cat-node__toggle--leaf"></span>
            <span class="cat-node__label">{{ node.name }}</span>
            <span class="cat-node__count">{{ node.count }} / {{ node.countWithChildren }}</span>
          </div>
        </template>
      </div>
    </aside>

    <!-- ===== 右侧：筛选 + 列表 ===== -->
    <section class="article-main">
      <!-- Hero -->
      <div class="page-hero">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="page-hero-inner">
          <div class="hero-row">
            <div class="hero-copy">
              <span class="kicker">Articles · 文章</span>
              <h1>文章管理</h1>
            </div>
            <div class="hero-side">
              <router-link class="btn btn--primary" :to="{ name: 'admin-article-new' }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                新建文章
              </router-link>
            </div>
          </div>
          <p class="lede">管理站点全部文章，按分类、状态与关键词检索。</p>
          <p class="hero-note">{{ total ?? '—' }} 篇文章 · 当前筛选：{{ statusLabel }} · 拖拽行调整顺序（前台同步） · 列表内滚动自动加载</p>
        </div>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="seg">
            <button class="seg__item" :class="{ active: statusFilter === 'all' }" @click="setStatus('all')">全部</button>
            <button class="seg__item" :class="{ active: statusFilter === 'published' }" @click="setStatus('published')">已发布</button>
            <button class="seg__item" :class="{ active: statusFilter === 'draft' }" @click="setStatus('draft')">草稿</button>
          </div>

          <div class="search">
            <svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              v-model="searchInput"
              class="search__input"
              type="text"
              placeholder="搜索标题 / 摘要 / 作者"
              @keyup.enter="onFilterChange"
            />
          </div>

          <button class="btn btn--soft" @click="onFilterChange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            搜索
          </button>
          <button class="btn btn--ghost" @click="resetFilters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            重置
          </button>
        </div>

        <div ref="listScroll" class="article-list" @scroll="onScroll">
          <div v-if="loading && !articles.length" class="empty-hint">
            <span class="spinner" aria-hidden="true"></span>
            <span>加载中…</span>
          </div>

          <table v-else class="article-table">
            <thead class="article-table__head">
              <tr>
                <th class="th-index">序号</th>
                <th class="th-title">标题</th>
                <th class="th-author">作者</th>
                <th class="th-status">状态</th>
                <th class="th-views">真实阅读</th>
                <th class="th-views">虚拟阅读</th>
                <th class="th-updated">更新时间</th>
                <th class="article-table__ops">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(a, index) in articles"
                :key="a.id"
                class="data-row"
                :class="{
                  'is-dragging': dragIndex === index,
                  'is-drag-over': dragOverIndex === index && dragIndex !== index,
                }"
                :draggable="!savingOrder"
                @dragstart="onDragStart($event, index)"
                @dragover.prevent="onDragOver(index)"
                @dragleave="onDragLeave(index)"
                @drop.prevent="onDrop(index)"
                @dragend="onDragEnd"
              >
                <td class="cell-index">
                  <span class="cell-index__inner">
                    <span class="drag-handle" title="拖拽调整顺序" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>
                    </span>
                    <span class="cell-index__num">{{ (page - 1) * pageSize + index + 1 }}</span>
                  </span>
                </td>
                <td class="cell-title">{{ a.title }}</td>
                <td class="cell-author">{{ a.author || '—' }}</td>
                <td class="cell-status">
                  <span class="badge" :class="a.published ? 'badge--ok' : 'badge--muted'">
                    {{ a.published ? '已发布' : '草稿' }}
                  </span>
                </td>
                <td class="cell-views">{{ a.viewCount ?? 0 }}</td>
                <td class="cell-views">
                  <span v-if="a.virtualViewCount !== null && a.virtualViewCount !== undefined" class="views-virtual">
                    {{ a.virtualViewCount }}
                  </span>
                  <span v-else class="views-unset">未设置</span>
                </td>
                <td class="cell-muted">{{ formatDate(a.updatedAt) }}</td>
                <td class="article-table__ops">
                  <button class="link" @click="openEdit(a)">编辑</button>
                  <button class="link" @click="togglePublish(a)">
                    {{ a.published ? '回收' : '发布' }}
                  </button>
                  <button class="link link--danger" @click="removeArticle(a)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!articles.length && !loading" class="empty">
            <div class="empty__illus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <p class="empty__title">暂无文章</p>
            <p class="empty__sub">试试调整分类、状态或搜索关键词</p>
          </div>

          <div ref="sentinel" class="sentinel">
            <span v-if="loadingMore" class="sentinel__tip">加载中…</span>
            <span v-else-if="!hasMore && articles.length" class="sentinel__tip">— 没有更多了 —</span>
            <button v-else-if="loadError" class="link" @click="loadMore">加载失败，点击重试</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除文章"
      confirm-label="删除"
      :loading="deleting"
      warn="删除后该文章将从站点与列表中移除，此操作不可撤销。"
      @cancel="cancelRemove"
      @confirm="confirmRemove"
    >
      确定要删除 <strong>《{{ pendingArticle?.title }}》</strong> 吗？
    </ConfirmDialog>

    <!-- ===== Toast ===== -->
    <transition name="toast-pop">
      <div v-if="toastMsg" class="toast" :class="toastType" role="status" aria-live="polite">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { useApi } from '../../composables/useApi'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const api = useApi()

export default {
  name: 'AdminArticleList',
  components: { ConfirmDialog },
  data() {
    return {
      rawCategories: [],
      expandedKeys: [],
      allExpanded: true,
      selectedCategoryKey: null,
      searchInput: '',
      statusFilter: 'all',
      articles: [],
      total: null,
      allTotal: null,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      loading: false,
      loadingMore: false,
      loadError: false,
      _observer: null,

      // 拖拽排序
      dragIndex: null,
      dragOverIndex: null,
      savingOrder: false,

      // 删除确认弹窗
      confirmOpen: false,
      pendingArticle: null,
      deleting: false,

      // 站内提示
      toastMsg: '',
      toastType: 'success',
    }
  },
  computed: {
    hasMore() {
      return this.page < this.totalPages
    },
    statusLabel() {
      if (this.statusFilter === 'draft') return '草稿'
      if (this.statusFilter === 'all') return '全部（含草稿）'
      return '已发布'
    },
    flatNodes() {
      const out = []
      const walk = (list, depth) => {
        (list || []).forEach((c) => {
          const children = c.children || c.subcategories || []
          out.push({
            key: c.key, name: c.name, depth,
            hasChildren: children.length > 0,
            count: typeof c.articleCount === 'number' ? c.articleCount : 0,
            countWithChildren: typeof c.articleCountWithChildren === 'number' ? c.articleCountWithChildren : (typeof c.articleCount === 'number' ? c.articleCount : 0)
          })
          if (children.length > 0 && this.isExpanded(c.key)) walk(children, depth + 1)
        })
      }
      walk(this.rawCategories, 0)
      return out
    }
  },
  created() {
    // 请求序号令牌：每次重置列表时递增，用于丢弃切换分类前在途的旧请求响应
    this._loadSeq = 0
  },
  async mounted() {
    await this.loadCategories()
    await this.loadArticles(true)
    this.setupObserver()
  },
  beforeUnmount() {
    if (this._observer) this._observer.disconnect()
  },
  methods: {
    async loadCategories() {
      try {
        const data = await api.get('/admin/categories/tree')
        this.rawCategories = Array.isArray(data) ? data : (data.items || data.tree || [])
        this.expandedKeys = this.allExpanded
          ? this.rawCategories
              .filter((c) => (c.children || c.subcategories || []).length > 0)
              .map((c) => c.key)
          : []
      } catch (e) { this.rawCategories = [] }
    },
    // 同步左侧“全部”节点的总数（仅在未选中具体分类时该数字才有意义）
    async syncTotals() {
      if (this.selectedCategoryKey) return
      try {
        const data = await api.get(`/admin/articles${this.buildQuery()}`)
        if (typeof data.total === 'number') this.allTotal = data.total
      } catch (e) { /* 失败不影响主流程 */ }
    },
    isExpanded(key) { return this.expandedKeys.includes(key) },
    toggleExpand(key) {
      const i = this.expandedKeys.indexOf(key)
      if (i >= 0) this.expandedKeys.splice(i, 1)
      else this.expandedKeys.push(key)
    },
    toggleExpandAll() {
      if (this.allExpanded) {
        this.expandedKeys = []
        this.allExpanded = false
      } else {
        this.expandedKeys = this.rawCategories
          .filter((c) => (c.children || c.subcategories || []).length > 0)
          .map((c) => c.key)
        this.allExpanded = true
      }
    },
    buildParams() {
      const params = { page: this.page, pageSize: this.pageSize }
      if (this.selectedCategoryKey) params.categoryKey = this.selectedCategoryKey
      if (this.statusFilter) params.status = this.statusFilter
      if (this.searchInput.trim()) params.search = this.searchInput.trim()
      return params
    },
    buildQuery() {
      const usp = new URLSearchParams()
      const p = this.buildParams()
      Object.keys(p).forEach((k) => {
        if (p[k] !== '' && p[k] !== null && p[k] !== undefined) usp.set(k, p[k])
      })
      const s = usp.toString()
      return s ? `?${s}` : ''
    },
    async loadArticles(reset = false) {
      if (reset) {
        this.page = 1
        this.articles = []
        this._loadSeq += 1
        // 重置同时清空“加载更多”标志，避免在途的 loadMore 响应继续生效
        this.loadingMore = false
      }
      const seq = this._loadSeq
      this.loading = true
      this.loadError = false
      try {
        const data = await api.get(`/admin/articles${this.buildQuery()}`)
        if (seq !== this._loadSeq) return // 已被更新的筛选请求覆盖，丢弃过期响应
        const items = Array.isArray(data) ? data : (data.items || [])
        this.articles = reset ? items : this.articles.concat(items)
        this.total = typeof data.total === 'number' ? data.total : this.articles.length
        // “全部”节点显示的是不带分类筛选的全库总数，仅在选择“全部”重新加载时刷新
        if (reset && !this.selectedCategoryKey) {
          this.allTotal = this.total
        }
        this.totalPages = data.totalPages || 1
        this.page = data.page || this.page
      } catch (e) {
        if (seq !== this._loadSeq) return
        this.loadError = true
      }
      finally {
        if (seq === this._loadSeq) { this.loading = false; this.loadingMore = false }
      }
    },
    async loadMore() {
      // loading 期间（切分类/重置正在请求）不加载更多，避免基于旧 totalPages 提前翻页
      if (this.loadingMore || this.loading || !this.hasMore) return
      this.loadingMore = true
      this.loadError = false
      const seq = this._loadSeq
      this.page += 1
      try {
        const data = await api.get(`/admin/articles${this.buildQuery()}`)
        if (seq !== this._loadSeq) return // 加载期间发生了筛选切换，丢弃旧分类的翻页数据
        const items = Array.isArray(data) ? data : (data.items || [])
        this.articles = this.articles.concat(items)
        this.totalPages = data.totalPages || this.totalPages
        this.page = data.page || this.page
      } catch (e) {
        if (seq !== this._loadSeq) return
        this.loadError = true
        this.page -= 1
      }
      finally { if (seq === this._loadSeq) this.loadingMore = false }
    },
    setupObserver() {
      if (!('IntersectionObserver' in window)) return
      this._observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) this.loadMore()
      }, { root: this.$refs.listScroll, rootMargin: '120px' })
      if (this.$refs.sentinel) this._observer.observe(this.$refs.sentinel)
    },
    onScroll() {
      if (this._observer || !this.$refs.listScroll) return
      const el = this.$refs.listScroll
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) this.loadMore()
    },
    setStatus(val) {
      if (this.statusFilter === val) return
      this.statusFilter = val
      this.onFilterChange()
    },
    onFilterChange() { this.loadArticles(true); this.scrollTopReset() },
    resetFilters() {
      this.searchInput = ''
      this.statusFilter = 'all'
      this.selectCategory(null)
    },
    selectCategory(key) {
      if (this.selectedCategoryKey === key) return
      this.selectedCategoryKey = key
      this.loadArticles(true)
      this.scrollTopReset()
    },
    scrollTopReset() {
      if (this.$refs.listScroll) this.$refs.listScroll.scrollTop = 0
    },

    /* ===== 编辑：跳转独立编辑页（与「小记管理」一致） ===== */
    openEdit(a) {
      this.$router.push({ name: 'admin-article-edit', params: { id: a.id } })
    },

    /* ===== 拖拽排序：调整当前列表顺序并同步后端，前台按同一顺序展示 ===== */
    onDragStart(e, index) {
      // 保存中不可拖拽；从按钮/链接上起拖时不触发排序，避免误触操作
      if (this.savingOrder) { e.preventDefault(); return }
      const target = e.target
      if (target && target.closest && target.closest('button, a, input, textarea')) {
        e.preventDefault()
        return
      }
      this.dragIndex = index
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(index))
      }
    },
    onDragOver(index) {
      if (this.dragIndex === null) return
      this.dragOverIndex = index
    },
    onDragLeave(index) {
      if (this.dragOverIndex === index) this.dragOverIndex = null
    },
    onDragEnd() {
      this.dragIndex = null
      this.dragOverIndex = null
    },
    async onDrop(index) {
      const from = this.dragIndex
      this.dragIndex = null
      this.dragOverIndex = null
      if (from === null || from === index) return
      const list = this.articles.slice()
      const [moved] = list.splice(from, 1)
      list.splice(index, 0, moved)
      this.articles = list
      await this.saveOrder()
    },
    async saveOrder() {
      if (this.savingOrder) return
      this.savingOrder = true
      try {
        await api.put('/admin/articles/reorder', { ids: this.articles.map((a) => a.id) })
        this.showToast('顺序已更新，前台将按此顺序展示', 'success')
      } catch (e) {
        this.showToast('顺序保存失败：' + (e?.message || e), 'error')
        // 保存失败则回滚为服务端顺序
        await this.loadArticles(true)
      } finally {
        this.savingOrder = false
      }
    },

    async togglePublish(a) {
      const next = !a.published
      try {
        await api.put(`/admin/articles/${a.id}`, { published: next })
        if (this.statusFilter === 'all') {
          // 「全部」视图同时展示草稿与已发布，切换状态后文章仍在列表中，只更新状态徽标
          const target = this.articles.find((x) => x.id === a.id)
          if (target) target.published = next
        } else {
          // 按状态筛选时文章不再属于当前视图，直接从列表移除该卡片，
          // 避免带着原状态过滤重新拉取导致整页数据“消失”。
          const idx = this.articles.findIndex((x) => x.id === a.id)
          if (idx >= 0) {
            this.articles.splice(idx, 1)
            if (typeof this.total === 'number') this.total = Math.max(0, this.total - 1)
          }
        }
        // 发布/回收会改变分类下已发布文章数量与“全部”计数，刷新左侧分类树与总数
        await Promise.all([this.loadCategories(), this.syncTotals()])
      } catch (e) { this.showToast('操作失败：' + (e?.message || e), 'error') }
    },
    removeArticle(a) {
      this.pendingArticle = a
      this.confirmOpen = true
    },
    cancelRemove() {
      this.confirmOpen = false
      this.pendingArticle = null
    },
    async confirmRemove() {
      if (!this.pendingArticle) return
      this.deleting = true
      try {
        await api.delete(`/admin/articles/${this.pendingArticle.id}`)
        this.confirmOpen = false
        this.pendingArticle = null
        this.showToast('文章已删除', 'success')
        this.loadArticles(true)
        // 删除会改变分类下文章数量与“全部”计数，刷新左侧分类树与总数
        await Promise.all([this.loadCategories(), this.syncTotals()])
      } catch (e) {
        this.showToast('删除失败：' + (e?.message || e), 'error')
      } finally {
        this.deleting = false
      }
    },
    showToast(msg, type = 'success') {
      this.toastMsg = msg
      this.toastType = type
      setTimeout(() => { this.toastMsg = '' }, 3000)
    },
    formatDate(v) {
      if (!v) return '-'
      const d = new Date(v)
      if (isNaN(d)) return v
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
}
</script>

<style scoped>
.article-admin {
  display: flex;
  gap: 20px;
  align-items: stretch;
}

/* ============ 左侧分类树 ============ */
.cat-sidebar {
  width: 240px;
  flex: 0 0 240px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 12px;
  overflow-y: auto;
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - 160px);
}
.cat-sidebar__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  padding: 0 4px 12px 14px;
  position: relative;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 10px;
}
.cat-sidebar__title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 15px; border-radius: 4px; background-color: var(--accent);
}
.cat-collapse-all {
  border: none; background: none; color: var(--text-tertiary); font-size: 12px;
  font-family: var(--font-mono); cursor: pointer;
  transition: color var(--transition);
}
.cat-collapse-all:hover { color: var(--accent); }
.cat-tree { display: flex; flex-direction: column; gap: 2px; }
.cat-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: background-color var(--transition), color var(--transition);
  user-select: none;
}
.cat-node:hover { background: var(--bg-soft); color: var(--text-primary); }
.cat-node.active {
  background: var(--accent-light); color: var(--accent); font-weight: 600;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent);
}
.cat-node--root { font-weight: 600; }
.cat-node__toggle {
  width: 16px; height: 16px; flex: 0 0 16px; border: none; background: none; padding: 0;
  cursor: pointer; color: var(--text-tertiary);
  display: inline-flex; align-items: center; justify-content: center;
}
.cat-node__toggle--leaf { visibility: hidden; }
.cat-node__arrow { display: inline-block; font-size: 10px; transition: transform var(--transition); }
.cat-node__arrow.open { transform: rotate(90deg); }
.cat-node__label { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; }
.cat-node__count {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--text-tertiary); background: var(--bg-soft);
  border-radius: 100px; padding: 2px 8px;
  white-space: nowrap; flex-shrink: 0; min-width: max-content;
}
.cat-node.active .cat-node__count { background: var(--bg-card); color: var(--accent); }

/* ============ 右侧主体 ============ */
.article-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ===== Hero ===== */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 24px 28px 22px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}
.hero-glow {
  position: absolute; top: -80px; right: -60px;
  width: 440px; height: 440px; border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px); pointer-events: none;
}
:global([data-theme='dark']) .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%);
}
.page-hero-inner { position: relative; z-index: 1; }
.kicker {
  display: inline-block; font-family: var(--font-mono); font-size: 12.5px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
  padding: 4px 12px; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px; background-color: var(--accent-light); margin-bottom: 16px;
}
.hero-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.page-hero h1 {
  font-family: var(--font-serif); font-size: 34px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.lede { font-size: 15px; color: var(--text-secondary); max-width: 680px; margin: 10px 0 0; }
.hero-note {
  font-size: 12.5px; color: var(--text-tertiary); margin: 8px 0 0;
  font-family: var(--font-mono); letter-spacing: 0.02em;
}
.hero-side {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}

/* ===== Card ===== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-soft);
}
.seg {
  display: inline-flex; gap: 4px; padding: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 100px;
}
.seg__item {
  border: none; background: none; padding: 6px 18px; border-radius: 100px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.seg__item:hover { color: var(--accent); }
.seg__item.active {
  background: var(--bg-card); color: var(--accent); font-weight: 600;
  box-shadow: var(--shadow-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}
.search { position: relative; flex: 1 1 240px; min-width: 200px; }
.search__icon {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  width: 15px; height: 15px; color: var(--text-tertiary); pointer-events: none;
}
.search__input {
  width: 100%; padding: 9px 14px 9px 38px;
  border: 1px solid transparent; border-radius: 100px;
  background: var(--bg-card); color: var(--text-primary);
  font-size: 13.5px; font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition), background-color var(--transition);
}
.search__input::placeholder { color: var(--text-tertiary); }
.search__input:hover { background-color: color-mix(in srgb, var(--bg-card) 85%, var(--accent-light) 15%); }
.search__input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
  text-decoration: none; border: 1px solid transparent;
  transition: all var(--transition); white-space: nowrap;
}
.btn svg { width: 15px; height: 15px; flex-shrink: 0; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn--primary {
  background-color: var(--accent); color: #fff;
  border-color: var(--accent); box-shadow: 0 1px 0 color-mix(in srgb, var(--accent) 30%, transparent);
}
.btn--primary:hover {
  background-color: var(--accent-hover); border-color: var(--accent-hover);
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}
:global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--soft {
  background: var(--accent-light); color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  padding: 8px 14px; font-size: 13px;
}
.btn--soft:hover:not(:disabled) { background-color: var(--accent); color: #fff; }
:global([data-theme='dark']) .btn--soft:hover:not(:disabled) { color: #0f0f0f; }
.btn--soft:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }

/* ===== 列表 / 表格 ===== */
.article-list { overflow: auto; min-height: 0; max-height: 72vh; }
.article-table {
  width: 100%; min-width: 820px;
  border-collapse: collapse; table-layout: fixed;
}
.article-table__head {
  position: sticky; top: 0; z-index: 2; background: var(--bg-soft);
}
.article-table__head th {
  text-align: left; padding: 14px 16px;
  font-family: var(--font-mono);
  font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.article-table td {
  padding: 15px 16px; border-bottom: 1px solid var(--border-light);
  font-size: 14px; color: var(--text-primary); white-space: nowrap;
}
/* 列宽按各自内容的实际需要分配，避免 table-layout: fixed 下平均瓜分导致文字互相压叠 */
.th-index { width: 74px; text-align: center; }
.th-title { width: auto; }
.th-author { width: 92px; }
.th-status { width: 102px; }
.th-updated { width: 156px; }
.cell-index {
  width: 74px; text-align: center; font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  color: var(--text-tertiary); font-size: 12.5px;
}
.cell-index__inner { display: inline-flex; align-items: center; gap: 6px; }
.cell-index__num { min-width: 18px; text-align: right; }
.drag-handle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0;
  color: var(--text-tertiary); cursor: grab; border-radius: 4px;
  transition: color var(--transition), background-color var(--transition);
}
.drag-handle svg { width: 15px; height: 15px; }
.data-row:hover .drag-handle { color: var(--accent); }
.drag-handle:active { cursor: grabbing; }
.data-row { transition: background-color var(--transition); }
.data-row:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.data-row.is-dragging { opacity: 0.5; }
.data-row.is-drag-over {
  background-color: var(--accent-light);
  box-shadow: inset 0 2px 0 var(--accent);
}
.data-row.is-drag-over .cell-index__num { color: var(--accent); font-weight: 600; }
.cell-title {
  font-family: var(--font-serif); font-size: 14px; font-weight: 600;
  letter-spacing: 0.01em;
  max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cell-author { max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; }
.cell-status { white-space: nowrap; }
.cell-muted {
  color: var(--text-tertiary); white-space: nowrap;
  font-family: var(--font-mono); font-size: 12px;
}
.th-views { width: 80px; text-align: right; }
.cell-views {
  width: 80px; text-align: right;
  font-family: var(--font-mono); font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.views-virtual { color: var(--accent); font-weight: 600; }
.views-unset { color: var(--text-tertiary); font-size: 12px; }
.field-hint {
  margin: 0; padding-top: 6px;
  font-size: 12px; line-height: 1.6; color: var(--text-tertiary);
}
.article-table__ops { width: 124px; white-space: nowrap; text-align: right; }
/* 末项去掉右外边距，避免整组操作按钮被多出的间距整体左移 */
.article-table__ops .link:last-child { margin-right: 0; }

.badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 11px;
  border-radius: 100px; font-size: 12px; font-weight: 600;
}
.badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.badge--ok { background: var(--accent-light); color: var(--accent); }
.badge--muted { background: var(--bg-soft); color: var(--text-tertiary); }

.link {
  border: none; background: none; color: var(--accent); cursor: pointer;
  font-size: 13px; font-weight: 500; margin-right: 12px; padding: 0;
  transition: color var(--transition);
}
.link:hover { color: var(--accent-hover); text-decoration: underline; }
.link--danger { color: #e0533d; }
.link--danger:hover { color: #c7442f; text-decoration: underline; }

/* ===== Empty / Loading ===== */
.empty-hint {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 56px; color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 56px 0;
}
.empty__illus {
  width: 64px; height: 64px; border-radius: 50%; background: var(--bg-soft);
  display: grid; place-items: center; margin-bottom: 14px;
  color: var(--text-tertiary);
}
.empty__illus svg { width: 28px; height: 28px; }
.empty__title {
  font-family: var(--font-serif);
  font-size: 15.5px; font-weight: 600; color: var(--text-primary);
  letter-spacing: 0.02em; margin: 0;
}
.empty__sub { margin: 6px 0 0; font-size: 13px; color: var(--text-tertiary); }

.sentinel { text-align: center; padding: 16px 0; min-height: 24px; }
.sentinel__tip {
  font-family: var(--font-mono);
  font-size: 12.5px; color: var(--text-tertiary); letter-spacing: 0.05em;
}

.article-list::-webkit-scrollbar,
.cat-sidebar::-webkit-scrollbar { width: 8px; }
.article-list::-webkit-scrollbar-thumb,
.cat-sidebar::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-tertiary) 35%, transparent); border-radius: 4px;
}
.article-list::-webkit-scrollbar-thumb:hover,
.cat-sidebar::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--text-tertiary) 55%, transparent);
}

/* ===== Toast ===== */
.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  background: var(--bg-card); border: 1px solid var(--accent); color: var(--accent);
  font-size: 14px; font-weight: 500; padding: 10px 22px; border-radius: 100px;
  box-shadow: var(--shadow-lg);
  display: inline-flex; align-items: center; gap: 8px;
  z-index: 4000; max-width: min(480px, 90vw);
}
.toast svg { width: 16px; height: 16px; flex-shrink: 0; }
.toast.error { border-color: #e0533d; color: #e0533d; }
.toast-pop-enter-active, .toast-pop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-pop-enter-from, .toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ===== Responsive ===== */
@media (max-width: 860px) {
  .article-admin { flex-direction: column; }
  .cat-sidebar { width: 100%; flex: none; max-height: 240px; position: static; }
  .page-hero { padding: 18px; }
  .page-hero h1 { font-size: 28px; }
  .hero-side { width: 100%; }
  .article-list { max-height: none; }
}
</style>
