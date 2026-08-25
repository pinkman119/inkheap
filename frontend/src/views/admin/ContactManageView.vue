<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const messages = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filter = ref('all') // all | unread | read
const keyword = ref('')
const loading = ref(false)

const drawerOpen = ref(false)
const current = ref(null)
const toast = ref('')

const pagedTotal = computed(() => total.value)
const totalPages = computed(() => Math.max(1, Math.ceil(pagedTotal.value / pageSize.value)))

const unreadCount = computed(() => messages.value.filter((m) => !m.read).length)

function showToast(text) {
  toast.value = text
  setTimeout(() => (toast.value = ''), 2000)
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize.value),
      read: filter.value === 'all' ? 'all' : filter.value,
    })
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    const res = await api.get(`/admin/contact?${params.toString()}`)
    messages.value = res.items || []
    total.value = res.total || 0
  } catch (e) {
    console.error('加载来信失败', e)
  } finally {
    loading.value = false
  }
}

function onFilterChange(f) {
  filter.value = f
  page.value = 1
  load()
}

async function onSearch() {
  page.value = 1
  await load()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    load()
  }
}

async function openMessage(msg) {
  current.value = msg
  drawerOpen.value = true
  if (!msg.read) {
    try {
      await api.put(`/admin/contact/${msg.id}/read`, { read: true })
      msg.read = true
    } catch (e) {
      console.error('标记已读失败', e)
    }
  }
}

function closeDrawer() {
  drawerOpen.value = false
  current.value = null
}

async function toggleRead(msg) {
  try {
    await api.put(`/admin/contact/${msg.id}/read`, { read: !msg.read })
    msg.read = !msg.read
    showToast(msg.read ? '已标记为已读' : '已标记为未读')
  } catch (e) {
    console.error('更新状态失败', e)
  }
}

async function removeMessage(msg) {
  if (!confirm(`确定删除「${msg.name}」的来信吗？此操作不可恢复。`)) return
  try {
    await api.delete(`/admin/contact/${msg.id}`)
    showToast('已删除')
    if (current.value?.id === msg.id) closeDrawer()
    await load()
  } catch (e) {
    console.error('删除失败', e)
    showToast('删除失败')
  }
}

function fmtTime(t) {
  const d = new Date(t)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const sameYear = d.getFullYear() === now.getFullYear()
  return sameYear ? `${date.slice(5)} ${time}` : `${date} ${time}`
}

onMounted(load)
</script>

<template>
  <div class="contact-manage">
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
          <span class="kicker">Inbox · 收信</span>
          <h1>收信箱</h1>
        </div>
        <p class="lede">查看并处理「联系我」表单收到的来信。</p>
        <p class="hero-note">共 {{ total }} 封来信 · 当前页未读 {{ unreadCount }} 封 · 点击来信自动标记为已读</p>
      </div>
    </section>

    <!-- ===== 筛选 + 搜索 ===== -->
    <div class="toolbar">
      <div class="filters">
        <button
          v-for="opt in [
            { v: 'all', label: '全部' },
            { v: 'unread', label: '未读' },
            { v: 'read', label: '已读' },
          ]"
          :key="opt.v"
          class="filter-btn"
          :class="{ active: filter === opt.v }"
          @click="onFilterChange(opt.v)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="keyword" type="text" placeholder="搜索称呼 / 邮箱 / 主题 / 内容" @keyup.enter="onSearch" />
        <button class="search-btn" @click="onSearch">搜索</button>
      </div>
    </div>

    <!-- ===== 列表 ===== -->
    <div class="inbox">
      <div v-if="loading" class="empty-hint">
        <span class="spinner" aria-hidden="true"></span>
        <span>加载中…</span>
      </div>
      <div v-else-if="!messages.length" class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <span>暂无来信</span>
      </div>
      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="mail-item"
          :class="{ unread: !msg.read, active: current?.id === msg.id }"
          @click="openMessage(msg)"
        >
          <div class="mail-avatar">{{ (msg.name || '?')[0] }}</div>
          <div class="mail-body">
            <div class="mail-row">
              <span class="mail-name">{{ msg.name }}</span>
              <span class="mail-time">{{ fmtTime(msg.createdAt) }}</span>
            </div>
            <div class="mail-subject">{{ msg.subject || '（无主题）' }}</div>
            <div class="mail-preview">{{ msg.message }}</div>
          </div>
          <span v-if="!msg.read" class="unread-dot" title="未读" />
        </div>
      </template>
    </div>

    <!-- ===== 分页 ===== -->
    <div v-if="pagedTotal > pageSize" class="pager">
      <button class="page-btn" :disabled="page <= 1" @click="prevPage">上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}（共 {{ total }} 封）</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="nextPage">下一页</button>
    </div>

    <!-- ===== 抽屉 ===== -->
    <transition name="drawer">
      <div v-if="drawerOpen" class="drawer-mask" @click.self="closeDrawer">
        <aside class="drawer" v-if="current">
          <header class="drawer-head">
            <div class="drawer-title">
              <span class="mail-avatar lg">{{ (current.name || '?')[0] }}</span>
              <div>
                <div class="drawer-name">{{ current.name }}</div>
                <div class="drawer-sub">{{ current.subject || '（无主题）' }}</div>
              </div>
            </div>
            <button class="drawer-close" title="关闭" @click="closeDrawer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div class="drawer-meta">
            <div v-if="current.email"><span>邮箱</span>{{ current.email }}</div>
            <div v-if="current.phone"><span>电话</span>{{ current.phone }}</div>
            <div><span>时间</span>{{ new Date(current.createdAt).toLocaleString('zh-CN') }}</div>
            <div><span>状态</span>{{ current.read ? '已读' : '未读' }}</div>
          </div>

          <div class="drawer-content">{{ current.message }}</div>

          <footer class="drawer-actions">
            <button class="btn btn--ghost" @click="toggleRead(current)">
              {{ current.read ? '标为未读' : '标为已读' }}
            </button>
            <button class="btn btn--danger" @click="removeMessage(current)">删除</button>
          </footer>
        </aside>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.contact-manage { position: relative; }

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 22px 0 16px;
  flex-wrap: wrap;
}
.filters {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border-light);
  border-radius: 100px;
}
.filter-btn {
  padding: 7px 20px;
  font-size: 13px;
  border: none;
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.filter-btn:hover { color: var(--accent); }
.filter-btn.active {
  background: var(--bg-card);
  color: var(--accent);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 13px;
  width: 15px; height: 15px;
  color: var(--text-tertiary);
  pointer-events: none;
}
.search input {
  width: 300px;
  padding: 10px 14px 10px 38px;
  font-size: 13.5px;
  font-family: var(--font-sans);
  border: 1px solid transparent;
  border-radius: 100px;
  background: var(--bg-soft);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition);
}
.search input::placeholder { color: var(--text-tertiary); }
.search input:hover { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.search input:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.search-btn {
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 500;
  border: none;
  background: var(--accent);
  color: #fff;
  border-radius: 100px;
  cursor: pointer;
  transition: all var(--transition);
}
.search-btn:hover { background-color: var(--accent-hover); transform: translateY(-1px); }
:global([data-theme='dark']) .search-btn { color: #0f0f0f; }

/* ===== Inbox list ===== */
.inbox {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.mail-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 17px 22px;
  cursor: pointer;
  position: relative;
  transition: background-color var(--transition);
}
.mail-item + .mail-item { border-top: 1px solid var(--border-light); }
.mail-item:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.mail-item.unread { background-color: var(--accent-light); }
.mail-item.unread:hover { background-color: color-mix(in srgb, var(--accent-light) 75%, transparent); }
.mail-item.active {
  background-color: color-mix(in srgb, var(--accent-light) 60%, transparent);
  box-shadow: inset 3px 0 0 var(--accent);
}

.mail-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
}
:global([data-theme='dark']) .mail-avatar { color: #0f0f0f; }
.mail-avatar.lg { width: 48px; height: 48px; font-size: 20px; }

.mail-body { flex: 1; min-width: 0; padding-right: 20px; }
.mail-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.mail-name {
  font-family: var(--font-serif);
  font-size: 14.5px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.01em;
}
.mail-time {
  font-family: var(--font-mono);
  font-size: 12px; color: var(--text-tertiary);
  flex-shrink: 0;
}
.mail-subject {
  font-size: 13.5px; color: var(--text-secondary);
  margin: 4px 0 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mail-preview {
  font-size: 13px; color: var(--text-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.unread-dot {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}

/* ===== Empty / Loading ===== */
.empty-hint {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 56px;
  color: var(--text-tertiary); font-size: 14px;
}
.empty-hint svg { width: 22px; height: 22px; flex-shrink: 0; }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Pager ===== */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}
.page-btn {
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  transition: all var(--transition);
}
.page-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); background-color: var(--accent-light); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 12.5px; color: var(--text-tertiary); font-family: var(--font-mono); }

/* ===== Drawer ===== */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: flex-end;
  z-index: 1000;
}
.drawer {
  width: 460px;
  max-width: 92vw;
  height: 100%;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-light);
}
.drawer-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
.drawer-name {
  font-family: var(--font-serif);
  font-size: 16.5px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em;
}
.drawer-sub {
  font-size: 13px; color: var(--text-tertiary);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition);
}
.drawer-close:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}

.drawer-meta {
  padding: 16px 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13.5px;
  color: var(--text-secondary);
  background: var(--bg-soft);
}
.drawer-meta div { display: flex; flex-direction: column; gap: 3px; min-width: 0; word-break: break-all; }
.drawer-meta span {
  font-family: var(--font-mono);
  font-size: 11px; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.08em;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 22px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.drawer-actions {
  display: flex;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-soft);
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 13.5px; font-weight: 500;
  padding: 9px 16px; border-radius: 10px; cursor: pointer;
  text-decoration: none; border: 1px solid transparent;
  transition: all var(--transition); white-space: nowrap;
}
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border);
}
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--danger {
  background: transparent; color: #e0533d;
  border-color: color-mix(in srgb, #e0533d 40%, transparent);
}
.btn--danger:hover {
  background-color: #fdf1ef;
  border-color: #e0533d;
  color: #c7442f;
}
:global([data-theme='dark']) .btn--danger:hover { background-color: #33211e; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s; }
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(100%); }

/* ===== Toast ===== */
.toast {
  position: fixed;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 22px;
  border-radius: 100px;
  box-shadow: var(--shadow-lg);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 4000;
}
.toast svg { width: 16px; height: 16px; flex-shrink: 0; }
.toast-pop-enter-active, .toast-pop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-pop-enter-from, .toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .page-hero { padding: 20px 18px 20px; }
  .page-hero h1 { font-size: 30px; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .search { width: 100%; }
  .search input { width: 100%; flex: 1; }
  .mail-item { padding: 14px 16px; }
  .drawer-meta { grid-template-columns: 1fr; }
}
</style>
