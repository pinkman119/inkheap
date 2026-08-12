<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const api = useApi()

// State
const articles = ref([])
const categories = ref([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('all')
const showDeleteModal = ref(false)
const deleteTarget = ref(null)
const toastMsg = ref('')
const toastType = ref('success')

// Load
async function loadArticles(resetPage = false) {
  if (resetPage) page.value = 1
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', page.value)
    params.set('pageSize', pageSize.value)
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (selectedCategory.value) params.set('categoryKey', selectedCategory.value)
    if (selectedStatus.value !== 'all') params.set('status', selectedStatus.value)

    const data = await api.get(`/admin/articles?${params.toString()}`)
    articles.value = data.items
    total.value = data.total
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await api.get('/admin/categories')
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  loadCategories()
  loadArticles()
})

// Actions
function goPage(p) {
  page.value = p
  loadArticles()
}

function onSearch() {
  loadArticles(true)
}

function onCategoryChange(key) {
  selectedCategory.value = key
  loadArticles(true)
}

function onStatusChange(status) {
  selectedStatus.value = status
  loadArticles(true)
}

function goCreate() {
  router.push({ name: 'admin-article-new' })
}

function goEdit(id) {
  router.push({ name: 'admin-article-edit', params: { id } })
}

function confirmDelete(article) {
  deleteTarget.value = article
  showDeleteModal.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await api.delete(`/admin/articles/${deleteTarget.value.id}`)
    showToast(`「${deleteTarget.value.title}」已删除`, 'success')
    showDeleteModal.value = false
    deleteTarget.value = null
    loadArticles()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
  }
}

async function toggleStatus(article) {
  try {
    await api.put(`/admin/articles/${article.id}`, { published: !article.published })
    article.published = !article.published
    showToast(article.published ? '已发布' : '已设为草稿', 'success')
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
  }
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <div class="article-list">
    <!-- Toast -->
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>文章管理</h2>
        <p class="page-desc">管理知识库中的所有文章</p>
      </div>
      <button class="btn-primary" @click="goCreate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建文章
      </button>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 分类 Tab -->
      <div class="cat-tabs">
        <button
          :class="['cat-tab', { active: selectedCategory === '' }]"
          @click="onCategoryChange('')"
        >全部</button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          :class="['cat-tab', { active: selectedCategory === cat.key }]"
          @click="onCategoryChange(cat.key)"
        >{{ cat.name }}</button>
      </div>

      <div class="toolbar-right">
        <!-- 状态筛选 -->
        <select class="select-sm" :value="selectedStatus" @change="onStatusChange(($event.target).value)">
          <option value="all">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>

        <!-- 搜索 -->
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            placeholder="搜索文章..."
            @keyup.enter="onSearch"
            @input="onSearch"
          />
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>分类</th>
            <th>作者</th>
            <th>状态</th>
            <th>阅读量</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="td-center">
              <span class="loading-text">加载中...</span>
            </td>
          </tr>
          <tr v-else-if="!articles.length">
            <td colspan="7" class="td-center">
              <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>{{ searchQuery ? '没有匹配的文章' : '暂无文章' }}</p>
                <button v-if="!searchQuery" class="btn-link" @click="goCreate">创建第一篇文章</button>
              </div>
            </td>
          </tr>
          <tr v-for="item in articles" :key="item.id" @click="goEdit(item.id)" class="clickable-row">
            <td>
              <div class="cell-title">
                <span class="title-text">{{ item.title }}</span>
                <span v-if="item.featured" class="badge-star">★</span>
              </div>
            </td>
            <td><span class="cell-tag">{{ item.categoryKey }}</span></td>
            <td>{{ item.author }}</td>
            <td>
              <span class="status-dot" :class="item.published ? 'dot-on' : 'dot-off'"></span>
              {{ item.published ? '已发布' : '草稿' }}
            </td>
            <td>{{ item.viewCount }}</td>
            <td class="cell-date">{{ formatDate(item.createdAt) }}</td>
            <td class="cell-actions" @click.stop>
              <button class="btn-icon" :title="item.published ? '下线' : '发布'" @click="toggleStatus(item)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline v-if="!item.published" points="20,6 9,17 4,12"/>
                  <g v-else>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </g>
                </svg>
              </button>
              <button class="btn-icon" title="编辑" @click="goEdit(item.id)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger" title="删除" @click="confirmDelete(item)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="page <= 1" @click="goPage(page - 1)" class="btn-page">← 上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }} (共 {{ total }} 篇)</span>
      <button :disabled="page >= totalPages" @click="goPage(page + 1)" class="btn-page">下一页 →</button>
    </div>

    <!-- 删除确认模态框 -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-card">
          <h4>确认删除</h4>
          <p>确定要删除「<strong>{{ deleteTarget?.title }}</strong>」吗？此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showDeleteModal = false">取消</button>
            <button class="btn-danger" @click="doDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* --- Page head --- */
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 4px 0 0; }

/* --- Toast --- */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  box-shadow: var(--shadow-md);
}
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* --- Buttons --- */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-link { color: var(--accent); background: none; border: none; cursor: pointer; font-size: 14px; }
.btn-link:hover { text-decoration: underline; }

/* --- Toolbar --- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cat-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cat-tab {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 100px;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.cat-tab:hover { background: var(--bg-soft); color: var(--text-primary); }
.cat-tab.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }

.toolbar-right { display: flex; align-items: center; gap: 8px; }

.select-sm {
  height: 34px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  outline: none;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 34px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  transition: border-color var(--transition);
}
.search-box:focus-within { border-color: var(--accent); }
.search-box input {
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-primary);
  background: transparent;
  width: 180px;
}

/* --- Table --- */
.table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
}
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-secondary);
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }

.td-center { text-align: center; padding: 48px 16px !important; }

.clickable-row { cursor: pointer; transition: background var(--transition); }
.clickable-row:hover { background: rgba(45,130,100,0.03); }

.loading-text { color: var(--text-tertiary); font-size: 13px; }

.cell-title { display: flex; align-items: center; gap: 6px; }
.title-text { font-weight: 500; color: var(--text-primary); }
.badge-star { color: #f59f00; font-size: 14px; }

.cell-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--bg-soft);
  border-radius: 100px;
  color: var(--text-secondary);
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.dot-on { background: #2d8264; box-shadow: 0 0 0 2px #2d826420; }
.dot-off { background: #adb5bd; }

.cell-date { font-size: 13px; white-space: nowrap; }

.cell-actions { display: flex; gap: 4px; }

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}
.btn-icon:hover { background: var(--bg-soft); color: var(--text-primary); }
.btn-icon-danger:hover { background: #fff5f5; color: #e03131; }

/* --- Empty --- */
.empty-state { padding: 8px 0; }
.empty-icon { font-size: 36px; display: block; margin-bottom: 8px; opacity: 0.5; }
.empty-state p { margin: 0 0 12px; font-size: 14px; color: var(--text-tertiary); }

/* --- Pagination --- */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.btn-page {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}
.btn-page:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-tertiary); }

/* --- Modal --- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-card {
  width: 400px;
  max-width: 90vw;
  padding: 28px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.modal-card h4 { margin: 0 0 12px; font-size: 17px; color: var(--text-primary); }
.modal-card p { margin: 0 0 24px; font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

.btn-cancel {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-cancel:hover { background: var(--border); }

.btn-danger {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #e03131;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-danger:hover { background: #c92a2a; }
</style>
