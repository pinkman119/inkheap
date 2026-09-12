<template>
  <div class="xj-admin">
    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">Xiaoji · 小记</span>
            <h1>小记管理</h1>
          </div>
          <div class="hero-side">
            <router-link class="btn btn--primary" :to="{ name: 'admin-xiaoji-new' }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建小记
            </router-link>
          </div>
        </div>
        <p class="lede">管理相册与随笔，支持分类自建、照片上传与发布控制。</p>
        <p class="hero-note">{{ total ?? '—' }} 条记录 · 状态：{{ statusFilter === 'published' ? '已发布' : '草稿' }} · 列表内滚动自动加载</p>
      </div>
    </section>

    <!-- ===== Card ===== -->
    <section class="card">
      <div class="toolbar">
        <div class="seg">
          <button class="seg__item" :class="{ active: statusFilter === 'published' }" @click="setStatus('published')">已发布</button>
          <button class="seg__item" :class="{ active: statusFilter === 'draft' }" @click="setStatus('draft')">草稿</button>
        </div>

        <div class="search">
          <svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchInput"
            class="search__input"
            type="text"
            placeholder="搜索标题 / 摘要 / 地点"
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

      <div ref="listScroll" class="xj-list" @scroll="onScroll">
        <div v-if="loading && !items.length" class="empty-hint">
          <span class="spinner" aria-hidden="true"></span>
          <span>加载中…</span>
        </div>

        <table v-else class="xj-table">
          <thead class="xj-table__head">
            <tr>
              <th class="th-index">序号</th>
              <th>标题</th>
              <th>类型</th>
              <th>分类</th>
              <th>状态</th>
              <th class="th-views">真实阅读</th>
              <th class="th-views">虚拟阅读</th>
              <th>更新时间</th>
              <th class="xj-table__ops">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(a, index) in items" :key="a.id" class="data-row">
              <td class="cell-index">{{ (page - 1) * pageSize + index + 1 }}</td>
              <td class="cell-title">{{ a.title }}</td>
              <td class="cell-type">
                <span class="type-badge" :class="a.type === 'album' ? 'type-badge--album' : 'type-badge--essay'">
                  {{ a.type === 'album' ? '相册' : '随笔' }}
                </span>
              </td>
              <td class="cell-tags">
                <span v-if="a.tags && a.tags.length" class="tag-text">{{ a.tags.join(' / ') }}</span>
                <span v-else class="cell-muted">—</span>
              </td>
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
              <td class="xj-table__ops">
                <button class="link" @click="openEdit(a)">编辑</button>
                <button class="link" @click="togglePublish(a)">
                  {{ a.published ? '回收' : '发布' }}
                </button>
                <button class="link link--danger" @click="removeItem(a)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!items.length && !loading" class="empty">
          <div class="empty__illus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          </div>
          <p class="empty__title">暂无小记</p>
          <p class="empty__sub">试试调整状态筛选或搜索关键词</p>
        </div>

        <div ref="sentinel" class="sentinel">
          <span v-if="loadingMore" class="sentinel__tip">加载中…</span>
          <span v-else-if="!hasMore && items.length" class="sentinel__tip">— 没有更多了 —</span>
          <button v-else-if="loadError" class="link" @click="loadMore">加载失败，点击重试</button>
        </div>
      </div>
    </section>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除小记"
      confirm-label="删除"
      :loading="deleting"
      warn="删除后该小记将从站点与列表中移除，此操作不可撤销。"
      @cancel="cancelRemove"
      @confirm="confirmRemove"
    >
      确定要删除 <strong>《{{ pendingItem?.title }}》</strong> 吗？
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
  name: 'AdminXiaojiList',
  components: { ConfirmDialog },
  data() {
    return {
      searchInput: '',
      statusFilter: 'published',
      items: [],
      total: null,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      loading: false,
      loadingMore: false,
      loadError: false,
      _loadSeq: 0,
      _observer: null,

      // 删除确认弹窗
      confirmOpen: false,
      pendingItem: null,
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
  },
  mounted() {
    this.loadItems(true)
    this.setupObserver()
  },
  beforeUnmount() {
    if (this._observer) this._observer.disconnect()
  },
  methods: {
    buildParams() {
      const params = { page: this.page, pageSize: this.pageSize }
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
    async loadItems(reset = false) {
      if (reset) {
        this.page = 1
        this.items = []
        this._loadSeq += 1
        this.loadingMore = false
      }
      const seq = this._loadSeq
      this.loading = true
      this.loadError = false
      try {
        const data = await api.get(`/admin/xiaoji${this.buildQuery()}`)
        if (seq !== this._loadSeq) return
        const items = Array.isArray(data) ? data : (data.list || [])
        this.items = reset ? items : this.items.concat(items)
        this.total = typeof data.total === 'number' ? data.total : this.items.length
        this.totalPages = data.totalPages || 1
        this.page = data.page || this.page
      } catch (e) {
        if (seq !== this._loadSeq) return
        this.loadError = true
      } finally {
        if (seq === this._loadSeq) { this.loading = false; this.loadingMore = false }
      }
    },
    async loadMore() {
      if (this.loadingMore || this.loading || !this.hasMore) return
      this.loadingMore = true
      this.loadError = false
      const seq = this._loadSeq
      this.page += 1
      try {
        const data = await api.get(`/admin/xiaoji${this.buildQuery()}`)
        if (seq !== this._loadSeq) return
        const items = Array.isArray(data) ? data : (data.list || [])
        this.items = this.items.concat(items)
        this.totalPages = data.totalPages || this.totalPages
        this.page = data.page || this.page
      } catch (e) {
        if (seq !== this._loadSeq) return
        this.loadError = true
        this.page -= 1
      } finally {
        if (seq === this._loadSeq) this.loadingMore = false
      }
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
    onFilterChange() {
      this.loadItems(true)
      if (this.$refs.listScroll) this.$refs.listScroll.scrollTop = 0
    },
    resetFilters() {
      this.searchInput = ''
      this.statusFilter = 'published'
      this.onFilterChange()
    },
    openEdit(a) {
      this.$router.push({ name: 'admin-xiaoji-edit', params: { id: a.id } })
    },
    async togglePublish(a) {
      const next = !a.published
      try {
        await api.put(`/admin/xiaoji/${a.id}`, { published: next })
        const idx = this.items.findIndex((x) => x.id === a.id)
        if (idx >= 0) {
          this.items.splice(idx, 1)
          if (typeof this.total === 'number') this.total = Math.max(0, this.total - 1)
        }
      } catch (e) { this.showToast('操作失败：' + (e?.message || e), 'error') }
    },
    removeItem(a) {
      this.pendingItem = a
      this.confirmOpen = true
    },
    cancelRemove() {
      this.confirmOpen = false
      this.pendingItem = null
    },
    async confirmRemove() {
      if (!this.pendingItem) return
      this.deleting = true
      try {
        await api.delete(`/admin/xiaoji/${this.pendingItem.id}`)
        this.confirmOpen = false
        this.pendingItem = null
        this.showToast('小记已删除', 'success')
        this.loadItems(true)
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
    },
  },
}
</script>

<style scoped>
.xj-admin {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

/* ===== Hero ===== */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 28px 26px;
  border-bottom: 1px solid var(--border-light);
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
  font-family: var(--font-serif); font-size: 38px; font-weight: 700;
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
.btn--soft:hover { background-color: var(--accent); color: #fff; }
:global([data-theme='dark']) .btn--soft:hover { color: #0f0f0f; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }

/* ===== Card ===== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 22px 0 8px;
}

/* ===== Toolbar ===== */
.toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 16px 18px;
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

/* ===== Table ===== */
.xj-list { overflow-y: auto; min-height: 0; max-height: 72vh; }
.xj-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.xj-table__head { position: sticky; top: 0; z-index: 2; background: var(--bg-soft); }
.xj-table__head th {
  text-align: left; padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.xj-table td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px; color: var(--text-primary); white-space: nowrap;
}
.th-index { width: 56px; text-align: center; }
.cell-index {
  width: 56px; text-align: center;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  color: var(--text-tertiary); font-size: 12.5px;
}
.data-row { transition: background-color var(--transition); }
.data-row:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.cell-title {
  font-family: var(--font-serif); font-size: 14px; font-weight: 600;
  letter-spacing: 0.01em;
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cell-tags { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-muted {
  color: var(--text-tertiary); white-space: nowrap;
  font-family: var(--font-mono); font-size: 12px;
}
.th-views { width: 88px; text-align: right; }
.cell-views {
  width: 88px; text-align: right;
  font-family: var(--font-mono); font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.views-virtual { color: var(--accent); font-weight: 600; }
.views-unset { color: var(--text-tertiary); font-size: 12px; }
.xj-table__ops { white-space: nowrap; text-align: right; }

.type-badge {
  display: inline-flex; align-items: center; padding: 2px 11px;
  border-radius: 100px; font-size: 12px; font-weight: 600;
}
.type-badge--album { background: var(--accent-light); color: var(--accent); }
.type-badge--essay { background: #f0eafc; color: #7c5cbf; }
:global([data-theme='dark']) .type-badge--essay { background: #262033; }
.tag-text { font-size: 13px; color: var(--text-secondary); }

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
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--bg-soft);
  display: grid; place-items: center;
  margin-bottom: 14px; color: var(--text-tertiary);
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

.xj-list::-webkit-scrollbar { width: 8px; }
.xj-list::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-tertiary) 35%, transparent); border-radius: 4px;
}
.xj-list::-webkit-scrollbar-thumb:hover {
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
  .page-hero { padding: 20px 18px 20px; }
  .page-hero h1 { font-size: 30px; }
  .hero-side { width: 100%; }
  .xj-list { max-height: none; }
}
</style>
