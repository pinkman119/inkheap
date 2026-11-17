<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const PAGE_SIZE = 20
const loading = ref(true)
const sessions = ref({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE })
const page = ref(1)
const keyword = ref('')
const toastMsg = ref('')
const toastType = ref('success')

let searchTimer = null

const totalPages = computed(() =>
  Math.max(1, Math.ceil((sessions.value.total || 0) / PAGE_SIZE)),
)

const isEmpty = computed(() => !loading.value && !sessions.value.items.length)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      pageSize: String(PAGE_SIZE),
    })
    const ip = keyword.value.trim()
    if (ip) params.set('ip', ip)
    const res = await api.get(`/admin/digital-life/sessions?${params}`)
    sessions.value = res && res.items ? res : { items: [], total: 0, page: 1, pageSize: PAGE_SIZE }
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 400)
})

function clearKeyword() {
  keyword.value = ''
  page.value = 1
  load()
}

function goPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  load()
}

// ===== 对话详情抽屉 =====
const drawerOpen = ref(false)
const drawerLoading = ref(false)
const messages = ref([])
const activeSession = ref(null)
const drawerCloseBtn = ref(null)

async function openDrawer(s) {
  activeSession.value = s
  messages.value = []
  drawerOpen.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  drawerCloseBtn.value?.focus()
  drawerLoading.value = true
  try {
    const params = new URLSearchParams({ userId: s.userId })
    if (s.sessionId) params.set('sessionId', s.sessionId)
    const res = await api.get(`/admin/digital-life/sessions/messages?${params}`)
    messages.value = (res && res.items) || []
    await nextTick()
    scrollToBottom()
  } catch (e) {
    showToast('对话加载失败: ' + e.message, 'error')
  } finally {
    drawerLoading.value = false
  }
}

function scrollToBottom() {
  const body = document.querySelector('.sess-drawer .sess-drawer__body')
  if (body) body.scrollTop = body.scrollHeight
}

function closeDrawer() {
  drawerOpen.value = false
  activeSession.value = null
  document.body.style.overflow = ''
}

function onKeydown(e) {
  if (e.key === 'Escape' && drawerOpen.value) closeDrawer()
}

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  load()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="session-manage">
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>会话列表</h2>
        <p class="page-desc">访客与数字生命的全部对话记录（按最近消息倒序，可按 IP 筛选）</p>
      </div>
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="keyword" type="text" placeholder="按 IP 搜索会话" aria-label="按 IP 搜索会话" />
        <button v-if="keyword" class="search-clear" aria-label="清空搜索" @click="clearKeyword">×</button>
      </div>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <section v-else class="panel">
      <div class="panel-summary">共 {{ sessions.total }} 个会话</div>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-msg">首条提问</th>
            <th class="col-ip">IP</th>
            <th class="col-count">消息数</th>
            <th class="col-time">最近消息</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sessions.items" :key="`${s.userId}|${s.sessionId || 'default'}`">
            <td class="cell-msg">{{ s.firstMessage || '（无文字内容）' }}</td>
            <td class="cell-ip">{{ s.ip || '未知' }}</td>
            <td class="cell-count">{{ s.messageCount }}</td>
            <td class="cell-time">{{ fmtTime(s.lastMessageAt) }}</td>
            <td class="cell-ops">
              <button class="link" @click="openDrawer(s)">对话详情</button>
            </td>
          </tr>
          <tr v-if="isEmpty">
            <td colspan="5" class="empty-row">{{ keyword.trim() ? '没有匹配的会话' : '暂无对话' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pager">
        <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </div>
    </section>

    <!-- ===== 对话详情抽屉 ===== -->
    <div class="sess-mask" :class="{ open: drawerOpen }" @click="closeDrawer"></div>
    <aside
      class="sess-drawer"
      :class="{ open: drawerOpen }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sessDrawerTitle"
      :aria-hidden="!drawerOpen"
    >
      <div class="sess-drawer__head">
        <div>
          <div class="sess-drawer__title" id="sessDrawerTitle">对话详情</div>
          <div class="sess-drawer__sub">
            {{ activeSession ? `IP ${activeSession.ip || '未知'} · ${activeSession.messageCount} 条消息` : '' }}
          </div>
        </div>
        <button ref="drawerCloseBtn" class="sess-drawer__close" aria-label="关闭" @click="closeDrawer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sess-drawer__body">
        <div v-if="drawerLoading" class="empty">加载中…</div>
        <template v-else>
          <p v-if="!messages.length" class="empty-row">该会话暂无消息</p>
          <div v-else class="thread">
            <div
              v-for="m in messages"
              :key="m.id"
              class="bubble-row"
              :class="{ mine: m.role === 'user' }"
            >
              <div class="bubble-role">{{ m.role === 'user' ? '访客' : '数字生命' }}</div>
              <div class="bubble">{{ m.content }}</div>
              <div class="bubble-time">{{ fmtTime(m.createdAt) }}</div>
            </div>
          </div>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.session-manage { position: relative; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 4px 0 0; }
.search { position: relative; display: flex; align-items: center; }
.search svg { position: absolute; left: 11px; width: 15px; height: 15px; color: var(--text-tertiary); pointer-events: none; }
.search input { width: 240px; padding: 9px 32px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-primary); font-size: 14px; }
.search input:focus { outline: none; border-color: var(--accent); }
.search-clear { position: absolute; right: 8px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 50%; background: var(--bg-soft); color: var(--text-tertiary); font-size: 14px; line-height: 1; cursor: pointer; }
.empty { padding: 48px; text-align: center; color: var(--text-tertiary); }
.panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; overflow: hidden; }
.panel-summary { padding: 12px 14px 4px; font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); letter-spacing: 0.04em; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: var(--bg-soft); }
.data-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); vertical-align: top; }
.data-table tr:last-child td { border-bottom: none; }
.col-msg { }
.col-ip { width: 160px; }
.col-count { width: 90px; }
.col-time { width: 160px; }
.col-ops { width: 120px; text-align: right; }
.cell-msg { color: var(--text-secondary); font-size: 13px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cell-ip { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); }
.cell-count { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); }
.cell-time { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); }
.cell-ops .link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; padding: 2px 6px; }
.empty-row { text-align: center; color: var(--text-tertiary); padding: 32px; }
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 14px; }
.pager button { padding: 7px 18px; border-radius: 100px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary); transition: all var(--transition); }
.pager button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager span { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); }
.sess-mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); opacity: 0; pointer-events: none; transition: opacity 0.25s; z-index: 900; }
.sess-mask.open { opacity: 1; pointer-events: auto; }
.sess-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(520px, 92vw); background: var(--bg-card); border-left: 1px solid var(--border); box-shadow: var(--shadow-md); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 901; display: flex; flex-direction: column; }
.sess-drawer.open { transform: translateX(0); }
.sess-drawer__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.sess-drawer__title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.sess-drawer__sub { margin-top: 4px; font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); }
.sess-drawer__close { border: none; background: none; color: var(--text-tertiary); cursor: pointer; padding: 2px; }
.sess-drawer__close:hover { color: var(--text-primary); }
.sess-drawer__body { flex: 1; overflow-y: auto; padding: 20px 22px; }
.thread { display: flex; flex-direction: column; gap: 16px; }
.bubble-row { display: flex; flex-direction: column; align-items: flex-start; max-width: 88%; }
.bubble-row.mine { align-items: flex-end; margin-left: auto; }
.bubble-role { font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); letter-spacing: 0.06em; margin-bottom: 4px; }
.bubble { padding: 10px 14px; border-radius: 12px; background: var(--bg-soft); color: var(--text-primary); font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.bubble-row.mine .bubble { background: var(--accent); color: #fff; }
.bubble-time { margin-top: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }
.toast { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px 18px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; color: #fff; box-shadow: var(--shadow-md); }
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
