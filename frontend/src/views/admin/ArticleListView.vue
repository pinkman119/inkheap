<template>
  <div class="article-admin">
    <!-- 左侧：分类管理侧栏（树形，多级标签） -->
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
          <span class="cat-node__label">全部</span>
          <span v-if="allTotal !== null" class="cat-node__count">{{ allTotal }}</span>
        </div>

        <template v-for="node in flatNodes" :key="node.key">
          <div
            class="cat-node"
            :class="{ active: selectedCategoryKey === node.key }"
            :style="{ paddingLeft: 12 + node.depth * 18 + 'px' }"
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

    <!-- 右侧：筛选 + 列表 -->
    <section class="article-main">
      <div class="page-head">
        <div>
          <h1 class="page-head__title">文章管理</h1>
          <p class="page-head__sub">管理站点全部文章，按分类、状态与关键词检索</p>
        </div>
        <router-link class="btn btn--primary" :to="{ name: 'admin-article-new' }">
          <span class="btn__icon">＋</span> 新建文章
        </router-link>
      </div>

      <div class="card">
        <div class="toolbar">
          <div class="seg">
            <button class="seg__item" :class="{ active: statusFilter === 'published' }" @click="setStatus('published')">已发布</button>
            <button class="seg__item" :class="{ active: statusFilter === 'draft' }" @click="setStatus('draft')">草稿</button>
          </div>

          <div class="search">
            <span class="search__icon">⌕</span>
            <input
              v-model="searchInput"
              class="search__input"
              type="text"
              placeholder="搜索标题 / 摘要 / 作者"
              @keyup.enter="onFilterChange"
            />
          </div>

          <button class="btn btn--soft" @click="onFilterChange">搜索</button>
          <button class="btn btn--ghost" @click="resetFilters">重置</button>
        </div>

        <div ref="listScroll" class="article-list" @scroll="onScroll">
          <table class="article-table">
            <thead class="article-table__head">
              <tr>
                <th class="th-index">#</th>
                <th>标题</th>
                <th>作者</th>
                <th>状态</th>
                <th>更新时间</th>
                <th class="article-table__ops">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, index) in articles" :key="a.id" class="data-row">
                <td class="cell-index">{{ (page - 1) * pageSize + index + 1 }}</td>
                <td class="cell-title">{{ a.title }}</td>
                <td class="cell-author">{{ a.author }}</td>
                <td class="cell-status">
                  <span class="badge" :class="a.published ? 'badge--ok' : 'badge--muted'">
                    {{ a.published ? '已发布' : '草稿' }}
                  </span>
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
            <div class="empty__illus">📄</div>
            <p class="empty__title">暂无文章</p>
            <p class="empty__sub">试试调整分类、状态或搜索关键词</p>
          </div>

          <div ref="sentinel" class="sentinel">
            <span v-if="loadingMore" class="sentinel__tip">加载中…</span>
            <span v-else-if="!hasMore && articles.length" class="sentinel__tip">没有更多了</span>
            <button v-else-if="loadError" class="link" @click="loadMore">加载失败，点击重试</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 编辑抽屉 -->
    <transition name="drawer">
      <div v-if="drawerOpen" class="drawer-mask" @click="closeDrawer">
        <div class="drawer" @click.stop>
          <div class="drawer__header">
            <h2 class="drawer__title">编辑文章</h2>
            <button class="drawer__close" @click="closeDrawer" aria-label="关闭">×</button>
          </div>

          <div v-if="editLoading" class="drawer__loading">加载中…</div>

          <div v-else class="drawer__body">
            <div class="field">
              <label>标题 <span class="req">*</span></label>
              <input v-model="editForm.title" type="text" placeholder="输入文章标题" @change="autoSlug" />
            </div>

            <div class="field-row">
              <div class="field flex-1">
                <label>Slug</label>
                <input v-model="editForm.slug" type="text" placeholder="url-friendly-slug" />
              </div>
              <div class="field flex-1">
                <label>作者</label>
                <input v-model="editForm.author" type="text" placeholder="墨堆" />
              </div>
            </div>

            <div class="field">
              <label>分类 <span class="req">*</span></label>
              <select v-model="editForm.categoryKey">
                <option value="" disabled>选择分类</option>
                <option v-for="cat in editCategories" :key="cat.id" :value="cat.key">
                  {{ cat.parentKey ? '　' : '' }}{{ cat.name }}
                </option>
              </select>
            </div>

            <div class="field-row field-row--cover">
              <div class="field flex-1">
                <label>封面图 URL</label>
                <input v-model="editForm.coverImage" type="text" placeholder="https://..." />
              </div>
              <div class="field field--preview">
                <label>&nbsp;</label>
                <button
                  class="btn btn--soft cover-preview-btn"
                  type="button"
                  :disabled="!editForm.coverImage"
                  @click="openCoverPreview"
                >预览封面</button>
              </div>
            </div>

            <div class="field">
              <label>摘要</label>
              <textarea v-model="editForm.summary" rows="2" placeholder="文章摘要，用于列表展示..."></textarea>
            </div>

            <div class="field">
              <label>标签</label>
              <div class="tags-input">
                <span v-for="t in editForm.tags" :key="t" class="tag-chip">
                  {{ t }}
                  <button class="tag-remove" @click="removeEditTag(t)">&times;</button>
                </span>
                <input
                  v-model="editTagInput"
                  type="text"
                  placeholder="输入标签后回车"
                  @keyup.enter.prevent="addEditTag"
                />
              </div>
            </div>

            <div class="field">
              <label>正文 <span class="req">*</span></label>
              <textarea v-model="editForm.content" class="content-editor" rows="14" placeholder="Markdown 内容..."></textarea>
            </div>

            <div class="field-row toggle-row">
              <label class="toggle-label">
                <input type="checkbox" v-model="editForm.published" /><span></span> 发布
              </label>
              <label class="toggle-label">
                <input type="checkbox" v-model="editForm.featured" /><span></span> 精选
              </label>
            </div>
          </div>

          <div v-if="!editLoading" class="drawer__footer">
            <span v-if="editSaving" class="saving-hint">保存中…</span>
            <button class="btn btn--ghost" @click="closeDrawer">取消</button>
            <button class="btn btn--primary" :disabled="editSaving" @click="saveEdit">保存修改</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 封面预览弹窗 -->
    <transition name="fade">
      <div v-if="coverPreviewOpen" class="cover-modal-mask" @click="closeCoverPreview">
        <div class="cover-modal" @click.stop>
          <div class="cover-modal__header">
            <span class="cover-modal__title">封面预览</span>
            <button class="cover-modal__close" @click="closeCoverPreview" aria-label="关闭">×</button>
          </div>
          <div class="cover-modal__body">
            <img
              v-if="editForm.coverImage"
              class="cover-modal__img"
              :src="editForm.coverImage"
              alt="封面"
              @error="onCoverError"
            />
            <p v-if="coverLoadError" class="cover-modal__error">图片加载失败，请检查 URL 是否正确</p>
            <p v-if="!editForm.coverImage" class="cover-modal__error">未填写封面图 URL</p>
          </div>
          <div class="cover-modal__footer">
            <a
              v-if="editForm.coverImage && !coverLoadError"
              class="link"
              :href="editForm.coverImage"
              target="_blank"
              rel="noopener"
            >打开原图</a>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useApi } from '../../composables/useApi'

const api = useApi()

export default {
  name: 'AdminArticleList',
  data() {
    return {
      rawCategories: [],
      expandedKeys: [],
      allExpanded: true,
      selectedCategoryKey: null,
      searchInput: '',
      statusFilter: 'published',
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

      // 编辑抽屉
      drawerOpen: false,
      editId: null,
      editLoading: false,
      editSaving: false,
      editCategories: [],
      editTagInput: '',

      // 封面预览弹窗
      coverPreviewOpen: false,
      coverLoadError: false,
      editForm: {
        title: '', slug: '', summary: '', content: '', coverImage: '',
        categoryKey: '', tags: [], author: '墨堆', published: false, featured: false
      }
    }
  },
  computed: {
    hasMore() {
      return this.page < this.totalPages
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
  async mounted() {
    await this.loadCategories()
    await this.loadArticles(true)
    this.setupObserver()
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    if (this._observer) this._observer.disconnect()
    window.removeEventListener('keydown', this.onKeydown)
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
      if (reset) { this.page = 1; this.articles = [] }
      this.loading = true
      this.loadError = false
      try {
        const data = await api.get(`/admin/articles${this.buildQuery()}`)
        const items = Array.isArray(data) ? data : (data.items || [])
        this.articles = reset ? items : this.articles.concat(items)
        this.total = typeof data.total === 'number' ? data.total : this.articles.length
        // “全部”节点显示的是不带分类筛选的全库总数，仅在选择“全部”重新加载时刷新
        if (reset && !this.selectedCategoryKey) {
          this.allTotal = this.total
        }
        this.totalPages = data.totalPages || 1
        this.page = data.page || this.page
      } catch (e) { this.loadError = true }
      finally { this.loading = false; this.loadingMore = false }
    },
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      this.loadError = false
      this.page += 1
      try {
        const data = await api.get(`/admin/articles${this.buildQuery()}`)
        const items = Array.isArray(data) ? data : (data.items || [])
        this.articles = this.articles.concat(items)
        this.totalPages = data.totalPages || this.totalPages
        this.page = data.page || this.page
      } catch (e) { this.loadError = true; this.page -= 1 }
      finally { this.loadingMore = false }
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
      this.statusFilter = 'published'
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

    /* ===== 编辑抽屉 ===== */
    async openEdit(a) {
      this.editId = a.id
      this.drawerOpen = true
      this.editLoading = true
      try {
        if (!this.editCategories.length) {
          this.editCategories = await api.get('/admin/categories')
        }
        const article = await api.get(`/admin/articles/${a.id}`)
        this.editForm = {
          title: article.title,
          slug: article.slug || '',
          summary: article.summary || '',
          content: article.content,
          coverImage: article.coverImage || '',
          categoryKey: article.categoryKey,
          tags: article.tags || [],
          author: article.author,
          published: article.published,
          featured: article.featured
        }
      } catch (e) {
        alert('加载文章失败：' + (e?.message || e))
        this.closeDrawer()
      } finally {
        this.editLoading = false
      }
    },
    closeDrawer() {
      this.drawerOpen = false
      this.editId = null
    },

    /* ===== 封面预览弹窗 ===== */
    openCoverPreview() {
      if (!this.editForm.coverImage) return
      this.coverLoadError = false
      this.coverPreviewOpen = true
    },
    closeCoverPreview() {
      this.coverPreviewOpen = false
    },
    onCoverError() {
      this.coverLoadError = true
    },
    onKeydown(e) {
      if (e.key === 'Escape') {
        if (this.coverPreviewOpen) this.closeCoverPreview()
        else if (this.drawerOpen) this.closeDrawer()
      }
    },
    autoSlug() {
      if (!this.editForm.slug) {
        this.editForm.slug = (this.editForm.title || '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-|-$/g, '')
      }
    },
    addEditTag() {
      const t = this.editTagInput.trim()
      if (t && !this.editForm.tags.includes(t)) this.editForm.tags.push(t)
      this.editTagInput = ''
    },
    removeEditTag(t) {
      this.editForm.tags = this.editForm.tags.filter((x) => x !== t)
    },
    async saveEdit() {
      if (!this.editForm.title || !this.editForm.content || !this.editForm.categoryKey) {
        alert('请填写标题、内容和分类')
        return
      }
      if (!this.editForm.slug) this.autoSlug()
      this.editSaving = true
      try {
        await api.put(`/admin/articles/${this.editId}`, this.editForm)
        this.closeDrawer()
        this.loadArticles(true)
      } catch (e) {
        alert('保存失败：' + (e?.message || e))
      } finally {
        this.editSaving = false
      }
    },

    async togglePublish(a) {
      const next = !a.published
      try {
        await api.put(`/admin/articles/${a.id}`, { published: next })
        // 发布/回收后文章已不属于当前状态筛选视图，直接从列表移除该卡片，
        // 避免带着原状态过滤重新拉取导致整页数据“消失”。
        const idx = this.articles.findIndex((x) => x.id === a.id)
        if (idx >= 0) {
          this.articles.splice(idx, 1)
          if (typeof this.total === 'number') this.total = Math.max(0, this.total - 1)
        }
        // 发布/回收会改变分类下已发布文章数量与“全部”计数，刷新左侧分类树与总数
        await Promise.all([this.loadCategories(), this.syncTotals()])
      } catch (e) { alert('操作失败：' + (e?.message || e)) }
    },
    async removeArticle(a) {
      if (!confirm(`确认删除《${a.title}》？`)) return
      try {
        await api.delete(`/admin/articles/${a.id}`)
        this.loadArticles(true)
        // 删除会改变分类下文章数量与“全部”计数，刷新左侧分类树与总数
        await Promise.all([this.loadCategories(), this.syncTotals()])
      } catch (e) { alert('删除失败：' + (e?.message || e)) }
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
  height: 100%;
}

/* ============ 左侧分类树 ============ */
.cat-sidebar {
  width: 240px;
  flex: 0 0 240px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 16px 12px;
  overflow-y: auto;
}
.cat-sidebar__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 8px;
}
.cat-collapse-all {
  border: none; background: none; color: var(--text-tertiary); font-size: 12px; cursor: pointer;
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
.cat-node.active { background: var(--accent-light); color: var(--accent); font-weight: 600; }
.cat-node--root { font-weight: 600; }
.cat-node__toggle {
  width: 16px; height: 16px; flex: 0 0 16px; border: none; background: none; padding: 0;
  cursor: pointer; color: var(--text-tertiary);
  display: inline-flex; align-items: center; justify-content: center;
}
.cat-node__toggle--leaf { visibility: hidden; }
.cat-node__arrow { display: inline-block; font-size: 10px; transition: transform var(--transition); }
.cat-node__arrow.open { transform: rotate(90deg); }
.cat-node__label { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-node__count {
  font-size: 12px; color: var(--text-tertiary); background: var(--bg-soft);
  border-radius: 100px; padding: 1px 8px;
  white-space: nowrap; flex-shrink: 0; min-width: max-content;
}
.cat-node.active .cat-node__count { background: var(--bg-card); color: var(--accent); }

/* ============ 右侧主体 ============ */
.article-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 16px;
}
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.page-head__title { font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.02em; }
.page-head__sub { margin-top: 4px; font-size: 13px; color: var(--text-secondary); }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 16px; border-bottom: 1px solid var(--border-light);
}
.seg { display: inline-flex; gap: 2px; padding: 3px; background: var(--bg-soft); border-radius: var(--radius-sm); }
.seg__item {
  border: none; background: none; padding: 6px 14px; border-radius: var(--radius-sm);
  font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: all var(--transition);
}
.seg__item:hover { color: var(--text-primary); }
.seg__item.active { background: var(--bg-card); color: var(--accent); font-weight: 600; box-shadow: var(--shadow-sm); }
.search { position: relative; flex: 1 1 240px; min-width: 200px; }
.search__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 16px; }
.search__input {
  width: 100%; padding: 8px 14px 8px 34px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); background: var(--bg-body); color: var(--text-primary);
  font-size: 14px; outline: none; transition: border-color var(--transition), box-shadow var(--transition);
}
.search__input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }

.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; cursor: pointer;
  text-decoration: none; border: 1px solid transparent; transition: all var(--transition);
}
.btn__icon { font-size: 16px; line-height: 1; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: var(--accent-hover); box-shadow: var(--shadow-md); }
.btn--soft { background: var(--accent-light); color: var(--accent); border-color: transparent; }
.btn--soft:hover { background: var(--accent); color: #fff; }
.btn--ghost { background: transparent; border-color: var(--border); color: var(--text-secondary); }
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); }

/* 列表 / 表格 —— 每行字段强制单行 */
.article-list { flex: 1 1 auto; overflow-y: auto; min-height: 0; }
.article-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.article-table__head {
  position: sticky; top: 0; z-index: 2; background: var(--bg-soft);
}
.article-table__head th {
  text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600;
  letter-spacing: 0.04em; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light); white-space: nowrap;
}
.article-table td {
  padding: 12px 16px; border-bottom: 1px solid var(--border-light);
  font-size: 14px; color: var(--text-primary); white-space: nowrap;
}
.th-index { width: 52px; text-align: center; }
.cell-index {
  width: 52px; text-align: center; font-variant-numeric: tabular-nums;
  color: var(--text-tertiary); font-size: 13px;
}
.data-row { transition: background-color var(--transition); }
.data-row:hover { background: var(--bg-soft); }
.cell-title { font-weight: 500; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-author { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-status { white-space: nowrap; }
.cell-muted { color: var(--text-tertiary); white-space: nowrap; }
.article-table__ops { white-space: nowrap; }

.badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
  border-radius: 100px; font-size: 12px; font-weight: 500;
}
.badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.badge--ok { background: var(--accent-light); color: var(--accent); }
.badge--muted { background: var(--bg-soft); color: var(--text-tertiary); }

.link {
  border: none; background: none; color: var(--accent); cursor: pointer;
  font-size: 13px; margin-right: 12px; padding: 0;
}
.link:hover { color: var(--accent-hover); text-decoration: underline; }
.link--danger { color: #d9534f; }
.link--danger:hover { text-decoration: underline; }

.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 56px 0;
}
.empty__illus {
  width: 64px; height: 64px; border-radius: 50%; background: var(--bg-soft);
  display: grid; place-items: center; font-size: 28px; margin-bottom: 12px;
}
.empty__title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.empty__sub { margin-top: 4px; font-size: 13px; color: var(--text-tertiary); }

.sentinel { text-align: center; padding: 16px 0; min-height: 24px; }
.sentinel__tip { font-size: 13px; color: var(--text-tertiary); }

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

/* ============ 编辑抽屉 ============ */
.drawer-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(17, 24, 28, 0.45);
  display: flex; justify-content: flex-end;
}
.drawer {
  width: 460px; max-width: 92vw; height: 100%;
  background: var(--bg-card);
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.12);
  display: flex; flex-direction: column;
}
.drawer__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border-light);
}
.drawer__title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0; }
.drawer__close {
  width: 32px; height: 32px; border: none; border-radius: var(--radius-sm);
  background: var(--bg-soft); color: var(--text-secondary); font-size: 20px;
  line-height: 1; cursor: pointer;
}
.drawer__close:hover { background: var(--border-light); color: var(--text-primary); }
.drawer__loading { padding: 40px; text-align: center; color: var(--text-tertiary); }
.drawer__body { flex: 1 1 auto; overflow-y: auto; padding: 20px; }
.drawer__footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 20px; border-top: 1px solid var(--border-light);
}
.saving-hint { font-size: 13px; color: var(--text-tertiary); margin-right: auto; }

/* 抽屉内表单 */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.req { color: #e03131; margin-left: 2px; }
.field input, .field select, .field textarea {
  padding: 9px 12px; font-size: 14px; color: var(--text-primary);
  background: var(--bg-body); border: 1px solid var(--border);
  border-radius: var(--radius-sm); outline: none;
  transition: border-color var(--transition), box-shadow var(--transition); resize: vertical;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light);
}
.field-row { display: flex; gap: 14px; }
.flex-1 { flex: 1; min-width: 0; }
.content-editor { font-family: var(--font-mono); font-size: 13px; line-height: 1.7; min-height: 240px; }
.tags-input {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 10px;
  background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-sm); min-height: 38px;
}
.tags-input:focus-within { border-color: var(--accent); }
.tags-input input { border: none; outline: none; font-size: 13px; background: transparent; flex: 1; min-width: 100px; padding: 4px 0; }
.tag-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
  font-size: 12px; background: var(--accent-light); color: var(--accent); border-radius: 100px;
}
.tag-remove { border: none; background: transparent; color: inherit; font-size: 14px; line-height: 1; cursor: pointer; padding: 0; opacity: 0.6; }
.tag-remove:hover { opacity: 1; }
.toggle-row { align-items: center; }
.toggle-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-primary); cursor: pointer; user-select: none; }
.toggle-label input { display: none; }
.toggle-label input + span {
  width: 40px; height: 22px; border-radius: 100px; background: var(--border); position: relative; transition: background var(--transition);
}
.toggle-label input + span::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: transform var(--transition); box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-label input:checked + span { background: var(--accent); }
.toggle-label input:checked + span::after { transform: translateX(18px); }

/* 抽屉动画 */
.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }

@media (max-width: 860px) {
  .article-admin { flex-direction: column; height: auto; }
  .cat-sidebar { width: 100%; flex: none; max-height: 240px; }
}

/* 封面图预览按钮 */
.field--preview { flex: 0 0 auto; justify-content: flex-end; }
.cover-preview-btn { align-self: flex-start; margin-top: 2px; }

/* ============ 封面预览弹窗 ============ */
.cover-modal-mask {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(17, 24, 28, 0.55);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.cover-modal {
  width: 640px; max-width: 92vw; max-height: 88vh;
  background: var(--bg-card); border-radius: var(--radius-lg);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; overflow: hidden;
}
.cover-modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--border-light);
}
.cover-modal__title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.cover-modal__close {
  width: 30px; height: 30px; border: none; border-radius: var(--radius-sm);
  background: var(--bg-soft); color: var(--text-secondary); font-size: 20px;
  line-height: 1; cursor: pointer;
}
.cover-modal__close:hover { background: var(--border-light); color: var(--text-primary); }
.cover-modal__body {
  flex: 1 1 auto; overflow: auto; padding: 18px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-soft);
}
.cover-modal__img {
  max-width: 100%; max-height: 60vh; border-radius: var(--radius-sm);
  background: #fff; box-shadow: var(--shadow-sm); display: block;
}
.cover-modal__error { color: var(--text-tertiary); font-size: 14px; text-align: center; }
.cover-modal__footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 12px 18px; border-top: 1px solid var(--border-light);
}
.cover-modal__footer .link { margin-right: 0; }

/* 弹窗淡入淡出 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
