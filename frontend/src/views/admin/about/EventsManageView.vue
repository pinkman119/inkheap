<script setup>
import { onMounted, ref, computed } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const loading = ref(true)
const actionLoading = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

/* 年份筛选（按年管理，Q4=A） */
const now = new Date()
const CURRENT_YEAR = 2026
const yearValue = ref(CURRENT_YEAR)
const yearOptions = computed(() => {
  const years = new Set([CURRENT_YEAR, now.getFullYear()])
  events.value.forEach((ev) => {
    const y = String(ev.date || '').slice(0, 4)
    if (y) years.add(Number(y))
  })
  return Array.from(years).sort((a, b) => b - a)
})

/* 事件列表 */
const events = ref([])
const editing = ref(null) // { id?, title, date(YYYY-MM-DD), desc, isRing }
const editorOpen = ref(false)
const saving = ref(false)

async function loadEvents() {
  loading.value = true
  try {
    const list = await api.get('/admin/about/events')
    events.value = list
  } catch (e) {
    showToast('加载事件失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

/* 当前筛选年份的事件，按日期倒序 */
const filteredEvents = computed(() => {
  const pre = String(yearValue.value)
  return events.value
    .filter((e) => String(e.date).startsWith(pre))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
})

const ringCount = computed(() => events.value.filter((e) => e.isRing).length)

function openCreate() {
  editing.value = { id: null, title: '', date: `${yearValue.value}-01-01`, desc: '', isRing: false }
  editorOpen.value = true
}

function openEdit(ev) {
  editing.value = {
    id: ev.id,
    title: ev.title,
    date: String(ev.date || '').slice(0, 10),
    desc: ev.desc || '',
    isRing: !!ev.isRing,
  }
  editorOpen.value = true
}

function closeEditor() {
  if (saving.value) return
  editorOpen.value = false
  editing.value = null
}

async function saveEvent() {
  if (!editing.value) return
  if (saving.value) return
  const e = editing.value
  if (!e.title.trim()) { showToast('请填写标题', 'error'); return }
  if (!e.date) { showToast('请选择日期', 'error'); return }
  saving.value = true
  try {
    const payload = {
      title: e.title.trim(),
      date: e.date,
      desc: e.desc.trim(),
      isRing: !!e.isRing,
    }
    if (e.id) {
      await api.put(`/admin/about/events/${e.id}`, payload)
    } else {
      await api.post('/admin/about/events', payload)
    }
    editorOpen.value = false
    editing.value = null
    showToast('事件已保存', 'success')
    await loadEvents()
  } catch (err) {
    showToast('保存失败: ' + err.message, 'error')
  } finally {
    saving.value = false
  }
}

/* 设为年轮：即时切换（Q9=A） */
async function toggleRing(ev) {
  if (actionLoading.value) return
  actionLoading.value = true
  const next = !ev.isRing
  try {
    await api.patch(`/admin/about/events/${ev.id}/ring`, { isRing: next })
    ev.isRing = next
    showToast(next ? '已设为年轮' : '已取消年轮', 'success')
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
  } finally {
    actionLoading.value = false
  }
}

/* 删除确认弹窗卡片（替换 alert/confirm） */
const confirmOpen = ref(false)
const pendingDelete = ref(null)
const deleting = ref(false)

function askDelete(ev) {
  pendingDelete.value = ev
  confirmOpen.value = true
}
function cancelDelete() {
  confirmOpen.value = false
  pendingDelete.value = null
}
async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  const id = pendingDelete.value.id
  try {
    await api.delete(`/admin/about/events/${id}`)
    showToast('事件已删除', 'success')
    confirmOpen.value = false
    pendingDelete.value = null
    await loadEvents()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
    confirmOpen.value = false
    pendingDelete.value = null
  } finally {
    deleting.value = false
  }
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(async () => {
  await loadEvents()
})
</script>

<template>
  <div class="events-manage">
    <transition name="toast-pop">
      <div v-if="toastMsg" class="toast" :class="toastType" role="status" aria-live="polite">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">About · 事件 / 年轮</span>
            <h1>事件日历 · 年轮</h1>
          </div>
          <div class="hero-side">
            <select v-model.number="yearValue" class="filter-select">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select>
            <button class="btn btn--primary" type="button" @click="openCreate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增事件
            </button>
          </div>
        </div>
        <p class="lede">按年份维护「关于我」里的大事件与年轮。把值得记住的日子设为年轮，它会沉淀到前台年轮时间线。</p>
        <p class="hero-note">共 {{ events.length }} 条事件 · 年轮 {{ ringCount }} 条 · 当前 {{ yearValue }} 年 {{ filteredEvents.length }} 条</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== Empty ===== -->
    <div v-else-if="!filteredEvents.length" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>{{ yearValue }} 年暂无事件，点击「新增事件」开始记录。</span>
    </div>

    <!-- ===== List ===== -->
    <div v-else class="events-wrap">
      <div v-for="ev in filteredEvents" :key="ev.id" class="event-card" :class="{ 'is-ring': ev.isRing }">
        <div class="event-main">
          <div class="event-head">
            <span class="event-date">{{ ev.date }}</span>
            <span v-if="ev.isRing" class="ring-chip">◆ 年轮</span>
          </div>
          <h3 class="event-title">{{ ev.title }}</h3>
          <p v-if="ev.desc" class="event-desc">{{ ev.desc }}</p>
        </div>
        <div class="event-actions">
          <button
            class="mini-btn ring-toggle"
            :class="{ active: ev.isRing }"
            :disabled="actionLoading"
            @click="toggleRing(ev)"
          >
            {{ ev.isRing ? '★ 取消年轮' : '☆ 设为年轮' }}
          </button>
          <button class="mini-btn" :disabled="actionLoading" @click="openEdit(ev)">编辑</button>
          <button class="mini-btn danger" :disabled="actionLoading" @click="askDelete(ev)">删除</button>
        </div>
      </div>
    </div>

    <!-- ===== 编辑弹窗 ===== -->
    <transition name="modal-fade">
      <div v-if="editorOpen && editing" class="modal-mask" @click.self="closeEditor">
        <div class="editor-modal" role="dialog" aria-modal="true" aria-label="编辑事件">
          <div class="modal-head">
            <span class="modal-title">{{ editing.id ? '编辑事件' : '新增事件' }}</span>
            <button class="modal-close" title="关闭" :disabled="saving" @click="closeEditor">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label class="field-label" for="evTitle">标题</label>
              <input id="evTitle" v-model="editing.title" class="form-input" type="text" maxlength="120" placeholder="如：第一次 solo 露营" />
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label" for="evDate">日期</label>
                <input id="evDate" v-model="editing.date" class="form-input" type="date" />
              </div>
              <div class="form-field ring-field">
                <label class="field-label" for="evRing">设为年轮</label>
                <label class="switch">
                  <input id="evRing" v-model="editing.isRing" type="checkbox" />
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
            <div class="form-field">
              <label class="field-label" for="evDesc">描述（可选）</label>
              <textarea id="evDesc" v-model="editing.desc" class="form-input form-textarea" rows="3" maxlength="500" placeholder="补充说明…"></textarea>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn--ghost" :disabled="saving" @click="closeEditor">取消</button>
            <button class="btn btn--primary" :disabled="saving" @click="saveEvent">
              {{ saving ? '保存中…' : '保存事件' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== 删除确认弹窗卡片 ===== -->
    <div v-if="confirmOpen" class="modal-mask" @click.self="cancelDelete">
      <div class="confirm-card" role="dialog" aria-modal="true" aria-label="删除确认">
        <div class="confirm-icon">!</div>
        <h3>删除事件</h3>
        <p class="confirm-text">
          确定要删除
          <strong v-if="pendingDelete">{{ pendingDelete.date }} · {{ pendingDelete.title }}</strong>
          吗？此操作不可撤销。
        </p>
        <div class="confirm-actions">
          <button class="btn btn--ghost" :disabled="deleting" @click="cancelDelete">取消</button>
          <button class="btn btn--danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? '删除中…' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.events-manage { position: relative; }

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

/* 筛选下拉 */
.filter-select {
  font-family: var(--font-sans); font-size: 13.5px; color: var(--text-primary);
  background-color: var(--bg-card); border: 1px solid var(--border);
  border-radius: 10px; padding: 9px 34px 9px 14px; cursor: pointer; outline: none;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.filter-select:hover { border-color: var(--accent); }
.filter-select:focus {
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
.btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover); border-color: var(--accent-hover);
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
:global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--danger {
  background-color: #e0533d; color: #fff; border-color: #e0533d;
  padding: 8px 14px; font-size: 13px;
}
.btn--danger:hover:not(:disabled) { background-color: #c9442f; border-color: #c9442f; }
.btn--danger:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== mini-btn ===== */
.mini-btn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.mini-btn:hover:not(:disabled) {
  color: var(--accent); border-color: var(--accent);
  background-color: var(--accent-light);
}
.mini-btn.danger:hover:not(:disabled) {
  color: #e0533d; border-color: #e0533d; background-color: #fdf1ef;
}
:global([data-theme='dark']) .mini-btn.danger:hover:not(:disabled) { background-color: #33211e; }
.mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.mini-btn.ring-toggle.active {
  color: #e6a23c; border-color: #e6a23c; background-color: #fdf6e9;
}
:global([data-theme='dark']) .mini-btn.ring-toggle.active { background-color: #2e2718; }

/* ===== Loading / Empty ===== */
.empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.empty svg { width: 22px; height: 22px; flex-shrink: 0; }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Events list ===== */
.events-wrap { margin: 22px 0 8px; display: flex; flex-direction: column; gap: 12px; }
.event-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  transition: all var(--transition);
}
.event-card:hover {
  border-color: var(--accent);
  transform: translateX(2px);
  box-shadow: var(--shadow-sm);
}
.event-card.is-ring {
  border-left: 3px solid #e6a23c;
}
.event-main { flex: 1; min-width: 0; }
.event-head {
  display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
}
.event-date {
  font-family: var(--font-mono); font-size: 13px; font-weight: 600;
  color: var(--text-secondary);
}
.ring-chip {
  font-size: 11px; font-weight: 600;
  padding: 2px 10px;
  border-radius: 100px;
  color: #e6a23c; background-color: #fdf6e9;
  white-space: nowrap;
}
:global([data-theme='dark']) .ring-chip { background-color: #2e2718; }
.event-title {
  font-family: var(--font-serif); font-size: 16.5px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  margin: 0 0 6px;
}
.event-desc {
  font-size: 13.5px; line-height: 1.65; color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.event-actions {
  display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end;
}

/* ===== 编辑弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.editor-modal {
  width: 100%;
  max-width: 520px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}
.modal-title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  padding-left: 14px;
  position: relative;
}
.modal-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  border-radius: 4px;
  background-color: var(--accent);
}
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition);
}
.modal-close:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}
.modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-soft);
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .editor-modal { transition: transform 0.2s ease; }
.modal-fade-enter-from .editor-modal { transform: translateY(-12px) scale(0.98); }

/* form */
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-input {
  display: block; width: 100%;
  font-family: var(--font-sans); font-size: 14px; color: var(--text-primary);
  background-color: var(--bg-soft); border: 1px solid transparent;
  border-radius: var(--radius-sm); padding: 11px 13px;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
  outline: none;
}
.form-input::placeholder { color: var(--text-tertiary); }
.form-input:hover { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.form-input:focus {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.form-textarea { font-size: 13.5px; line-height: 1.7; resize: vertical; }
.ring-field { gap: 10px; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider {
  position: absolute; cursor: pointer; inset: 0;
  background-color: var(--border); border-radius: 100px;
  transition: background-color var(--transition);
}
.switch-slider::before {
  content: ''; position: absolute; height: 18px; width: 18px;
  left: 3px; top: 3px; background: #fff; border-radius: 50%;
  transition: transform var(--transition);
}
.switch input:checked + .switch-slider { background-color: #e6a23c; }
.switch input:checked + .switch-slider::before { transform: translateX(20px); }

/* ===== 删除确认卡片 ===== */
.confirm-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 26px 24px;
  text-align: center;
}
.confirm-icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: #fdf1ef; color: #e0533d;
  font-size: 24px; font-weight: 700; line-height: 44px;
  margin: 0 auto 12px;
}
.confirm-card h3 { margin: 0 0 10px; font-size: 18px; }
.confirm-text { color: var(--text-secondary); font-size: 14px; margin: 0 0 18px; line-height: 1.6; }
.confirm-text strong { color: var(--text-primary); }
.confirm-actions { display: flex; justify-content: center; gap: 10px; }

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
  max-width: min(480px, 90vw);
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
@media (max-width: 768px) {
  .page-hero { padding: 20px 18px 20px; }
  .page-hero h1 { font-size: 30px; }
  .hero-side { width: 100%; }
  .event-card { flex-direction: column; }
  .event-actions { justify-content: flex-start; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
