<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()
const loading = ref(true)
const list = ref([])
const toastMsg = ref('')
const toastType = ref('success')

const modalOpen = ref(false)
const editing = ref(null)
const form = ref({ province: '', place: '', time: '', location: '', elevation: '', note: '', sortOrder: 0 })
const saving = ref(false)

// 删除确认弹窗卡片（替换原生 confirm，与事件日历一致）
const confirmOpen = ref(false)
const pendingDelete = ref(null)
const deleting = ref(false)

// 树形聚合：省份作为父节点，该省下的足迹作为子节点
const tree = computed(() => {
  const map = new Map()
  for (const item of list.value) {
    if (!map.has(item.province)) map.set(item.province, [])
    map.get(item.province).push(item)
  }
  return [...map.entries()].map(([province, children]) => ({ province, children }))
})

// 折叠状态：记录被收起的省份，默认全部展开
const collapsed = ref(new Set())
const allExpanded = computed(() => collapsed.value.size === 0)
const expandedCount = computed(() => tree.value.length - collapsed.value.size)

function isExpanded(province) {
  return !collapsed.value.has(province)
}

function toggleProvince(province) {
  const next = new Set(collapsed.value)
  if (next.has(province)) next.delete(province)
  else next.add(province)
  collapsed.value = next
}

function toggleAll() {
  collapsed.value = allExpanded.value
    ? new Set(tree.value.map((g) => g.province))
    : new Set()
}

async function load() {
  loading.value = true
  try {
    list.value = await api.get('/admin/about/footprints')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  form.value = { province: '', place: '', time: '', location: '', elevation: '—', note: '', sortOrder: list.value.length }
  modalOpen.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { province: item.province, place: item.place, time: item.time, location: item.location, elevation: item.elevation, note: item.note, sortOrder: item.sortOrder ?? 0 }
  modalOpen.value = true
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      province: form.value.province.trim(),
      place: form.value.place.trim(),
      time: form.value.time.trim(),
      location: form.value.location.trim(),
      elevation: form.value.elevation.trim() || '—',
      note: form.value.note.trim(),
      sortOrder: Number(form.value.sortOrder) || 0,
    }
    if (editing.value) {
      await api.put(`/admin/about/footprints/${editing.value.id}`, payload)
      showToast('已更新', 'success')
    } else {
      await api.post('/admin/about/footprints', payload)
      showToast('已新增', 'success')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function askDelete(item) {
  pendingDelete.value = item
  confirmOpen.value = true
}

function cancelDelete() {
  if (deleting.value) return
  confirmOpen.value = false
  pendingDelete.value = null
}

async function confirmDelete() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true
  const id = pendingDelete.value.id
  try {
    await api.delete(`/admin/about/footprints/${id}`)
    showToast('已删除', 'success')
    confirmOpen.value = false
    pendingDelete.value = null
    await load()
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

onMounted(load)
</script>

<template>
  <div class="fp-manage">
    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">About · 足迹</span>
            <h1>足迹管理</h1>
          </div>
          <div class="hero-side">
            <button class="btn btn--ghost" type="button" @click="toggleAll">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 6 14 12 8 18"/></svg>
              {{ allExpanded ? '收起全部' : '展开全部' }}
            </button>
            <button class="btn btn--primary" type="button" @click="openNew">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增足迹
            </button>
          </div>
        </div>
        <p class="lede">按省份聚合维护「关于我」地图上的足迹，点击省份可展开/收起该省下的记录。</p>
        <p class="hero-note">共 {{ list.length }} 条足迹 · {{ tree.length }} 个省份 · 已展开 {{ expandedCount }} 个</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== Table ===== -->
    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-province">省份</th>
            <th class="col-place">地点</th>
            <th class="col-time">时间</th>
            <th class="col-elev">海拔</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in tree" :key="group.province">
            <tr class="province-row" :class="{ 'is-collapsed': !isExpanded(group.province) }" @click="toggleProvince(group.province)">
              <td class="cell-province">
                <span class="tree-arrow" :class="{ open: isExpanded(group.province) }">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
                <span class="province-name">{{ group.province }}</span>
                <span class="count-chip">{{ group.children.length }} 条</span>
              </td>
              <td colspan="4"></td>
            </tr>
            <template v-if="isExpanded(group.province)">
              <tr v-for="item in group.children" :key="item.id" class="child-row">
                <td class="cell-province child-indent"></td>
                <td class="cell-place">{{ item.place }}</td>
                <td class="cell-time">{{ item.time }}</td>
                <td class="cell-elev">{{ item.elevation }}</td>
                <td class="cell-ops">
                  <button class="link" @click="openEdit(item)">编辑</button>
                  <button class="link link--danger" @click="askDelete(item)">删除</button>
                </td>
              </tr>
            </template>
          </template>
          <tr v-if="!tree.length">
            <td colspan="5" class="empty-row">
              <div class="empty empty--block">
                <div class="empty__illus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <p class="empty__title">暂无足迹记录</p>
                <p class="empty__sub">点击「新增足迹」标记第一个去过的地方</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ===== 新增 / 编辑弹窗 ===== -->
    <transition name="modal-fade">
      <div v-if="modalOpen" class="modal-mask" @click.self="modalOpen = false">
        <div class="editor-modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <span class="modal-title">{{ editing ? '编辑足迹' : '新增足迹' }}</span>
            <button class="modal-close" type="button" title="关闭" @click="modalOpen = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label class="field-label" for="fpProvince">省份（全称）</label>
              <input id="fpProvince" v-model="form.province" class="form-input" type="text" maxlength="60" placeholder="如：新疆维吾尔自治区" />
              <span class="field-hint">需与前端 PROVINCE_FULL 映射的全称一致</span>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label" for="fpPlace">地点</label>
                <input id="fpPlace" v-model="form.place" class="form-input" type="text" maxlength="120" placeholder="如：慕士塔格峰" />
              </div>
              <div class="form-field">
                <label class="field-label" for="fpTime">时间</label>
                <input id="fpTime" v-model="form.time" class="form-input" type="text" maxlength="60" placeholder="如：2022" />
              </div>
            </div>
            <div class="form-field">
              <label class="field-label" for="fpLocation">位置</label>
              <input id="fpLocation" v-model="form.location" class="form-input" type="text" maxlength="120" placeholder="如：新疆 · 喀什地区 · 阿克陶县" />
            </div>
            <div class="form-field">
              <label class="field-label" for="fpElevation">海拔</label>
              <input id="fpElevation" v-model="form.elevation" class="form-input" type="text" maxlength="40" placeholder="如：7546 m，无则填 —" />
            </div>
            <div class="form-field">
              <label class="field-label" for="fpNote">笔记</label>
              <textarea id="fpNote" v-model="form.note" class="form-input form-textarea" rows="3" placeholder="这趟旅程的感受"></textarea>
            </div>
            <div class="form-field">
              <label class="field-label" for="fpSort">排序</label>
              <input id="fpSort" v-model.number="form.sortOrder" class="form-input form-input--sm" type="number" min="0" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn--ghost" type="button" :disabled="saving" @click="modalOpen = false">取消</button>
            <button class="btn btn--primary" type="button" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除足迹"
      confirm-label="删除"
      :loading="deleting"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    >
      确定要删除 <strong>{{ pendingDelete?.place }}</strong> 吗？此操作不可撤销。
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
.fp-manage { position: relative; }

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
.data-table tr:last-child td { border-bottom: none; }
.col-province { width: 240px; }
.col-place { width: 180px; }
.col-time { width: 100px; }
.col-elev { width: 100px; }
.col-ops { width: 120px; text-align: right; }

/* 树形：省份父节点 */
.province-row { cursor: pointer; background: var(--bg-soft); }
.province-row:hover { background-color: color-mix(in srgb, var(--accent-light) 70%, transparent); }
.province-row td { padding: 11px 16px; border-bottom: 1px solid var(--border); }
.province-row.is-collapsed td { border-bottom: 1px solid var(--border-light); }
.tree-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; margin-right: 2px;
  color: var(--text-tertiary);
  transition: transform var(--transition), color var(--transition);
}
.tree-arrow svg { width: 13px; height: 13px; }
.province-row:hover .tree-arrow { color: var(--accent); }
.tree-arrow.open { transform: rotate(90deg); }
.province-name {
  font-family: var(--font-serif); font-weight: 600; font-size: 14.5px;
  color: var(--text-primary); letter-spacing: 0.01em;
}
.count-chip {
  margin-left: 10px; padding: 2px 10px; border-radius: 100px;
  background: var(--accent-light); color: var(--accent);
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;
}

/* 树形：子节点 */
.child-row { transition: background-color var(--transition); }
.child-row:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.child-row td { padding-top: 10px; padding-bottom: 10px; }
.child-indent { position: relative; padding-left: 42px; }
.child-indent::before {
  content: ''; position: absolute; left: 26px; top: 0; bottom: 0;
  border-left: 1px dashed var(--border);
}
.child-indent::after {
  content: ''; position: absolute; left: 26px; top: 50%;
  width: 12px; border-top: 1px dashed var(--border);
}
.cell-place { font-size: 13.5px; color: var(--text-primary); }
.cell-time,
.cell-elev {
  font-family: var(--font-mono); font-size: 12px;
  color: var(--text-tertiary); white-space: nowrap;
}
.cell-ops { text-align: right; white-space: nowrap; }
.cell-ops .link {
  background: none; border: none; color: var(--accent); cursor: pointer;
  font-size: 13px; font-weight: 500; padding: 2px 6px;
  transition: color var(--transition);
}
.cell-ops .link:hover { text-decoration: underline; }
.link--danger { color: #e0533d; }
.link--danger:hover { color: #c7442f; }
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
.modal-close:hover {
  color: var(--accent); border-color: var(--accent); background-color: var(--accent-light);
}
.modal-body {
  padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
}
.modal-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--border-light); background: var(--bg-soft);
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .editor-modal { transition: transform 0.2s ease; }
.modal-fade-enter-from .editor-modal { transform: translateY(-12px) scale(0.98); }

/* form */
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.field-hint { font-size: 12px; color: var(--text-tertiary); }
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
.form-input--sm { max-width: 140px; }

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
  .col-province { width: auto; }
  .col-place { width: auto; }
  .col-ops { width: auto; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
