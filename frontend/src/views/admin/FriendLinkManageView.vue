<script setup>
/**
 * 后台 · 友链管理（前台「邻居」页）
 * - 友链列表：增删改查 + 排序 + 模式 / 状态
 * - 加入申请：前台提交的每一条评论都会生成申请，只有「通过」后才会写入友链并展示到前台
 */
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAdminBadges } from '@/composables/useAdminBadges'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()
const { refreshPendingFriends } = useAdminBadges()

// ==================== 通用 ====================
const tab = ref('links') // links | applications
const toast = ref('')
const loading = ref(false)

function showToast(text) {
  toast.value = text
  setTimeout(() => (toast.value = ''), 2200)
}

const MODE_OPTIONS = [
  { v: 0, label: '双模式' },
  { v: 1, label: '仅工作' },
  { v: 2, label: '仅生活' },
]
const STATUS_OPTIONS = [
  { v: 'active', label: '正常' },
  { v: 'dormant', label: '失联' },
]
const APP_STATUS = {
  pending: { label: '待审核', cls: 'pending' },
  approved: { label: '已通过', cls: 'approved' },
  rejected: { label: '已拒绝', cls: 'rejected' },
}

function modeLabel(m) {
  return MODE_OPTIONS.find((o) => o.v === m)?.label || '双模式'
}
function statusLabel(s) {
  return STATUS_OPTIONS.find((o) => o.v === s)?.label || s
}
function fmtTime(t) {
  if (!t) return '—'
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ==================== 友链列表 ====================
const links = ref([])
const linkKeyword = ref('')
const linkStatus = ref('all')

const filteredLinks = computed(() => {
  const kw = linkKeyword.value.trim().toLowerCase()
  return links.value.filter((l) => {
    if (linkStatus.value !== 'all' && l.status !== linkStatus.value) return false
    if (!kw) return true
    return [l.name, l.url, l.desc, l.group, l.tag]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(kw))
  })
})

async function loadLinks() {
  loading.value = true
  try {
    const res = await api.get('/admin/friend-links')
    links.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('加载友链失败', e)
  } finally {
    loading.value = false
  }
}

// ==================== 友链编辑弹窗 ====================
const editorOpen = ref(false)
const editingId = ref(null)
const saving = ref(false)
const blankLink = () => ({
  name: '',
  url: '',
  avatar: '',
  tag: '',
  group: '',
  desc: '',
  mode: 0,
  status: 'active',
  isSelf: false,
  sortOrder: 0,
})
const linkForm = ref(blankLink())

function openCreate() {
  editingId.value = null
  linkForm.value = blankLink()
  linkForm.value.sortOrder = links.value.length
    ? Math.max(...links.value.map((l) => l.sortOrder)) + 1
    : 0
  editorOpen.value = true
}

function openEdit(link) {
  editingId.value = link.id
  linkForm.value = {
    name: link.name || '',
    url: link.url || '',
    avatar: link.avatar || '',
    tag: link.tag || '',
    group: link.group || '',
    desc: link.desc || '',
    mode: link.mode ?? 0,
    status: link.status || 'active',
    isSelf: !!link.isSelf,
    sortOrder: link.sortOrder ?? 0,
  }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingId.value = null
}

async function saveLink() {
  if (!linkForm.value.name.trim() || !linkForm.value.url.trim()) {
    showToast('名称与网址不能为空')
    return
  }
  saving.value = true
  try {
    const payload = {
      ...linkForm.value,
      name: linkForm.value.name.trim(),
      url: linkForm.value.url.trim(),
    }
    if (editingId.value) {
      await api.put(`/admin/friend-links/${editingId.value}`, payload)
      showToast('已保存')
    } else {
      await api.post('/admin/friend-links', payload)
      showToast('已新增')
    }
    closeEditor()
    await loadLinks()
  } catch (e) {
    showToast(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function moveLink(link, direction) {
  try {
    await api.post(`/admin/friend-links/${link.id}/move`, { direction })
    await loadLinks()
  } catch (e) {
    showToast(e?.message || '已经是边界了')
  }
}

// ==================== 删除确认 ====================
const deleteOpen = ref(false)
const deleteTarget = ref(null)

function confirmDelete(link) {
  deleteTarget.value = link
  deleteOpen.value = true
}

async function doDelete() {
  const target = deleteTarget.value
  if (!target) return
  try {
    await api.delete(`/admin/friend-links/${target.id}`)
    showToast('已删除')
    deleteOpen.value = false
    deleteTarget.value = null
    await loadLinks()
    await loadApplications()
  } catch (e) {
    showToast(e?.message || '删除失败')
  }
}

// ==================== 加入申请 ====================
const applications = ref([])
const appStatus = ref('all')

const filteredApps = computed(() =>
  appStatus.value === 'all'
    ? applications.value
    : applications.value.filter((a) => a.status === appStatus.value),
)
const pendingCount = computed(
  () => applications.value.filter((a) => a.status === 'pending').length,
)

async function loadApplications() {
  try {
    const res = await api.get('/admin/friend-applications')
    applications.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('加载申请失败', e)
  }
}

// 通过：先补信息再生成友链
const approveOpen = ref(false)
const approveTarget = ref(null)
const approveForm = ref({ name: '', url: '', group: '', tag: '', desc: '', mode: 0 })
const approving = ref(false)

function openApprove(app) {
  approveTarget.value = app
  approveForm.value = {
    name: app.name,
    url: app.url,
    group: app.type || '其他',
    tag: app.type || '',
    desc: '',
    mode: 0,
  }
  approveOpen.value = true
}

async function doApprove() {
  const app = approveTarget.value
  if (!app) return
  approving.value = true
  try {
    await api.post(`/admin/friend-applications/${app.id}/approve`, {
      name: approveForm.value.name,
      url: approveForm.value.url,
      group: approveForm.value.group,
      tag: approveForm.value.tag,
      desc: approveForm.value.desc,
      mode: Number(approveForm.value.mode),
    })
    showToast('已通过，友链已生成')
    approveOpen.value = false
    approveTarget.value = null
    await Promise.all([loadApplications(), loadLinks()])
    refreshPendingFriends()
  } catch (e) {
    showToast(e?.message || '操作失败')
  } finally {
    approving.value = false
  }
}

async function rejectApp(app) {
  const reason = window.prompt('填写拒绝原因（可留空）', '')
  if (reason === null) return
  try {
    await api.post(`/admin/friend-applications/${app.id}/reject`, { remark: reason })
    showToast('已拒绝')
    await loadApplications()
    refreshPendingFriends()
  } catch (e) {
    showToast(e?.message || '操作失败')
  }
}

const appDeleteOpen = ref(false)
const appDeleteTarget = ref(null)

function confirmDeleteApp(app) {
  appDeleteTarget.value = app
  appDeleteOpen.value = true
}

async function doDeleteApp() {
  const target = appDeleteTarget.value
  if (!target) return
  try {
    await api.delete(`/admin/friend-applications/${target.id}`)
    showToast('已删除申请')
    appDeleteOpen.value = false
    appDeleteTarget.value = null
    await loadApplications()
    refreshPendingFriends()
  } catch (e) {
    showToast(e?.message || '删除失败')
  }
}

onMounted(async () => {
  await Promise.all([loadLinks(), loadApplications()])
})
</script>

<template>
  <div class="friend-manage">
    <transition name="toast-pop">
      <div v-if="toast" class="toast" role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>{{ toast }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-copy">
          <span class="kicker">Friends · 邻居</span>
          <h1>友链管理</h1>
        </div>
        <p class="lede">
          维护前台「邻居」页的友链。访客提交的每一条申请都会先进入「加入申请」，
          <strong>只有通过审核的友链才会展示到前台</strong>。
        </p>
        <p class="hero-note">
          共 {{ links.length }} 条友链 · {{ applications.length }} 条申请 · 待审核 {{ pendingCount }} 条
        </p>
      </div>
    </section>

    <!-- ===== Tabs + 工具条 ===== -->
    <div class="toolbar">
      <div class="filters">
        <button class="filter-btn" :class="{ active: tab === 'links' }" @click="tab = 'links'">友链列表</button>
        <button class="filter-btn" :class="{ active: tab === 'applications' }" @click="tab = 'applications'">
          加入申请
          <span v-if="pendingCount" class="tab-badge">{{ pendingCount }}</span>
        </button>
      </div>

      <div class="toolbar-right">
        <div v-if="tab === 'links'" class="search">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="linkKeyword" type="text" placeholder="搜索名称 / 网址 / 分组" />
        </div>
        <select v-if="tab === 'links'" v-model="linkStatus" class="select">
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="dormant">失联</option>
        </select>
        <select v-else v-model="appStatus" class="select">
          <option value="all">全部申请</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
        <button v-if="tab === 'links'" class="btn btn--primary" @click="openCreate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增友链
        </button>
      </div>
    </div>

    <!-- ===== 友链列表 ===== -->
    <div v-show="tab === 'links'" class="card">
      <div v-if="loading" class="empty-hint"><span class="spinner" aria-hidden="true"></span><span>加载中…</span></div>
      <div v-else-if="!filteredLinks.length" class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span>还没有友链，点右上角「新增友链」</span>
      </div>
      <table v-else class="table">
        <thead>
          <tr>
            <th class="col-sort">排序</th>
            <th>名称</th>
            <th>网址</th>
            <th class="col-sm">分组</th>
            <th class="col-sm">模式</th>
            <th class="col-sm">状态</th>
            <th class="col-act">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="link in filteredLinks" :key="link.id">
            <td class="col-sort">
              <div class="sort-cell">
                <button class="icon-btn" title="上移" @click="moveLink(link, 'up')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <span>{{ link.sortOrder }}</span>
                <button class="icon-btn" title="下移" @click="moveLink(link, 'down')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
            </td>
            <td>
              <div class="name-cell">
                <span class="name-main">{{ link.name }}</span>
                <span v-if="link.isSelf" class="tag tag--self">本站</span>
              </div>
              <div v-if="link.tag" class="cell-sub">{{ link.tag }}</div>
            </td>
            <td><a class="cell-link" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.url }}</a></td>
            <td class="col-sm">{{ link.group || '—' }}</td>
            <td class="col-sm">{{ modeLabel(link.mode) }}</td>
            <td class="col-sm">
              <span class="status" :class="link.status === 'dormant' ? 'status--dormant' : 'status--active'">
                {{ statusLabel(link.status) }}
              </span>
            </td>
            <td class="col-act">
              <button class="btn btn--sm btn--ghost" @click="openEdit(link)">编辑</button>
              <button class="btn btn--sm btn--danger" @click="confirmDelete(link)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 加入申请 ===== -->
    <div v-show="tab === 'applications'" class="apps">
      <div v-if="!filteredApps.length" class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>暂无申请</span>
      </div>
      <article v-for="app in filteredApps" :key="app.id" class="app-card" :class="'app-card--' + app.status">
        <header class="app-head">
          <div class="app-who">
            <span class="app-avatar">
              <img v-if="app.avatar" :src="app.avatar" :alt="''" loading="lazy" />
              <template v-else>{{ (app.name || '?').trim().charAt(0) }}</template>
            </span>
            <div class="app-meta">
              <span class="app-name">{{ app.name }}</span>
              <span class="app-time">{{ fmtTime(app.createdAt) }}</span>
            </div>
          </div>
          <span class="app-status" :class="'app-status--' + (APP_STATUS[app.status]?.cls || 'pending')">
            {{ APP_STATUS[app.status]?.label || app.status }}
          </span>
        </header>

        <dl class="app-grid">
          <div><dt>邮箱</dt><dd>{{ app.email }}</dd></div>
          <div><dt>网址</dt><dd><a :href="app.url" target="_blank" rel="noopener noreferrer">{{ app.url }}</a></dd></div>
          <div><dt>头像</dt><dd>{{ app.avatar || '未填写' }}</dd></div>
          <div><dt>类型</dt><dd>{{ app.type || '—' }}</dd></div>
          <div v-if="app.remark"><dt>备注</dt><dd>{{ app.remark }}</dd></div>
        </dl>

        <p class="app-message">{{ app.message || '（这位朋友没有留言）' }}</p>

        <footer class="app-actions">
          <button v-if="app.status !== 'approved'" class="btn btn--sm btn--primary" @click="openApprove(app)">通过</button>
          <button v-else class="btn btn--sm btn--ghost" disabled>已通过</button>
          <button v-if="app.status !== 'rejected'" class="btn btn--sm btn--ghost" @click="rejectApp(app)">拒绝</button>
          <button class="btn btn--sm btn--danger" @click="confirmDeleteApp(app)">删除</button>
        </footer>
      </article>
    </div>

    <!-- ===== 友链编辑弹窗 ===== -->
    <transition name="fade">
      <div v-if="editorOpen" class="modal-mask" @click.self="closeEditor">
        <div class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-head">
            <h3>{{ editingId ? '编辑友链' : '新增友链' }}</h3>
            <button class="icon-btn" aria-label="关闭" @click="closeEditor">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div class="modal-body">
            <label class="field">
              <span>名称<em>*</em></span>
              <input v-model="linkForm.name" type="text" maxlength="40" placeholder="站点名称" />
            </label>
            <label class="field">
              <span>网址<em>*</em></span>
              <input v-model="linkForm.url" type="text" maxlength="300" placeholder="https://example.com（本站填 /）" />
            </label>
            <label class="field">
              <span>头像地址</span>
              <input v-model="linkForm.avatar" type="text" maxlength="500" placeholder="留空则前台用名称首字兜底" />
            </label>
            <div class="field-row">
              <label class="field">
                <span>分组</span>
                <input v-model="linkForm.group" type="text" maxlength="20" placeholder="技术 / 设计 / 阅读 / 生活" />
              </label>
              <label class="field">
                <span>一句话标签</span>
                <input v-model="linkForm.tag" type="text" maxlength="20" placeholder="如：技术周刊" />
              </label>
            </div>
            <label class="field">
              <span>简介</span>
              <textarea v-model="linkForm.desc" rows="3" maxlength="300" placeholder="展开后展示的介绍"></textarea>
            </label>
            <div class="field-row">
              <label class="field">
                <span>显示模式</span>
                <select v-model.number="linkForm.mode">
                  <option v-for="o in MODE_OPTIONS" :key="o.v" :value="o.v">{{ o.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>状态</span>
                <select v-model="linkForm.status">
                  <option v-for="o in STATUS_OPTIONS" :key="o.v" :value="o.v">{{ o.label }}</option>
                </select>
              </label>
              <label class="field field--narrow">
                <span>排序</span>
                <input v-model.number="linkForm.sortOrder" type="number" min="0" />
              </label>
            </div>
            <label class="check">
              <input v-model="linkForm.isSelf" type="checkbox" />
              <span>这是本站（前台高亮并使用品牌印记）</span>
            </label>
          </div>
          <footer class="modal-foot">
            <button class="btn btn--ghost" @click="closeEditor">取消</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveLink">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <!-- ===== 通过申请弹窗 ===== -->
    <transition name="fade">
      <div v-if="approveOpen" class="modal-mask" @click.self="approveOpen = false">
        <div class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-head">
            <h3>通过申请</h3>
            <button class="icon-btn" aria-label="关闭" @click="approveOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div class="modal-body">
            <p class="modal-tip">通过后会自动生成一条友链并展示在前台「邻居」页。</p>
            <label class="field">
              <span>名称</span>
              <input v-model="approveForm.name" type="text" maxlength="40" />
            </label>
            <label class="field">
              <span>网址</span>
              <input v-model="approveForm.url" type="text" maxlength="300" />
            </label>
            <div class="field-row">
              <label class="field">
                <span>分组</span>
                <input v-model="approveForm.group" type="text" maxlength="20" />
              </label>
              <label class="field">
                <span>一句话标签</span>
                <input v-model="approveForm.tag" type="text" maxlength="20" />
              </label>
            </div>
            <label class="field">
              <span>简介</span>
              <textarea v-model="approveForm.desc" rows="3" maxlength="300" placeholder="可留空，之后在友链列表里编辑"></textarea>
            </label>
            <label class="field">
              <span>显示模式</span>
              <select v-model.number="approveForm.mode">
                <option v-for="o in MODE_OPTIONS" :key="o.v" :value="o.v">{{ o.label }}</option>
              </select>
            </label>
          </div>
          <footer class="modal-foot">
            <button class="btn btn--ghost" @click="approveOpen = false">取消</button>
            <button class="btn btn--primary" :disabled="approving" @click="doApprove">
              {{ approving ? '处理中…' : '通过并生成友链' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <ConfirmDialog
      :open="deleteOpen"
      title="删除友链"
      confirm-label="删除"
      @cancel="deleteOpen = false"
      @confirm="doDelete"
    >
      确定删除友链 <strong>{{ deleteTarget?.name }}</strong> 吗？该操作不可恢复。
    </ConfirmDialog>

    <ConfirmDialog
      :open="appDeleteOpen"
      title="删除申请"
      confirm-label="删除"
      @cancel="appDeleteOpen = false"
      @confirm="doDeleteApp"
    >
      确定删除 <strong>{{ appDeleteTarget?.name }}</strong> 的加入申请吗？
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.friend-manage { position: relative; }

/* ===== Hero（与收信箱一致）===== */
.page-hero {
  position: relative; overflow: hidden;
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
.page-hero h1 {
  font-family: var(--font-serif); font-size: 38px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.lede { font-size: 15px; color: var(--text-secondary); max-width: 680px; margin: 10px 0 0; }
.hero-note {
  font-size: 12.5px; color: var(--text-tertiary); margin: 8px 0 0;
  font-family: var(--font-mono); letter-spacing: 0.02em;
}

/* ===== Toolbar ===== */
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin: 22px 0 16px; flex-wrap: wrap;
}
.toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filters {
  display: inline-flex; gap: 4px; padding: 4px;
  background: var(--bg-soft); border: 1px solid var(--border-light); border-radius: 100px;
}
.filter-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 20px; font-size: 13px; border: none; border-radius: 100px;
  background: transparent; color: var(--text-secondary); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.filter-btn:hover { color: var(--accent); }
.filter-btn.active {
  background: var(--bg-card); color: var(--accent); font-weight: 600;
  box-shadow: var(--shadow-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}
.tab-badge {
  min-width: 18px; height: 18px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: #fff; background: #e03131; border-radius: 999px;
}

.search { position: relative; display: flex; align-items: center; }
.search-icon {
  position: absolute; left: 13px; width: 15px; height: 15px;
  color: var(--text-tertiary); pointer-events: none;
}
.search input {
  width: 240px; padding: 10px 14px 10px 38px;
  font-size: 13.5px; font-family: var(--font-sans);
  border: 1px solid transparent; border-radius: 100px;
  background: var(--bg-soft); color: var(--text-primary); outline: none;
  transition: all var(--transition);
}
.search input:focus {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.select {
  padding: 10px 14px; font-size: 13.5px; font-family: var(--font-sans);
  border: 1px solid var(--border); border-radius: 100px;
  background: var(--bg-soft); color: var(--text-primary); cursor: pointer; outline: none;
}
.select:focus { border-color: var(--accent); }

/* ===== 表格卡片 ===== */
.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); overflow: hidden;
}
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.06em;
  color: var(--text-tertiary); text-transform: uppercase;
  padding: 12px 16px; background: var(--bg-soft); border-bottom: 1px solid var(--border-light);
}
.table td { padding: 13px 16px; border-bottom: 1px solid var(--border-light); font-size: 13.5px; color: var(--text-secondary); vertical-align: middle; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background-color: color-mix(in srgb, var(--accent-light) 35%, transparent); }
.col-sm { width: 92px; }
.col-act { width: 150px; text-align: right; white-space: nowrap; }
.col-sort { width: 108px; }

.sort-cell { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px; }
.name-cell { display: flex; align-items: center; gap: 8px; }
.name-main { font-family: var(--font-serif); font-size: 14.5px; font-weight: 600; color: var(--text-primary); }
.cell-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.cell-link { color: var(--accent); text-decoration: none; word-break: break-all; }
.cell-link:hover { text-decoration: underline; }

.tag {
  font-size: 11px; padding: 1px 8px; border-radius: 999px;
  background: var(--accent-light); color: var(--accent);
}
.status { font-size: 12px; padding: 2px 9px; border-radius: 999px; }
.status--active { background: var(--accent-light); color: var(--accent); }
.status--dormant { background: color-mix(in srgb, var(--text-tertiary) 18%, transparent); color: var(--text-tertiary); }

/* ===== 申请卡片 ===== */
.apps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.app-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
  transition: box-shadow var(--transition), transform var(--transition);
}
.app-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.app-card--pending { border-left: 3px solid #e9a23b; }
.app-card--approved { border-left: 3px solid var(--accent); }
.app-card--rejected { border-left: 3px solid var(--text-tertiary); opacity: 0.85; }

.app-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.app-who { display: flex; align-items: center; gap: 11px; min-width: 0; }
.app-avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  overflow: hidden; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-serif); font-size: 17px; font-weight: 600;
}
.app-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
:global([data-theme='dark']) .app-avatar { color: #0f0f0f; }
.app-meta { display: flex; flex-direction: column; line-height: 1.4; min-width: 0; }
.app-name { font-family: var(--font-serif); font-size: 15px; font-weight: 600; color: var(--text-primary); }
.app-time { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-tertiary); }
.app-status { font-size: 12px; padding: 3px 10px; border-radius: 999px; flex-shrink: 0; }
.app-status--pending { background: color-mix(in srgb, #e9a23b 18%, transparent); color: #b97a1c; }
.app-status--approved { background: var(--accent-light); color: var(--accent); }
.app-status--rejected { background: color-mix(in srgb, var(--text-tertiary) 18%, transparent); color: var(--text-tertiary); }

.app-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 0; }
.app-grid div { min-width: 0; }
.app-grid dt {
  font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;
}
.app-grid dd { margin: 0; font-size: 13.5px; color: var(--text-secondary); word-break: break-all; }
.app-grid a { color: var(--accent); text-decoration: none; }
.app-grid a:hover { text-decoration: underline; }

.app-message {
  font-size: 13.5px; line-height: 1.75; color: var(--text-secondary);
  background: var(--bg-soft); border-radius: 10px; padding: 10px 12px;
  white-space: pre-wrap; word-break: break-word;
}
.app-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ===== 通用元素 ===== */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-sans); font-size: 13.5px; font-weight: 500;
  padding: 9px 16px; border-radius: 10px; cursor: pointer;
  text-decoration: none; border: 1px solid transparent;
  transition: all var(--transition); white-space: nowrap;
}
.btn svg { width: 15px; height: 15px; }
.btn--sm { padding: 6px 12px; font-size: 13px; border-radius: 8px; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn--primary:disabled { opacity: 0.55; cursor: not-allowed; }
:global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--ghost { background: transparent; color: var(--text-secondary); border-color: var(--border); }
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: default; }
.btn--danger { background: transparent; color: #e0533d; border-color: color-mix(in srgb, #e0533d 40%, transparent); }
.btn--danger:hover { background-color: #fdf1ef; border-color: #e0533d; color: #c7442f; }
:global([data-theme='dark']) .btn--danger:hover { background-color: #33211e; }

.icon-btn {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-tertiary); cursor: pointer; transition: all var(--transition);
}
.icon-btn svg { width: 14px; height: 14px; }
.icon-btn:hover { color: var(--accent); border-color: var(--accent); background-color: var(--accent-light); }

.empty-hint {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 56px; color: var(--text-tertiary); font-size: 14px;
}
.empty-hint svg { width: 22px; height: 22px; flex-shrink: 0; }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.modal-card {
  width: 100%; max-width: 560px; max-height: calc(100vh - 48px);
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light);
}
.modal-head h3 { font-family: var(--font-serif); font-size: 17px; font-weight: 700; margin: 0; color: var(--text-primary); }
.modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-tip { font-size: 13px; color: var(--text-tertiary); margin: 0; }
.modal-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--border-light); background: var(--bg-soft);
}

.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.field--narrow { max-width: 110px; }
.field > span { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.field > span em { color: #e0533d; font-style: normal; margin-left: 2px; }
.field input, .field select, .field textarea {
  font-family: var(--font-sans); font-size: 13.5px; color: var(--text-primary);
  background: var(--bg-body); border: 1px solid var(--border);
  border-radius: 10px; padding: 9px 12px; outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
  resize: vertical;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light);
}
.field-row { display: flex; gap: 12px; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--text-secondary); cursor: pointer; }
.check input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }

/* ===== Toast ===== */
.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  background: var(--bg-card); border: 1px solid var(--accent); color: var(--accent);
  font-size: 14px; font-weight: 500; padding: 10px 22px; border-radius: 100px;
  box-shadow: var(--shadow-lg); display: inline-flex; align-items: center; gap: 8px; z-index: 4000;
}
.toast svg { width: 16px; height: 16px; flex-shrink: 0; }
.toast-pop-enter-active, .toast-pop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-pop-enter-from, .toast-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.22s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .apps { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .page-hero { padding: 20px 18px; }
  .page-hero h1 { font-size: 30px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-right { width: 100%; }
  .search { flex: 1; }
  .search input { width: 100%; }
  .table th, .table td { padding: 10px 12px; }
  .col-act { width: auto; }
  .field-row { flex-direction: column; }
}
</style>
