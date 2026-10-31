<script setup>
import { onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()
const loading = ref(true)
const list = ref([])
const toastMsg = ref('')
const toastType = ref('success')

const modalOpen = ref(false)
const editing = ref(null)
const form = ref({ glyph: '', place: '', meta: '', note: '', sortOrder: 0 })
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    list.value = await api.get('/admin/about/travels')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  form.value = { glyph: '', place: '', meta: '', note: '', sortOrder: list.value.length }
  modalOpen.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { glyph: item.glyph, place: item.place, meta: item.meta, note: item.note, sortOrder: item.sortOrder ?? 0 }
  modalOpen.value = true
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      glyph: form.value.glyph.trim(),
      place: form.value.place.trim(),
      meta: form.value.meta.trim(),
      note: form.value.note.trim(),
      sortOrder: Number(form.value.sortOrder) || 0,
    }
    if (editing.value) {
      await api.put(`/admin/about/travels/${editing.value.id}`, payload)
      showToast('已更新', 'success')
    } else {
      await api.post('/admin/about/travels', payload)
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

const confirmOpen = ref(false)
const pendingItem = ref(null)
const deleting = ref(false)

function remove(item) {
  pendingItem.value = item
  confirmOpen.value = true
}

function cancelRemove() {
  confirmOpen.value = false
  pendingItem.value = null
}

async function confirmRemove() {
  const item = pendingItem.value
  if (!item || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/about/travels/${item.id}`)
    showToast('已删除', 'success')
    await load()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
  } finally {
    deleting.value = false
    confirmOpen.value = false
    pendingItem.value = null
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
  <div class="about-manage">
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>旅行卡片管理</h2>
        <p class="page-desc">旅行介绍卡片（封面英文标识 / 地点 / 元信息 / 笔记）</p>
      </div>
      <button class="btn-primary" @click="openNew">+ 新增旅行</button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-glyph">标识</th>
            <th class="col-place">地点</th>
            <th class="col-meta">元信息</th>
            <th class="col-note">笔记</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="cell-glyph">{{ item.glyph }}</td>
            <td class="cell-place">{{ item.place }}</td>
            <td class="cell-meta">{{ item.meta }}</td>
            <td class="cell-note">{{ item.note }}</td>
            <td class="cell-ops">
              <button class="link" @click="openEdit(item)">编辑</button>
              <button class="link link--danger" @click="remove(item)">删除</button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="5" class="empty-row">暂无旅行卡片</td>
          </tr>
        </tbody>
      </table>
    </section>

    <transition name="fade">
      <div v-if="modalOpen" class="modal-mask" @mousedown.self="modalOpen = false" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modal-head">
            <span>{{ editing ? '编辑旅行' : '新增旅行' }}</span>
            <button class="modal-close" @click="modalOpen = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>封面标识（英文）</label>
              <input v-model="form.glyph" type="text" maxlength="60" placeholder="如：MT. Muztagh Ata" />
            </div>
            <div class="form-field">
              <label>地点</label>
              <input v-model="form.place" type="text" maxlength="120" placeholder="如：慕士塔格峰" />
            </div>
            <div class="form-field">
              <label>元信息</label>
              <input v-model="form.meta" type="text" maxlength="120" placeholder="如：新疆 · 2022 · 7546m" />
            </div>
            <div class="form-field">
              <label>笔记</label>
              <textarea v-model="form.note" rows="3" placeholder="这趟旅行的感受"></textarea>
            </div>
            <div class="form-field">
              <label>排序</label>
              <input v-model.number="form.sortOrder" type="number" min="0" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-ghost" @click="modalOpen = false">取消</button>
            <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除旅行卡片"
      confirm-label="删除"
      :loading="deleting"
      warn="删除后不可恢复。"
      @cancel="cancelRemove"
      @confirm="confirmRemove"
    >
      确定要删除 <strong>「{{ pendingItem?.place }}」</strong> 吗？
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.about-manage { position: relative; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 4px 0 0; }
.btn-primary { padding: 9px 16px; border: none; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { padding: 9px 16px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); border-radius: var(--radius-sm); font-size: 14px; cursor: pointer; }
.btn-ghost:hover { color: var(--accent); border-color: var(--accent); }
.empty { padding: 48px; text-align: center; color: var(--text-tertiary); }
.panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: var(--bg-soft); }
.data-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); color: var(--text-primary); vertical-align: top; }
.data-table tr:last-child td { border-bottom: none; }
.col-glyph { width: 160px; }
.col-place { width: 140px; }
.col-meta { width: 180px; }
.col-note { }
.col-ops { width: 120px; text-align: right; }
.cell-glyph { font-family: var(--font-mono); font-size: 12px; color: var(--accent); }
.cell-place { font-weight: 600; }
.cell-meta { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); }
.cell-note { color: var(--text-secondary); font-size: 13px; }
.cell-ops .link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; padding: 2px 6px; }
.link--danger { color: #e03131; }
.empty-row { text-align: center; color: var(--text-tertiary); padding: 32px; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal { width: min(520px, 92vw); max-height: 88vh; overflow-y: auto; background: var(--bg-card); border-radius: var(--radius); box-shadow: var(--shadow-md); }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 22px; color: var(--text-tertiary); cursor: pointer; line-height: 1; }
.modal-body { padding: 20px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border); }
.form-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-field input, .form-field textarea { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-body); color: var(--text-primary); font-size: 14px; font-family: inherit; resize: vertical; }
.form-field input:focus, .form-field textarea:focus { outline: none; border-color: var(--accent); }
.toast { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px 18px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; color: #fff; box-shadow: var(--shadow-md); }
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
