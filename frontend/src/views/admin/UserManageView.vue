<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import { useAdminAuth } from '@/composables/useAdminAuth'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()
const { user: currentUser } = useAdminAuth()

const loading = ref(true)
const list = ref([])
const toastMsg = ref('')
const toastType = ref('success')

// 弹窗类型：'create' | 'password' | 'remark' | null
const modal = ref(null)
const editing = ref(null)
const saving = ref(false)

// 失效确认弹窗卡片（样式与事件日历删除确认一致）
const confirmOpen = ref(false)
const pendingRow = ref(null)
const confirming = ref(false)

const createForm = ref({ username: '', password: '', remark: '' })
const passwordForm = ref({ oldPassword: '', newPassword: '' })
const remarkForm = ref({ remark: '' })

const currentId = computed(() => currentUser.value?.id)
const isSelf = (row) => row.id === currentId.value

const activeCount = computed(() => list.value.filter((r) => r.status === 'active').length)
const disabledCount = computed(() => list.value.length - activeCount.value)

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

async function load() {
  loading.value = true
  try {
    list.value = await api.get('/admin/users')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

// ===== 新增管理员 =====
function openCreate() {
  createForm.value = { username: '', password: '', remark: '' }
  modal.value = 'create'
}

async function submitCreate() {
  if (saving.value) return
  const username = createForm.value.username.trim()
  const password = createForm.value.password
  if (!username || !password) {
    showToast('用户名和密码不能为空', 'error')
    return
  }
  if (password.length < 6) {
    showToast('密码至少 6 位', 'error')
    return
  }
  saving.value = true
  try {
    await api.post('/admin/users', {
      username,
      password,
      remark: createForm.value.remark.trim() || undefined,
    })
    showToast('管理员已创建', 'success')
    modal.value = null
    await load()
  } catch (e) {
    showToast('创建失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ===== 修改密码 =====
function openPassword(row) {
  editing.value = row
  passwordForm.value = { oldPassword: '', newPassword: '' }
  modal.value = 'password'
}

async function submitPassword() {
  if (saving.value) return
  const self = isSelf(editing.value)
  if (self && !passwordForm.value.oldPassword) {
    showToast('修改自己的密码需先填写原密码', 'error')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    showToast('新密码至少 6 位', 'error')
    return
  }
  saving.value = true
  try {
    await api.patch(`/admin/users/${editing.value.id}/password`, {
      newPassword: passwordForm.value.newPassword,
      ...(self ? { oldPassword: passwordForm.value.oldPassword } : {}),
    })
    showToast('密码已修改', 'success')
    modal.value = null
  } catch (e) {
    showToast('修改失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ===== 修改备注 =====
function openRemark(row) {
  editing.value = row
  remarkForm.value = { remark: row.remark || '' }
  modal.value = 'remark'
}

async function submitRemark() {
  if (saving.value) return
  saving.value = true
  try {
    await api.patch(`/admin/users/${editing.value.id}/remark`, {
      remark: remarkForm.value.remark.trim() || null,
    })
    showToast('备注已更新', 'success')
    modal.value = null
    await load()
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ===== 失效 / 启用 =====
// 失效走确认弹窗卡片（与事件日历删除确认一致）；启用即时执行，不打扰
function toggleStatus(row) {
  if (isSelf(row)) return
  if (row.status === 'active') {
    pendingRow.value = row
    confirmOpen.value = true
    return
  }
  enableUser(row)
}

async function enableUser(row) {
  if (confirming.value) return
  confirming.value = true
  try {
    await api.patch(`/admin/users/${row.id}/status`, { status: 'active' })
    showToast('已启用', 'success')
    await load()
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
  } finally {
    confirming.value = false
  }
}

// ===== 失效确认弹窗卡片 =====
function cancelToggle() {
  if (confirming.value) return
  confirmOpen.value = false
  pendingRow.value = null
}

async function confirmToggle() {
  if (!pendingRow.value || confirming.value) return
  confirming.value = true
  const row = pendingRow.value
  try {
    await api.patch(`/admin/users/${row.id}/status`, { status: 'disabled' })
    showToast('已设为失效', 'success')
    confirmOpen.value = false
    pendingRow.value = null
    await load()
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
    confirmOpen.value = false
    pendingRow.value = null
  } finally {
    confirming.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="user-manage">
    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">System · 系统用户</span>
            <h1>系统用户</h1>
          </div>
          <div class="hero-side">
            <button class="btn btn--primary" type="button" @click="openCreate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增管理员
            </button>
          </div>
        </div>
        <p class="lede">管理系统管理员账号：新增、改密码、改备注、失效与启用。不能对自己执行失效操作。</p>
        <p class="hero-note">共 {{ list.length }} 个账号 · 正常 {{ activeCount }} · 已失效 {{ disabledCount }}</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== List ===== -->
    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-username">用户名</th>
            <th class="col-remark">备注</th>
            <th class="col-status">状态</th>
            <th class="col-time">最后登录</th>
            <th class="col-time">创建时间</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in list" :key="row.id" :class="{ 'is-disabled': row.status !== 'active' }">
            <td class="cell-username">
              <span class="uname">{{ row.username }}</span>
              <span v-if="isSelf(row)" class="self-tag">我</span>
            </td>
            <td class="cell-remark">{{ row.remark || '—' }}</td>
            <td class="cell-status">
              <span class="badge" :class="row.status === 'active' ? 'badge--ok' : 'badge--muted'">
                {{ row.status === 'active' ? '正常' : '已失效' }}
              </span>
            </td>
            <td class="cell-time">{{ row.lastLoginAt ? formatTime(row.lastLoginAt) : '从未登录' }}</td>
            <td class="cell-time">{{ formatTime(row.createdAt) }}</td>
            <td class="cell-ops">
              <button class="link" @click="openPassword(row)">改密码</button>
              <button class="link" @click="openRemark(row)">改备注</button>
              <button
                class="link"
                :class="row.status === 'active' ? 'link--danger' : 'link--ok'"
                :disabled="isSelf(row)"
                :title="isSelf(row) ? '不能对自己执行此操作' : ''"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'active' ? '失效' : '启用' }}
              </button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="6" class="empty-row">
              <div class="empty empty--block">
                <div class="empty__illus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p class="empty__title">暂无管理员账号</p>
                <p class="empty__sub">点击「新增管理员」创建第一个后台账号</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <transition name="modal-fade">
      <div v-if="modal" class="modal-mask" @click.self="modal = null">
        <div class="editor-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <span class="modal-title">
              {{ modal === 'create' ? '新增管理员' : modal === 'password' ? `修改密码 · ${editing.username}` : `修改备注 · ${editing.username}` }}
            </span>
            <button class="modal-close" type="button" title="关闭" @click="modal = null">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- 新增 -->
            <template v-if="modal === 'create'">
              <div class="form-field">
                <label class="field-label" for="uUsername">用户名</label>
                <input id="uUsername" v-model="createForm.username" class="form-input" type="text" maxlength="32" placeholder="字母、数字、下划线或中划线，至少 3 位" />
              </div>
              <div class="form-field">
                <label class="field-label" for="uPassword">密码</label>
                <input id="uPassword" v-model="createForm.password" class="form-input" type="password" maxlength="64" placeholder="至少 6 位" />
              </div>
              <div class="form-field">
                <label class="field-label" for="uRemark">备注（选填）</label>
                <input id="uRemark" v-model="createForm.remark" class="form-input" type="text" maxlength="200" placeholder="如：内容编辑小明" />
              </div>
            </template>

            <!-- 改密码 -->
            <template v-else-if="modal === 'password'">
              <div v-if="isSelf(editing)" class="form-field">
                <label class="field-label" for="uOldPwd">原密码</label>
                <input id="uOldPwd" v-model="passwordForm.oldPassword" class="form-input" type="password" placeholder="请输入当前密码" />
              </div>
              <div v-else class="notice">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                你正在修改他人密码，无需原密码
              </div>
              <div class="form-field">
                <label class="field-label" for="uNewPwd">新密码</label>
                <input id="uNewPwd" v-model="passwordForm.newPassword" class="form-input" type="password" maxlength="64" placeholder="至少 6 位" />
              </div>
            </template>

            <!-- 改备注 -->
            <template v-else>
              <div class="form-field">
                <label class="field-label" for="uRemarkEdit">备注（留空表示清除）</label>
                <textarea id="uRemarkEdit" v-model="remarkForm.remark" class="form-input form-textarea" rows="3" maxlength="200" placeholder="仅作列表展示说明，不影响权限"></textarea>
              </div>
            </template>
          </div>

          <div class="modal-foot">
            <button class="btn btn--ghost" type="button" :disabled="saving" @click="modal = null">取消</button>
            <button
              class="btn btn--primary"
              type="button"
              :disabled="saving"
              @click="modal === 'create' ? submitCreate() : modal === 'password' ? submitPassword() : submitRemark()"
            >
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== 失效确认弹窗（共用 ConfirmDialog） ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="设为失效"
      confirm-label="设为失效"
      :loading="confirming"
      warn="失效后该账号将无法登录后台，正在进行的操作会立即被拦截。可随时重新启用。"
      @cancel="cancelToggle"
      @confirm="confirmToggle"
    >
      确定要将管理员 <strong>{{ pendingRow?.username }}</strong> 设为失效吗？
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

<style scoped>
.user-manage { position: relative; }

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
.hero-side { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

/* ===== Buttons ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; transition: all var(--transition); white-space: nowrap;
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

/* ===== Loading / Empty ===== */
.empty {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.empty--block { flex-direction: column; }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty__illus {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--bg-soft); display: grid; place-items: center;
  margin-bottom: 14px; color: var(--text-tertiary);
}
.empty__illus svg { width: 28px; height: 28px; }
.empty__title {
  font-family: var(--font-serif); font-size: 15.5px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.empty__sub { margin: 6px 0 0; font-size: 13px; color: var(--text-tertiary); }

/* ===== Table ===== */
.panel {
  margin: 22px 0 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th {
  padding: 12px 16px; text-align: left;
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary);
  border-bottom: 1px solid var(--border); background: var(--bg-soft); white-space: nowrap;
}
.data-table td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary); vertical-align: middle;
}
.data-table tbody tr { transition: background-color var(--transition); }
.data-table tbody tr:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.data-table tr:last-child td { border-bottom: none; }
.col-username { width: 200px; }
.col-status { width: 100px; }
.col-time { width: 150px; }
.col-ops { width: 200px; text-align: right; }
.data-table tr.is-disabled td { opacity: 0.55; }
.cell-username { font-weight: 600; }
.uname { font-family: var(--font-mono); }
.self-tag {
  margin-left: 8px; padding: 1px 8px; border-radius: 100px;
  background: var(--accent-light); color: var(--accent);
  font-size: 11px; font-weight: 700;
}
.cell-remark { color: var(--text-secondary); font-size: 13.5px; }
.cell-status { white-space: nowrap; }
.cell-time {
  color: var(--text-tertiary); font-size: 12px;
  font-family: var(--font-mono); white-space: nowrap;
}
.badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 11px;
  border-radius: 100px; font-size: 12px; font-weight: 600; white-space: nowrap;
}
.badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.badge--ok { background: var(--accent-light); color: var(--accent); }
.badge--muted { background: var(--bg-soft); color: var(--text-tertiary); }
.cell-ops { text-align: right; white-space: nowrap; }
.cell-ops .link {
  background: none; border: none; color: var(--accent); cursor: pointer;
  font-size: 13px; font-weight: 500; padding: 2px 6px;
  transition: color var(--transition);
}
.cell-ops .link:hover:not(:disabled) { text-decoration: underline; }
.cell-ops .link:disabled { color: var(--text-tertiary); cursor: not-allowed; text-decoration: none; opacity: 0.5; }
.link--danger { color: #e0533d; }
.link--ok { color: var(--accent); }
.empty-row { padding: 0; }

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);
  z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.editor-modal {
  width: 100%; max-width: 520px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light);
}
.modal-title {
  font-family: var(--font-serif); font-size: 16px; font-weight: 600;
  letter-spacing: 0.02em; color: var(--text-primary);
  padding-left: 14px; position: relative;
}
.modal-title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 16px; border-radius: 4px; background-color: var(--accent);
}
.modal-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  border: 1px solid var(--border); border-radius: 50%;
  background: transparent; color: var(--text-tertiary);
  cursor: pointer; transition: all var(--transition);
}
.modal-close:hover:not(:disabled) {
  color: var(--accent); border-color: var(--accent); background-color: var(--accent-light);
}
.modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-body {
  padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
}
.modal-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--border-light); background: var(--bg-soft);
}
.notice {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 13px; border-radius: var(--radius-sm);
  background: var(--bg-soft); color: var(--text-tertiary); font-size: 13px;
}
.notice svg { width: 15px; height: 15px; flex-shrink: 0; }

/* form */
.form-field { display: flex; flex-direction: column; gap: 6px; }
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

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .editor-modal { transition: transform 0.2s ease; }
.modal-fade-enter-from .editor-modal { transform: translateY(-12px) scale(0.98); }

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
@media (max-width: 768px) {
  .page-hero { padding: 20px 18px 20px; }
  .page-hero h1 { font-size: 30px; }
  .hero-side { width: 100%; }
  .data-table { font-size: 13px; }
  .data-table th, .data-table td { padding: 10px 10px; }
  .col-username { width: auto; }
  .col-ops { width: auto; }
}
</style>
