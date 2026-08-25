<script setup>
import { onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()
const loading = ref(true)
const list = ref([])
const toastMsg = ref('')
const toastType = ref('success')

// 弹窗状态
const modalOpen = ref(false)
const editing = ref(null) // null = 新建，对象 = 编辑
const form = ref({ year: '', title: '', desc: '', sortOrder: 0 })
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    list.value = await api.get('/admin/about/rings')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  form.value = { year: String(new Date().getFullYear()), title: '', desc: '', sortOrder: list.value.length }
  modalOpen.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { year: item.year, title: item.title, desc: item.desc, sortOrder: item.sortOrder ?? 0 }
  modalOpen.value = true
}

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      year: form.value.year.trim(),
      title: form.value.title.trim(),
      desc: form.value.desc.trim(),
      sortOrder: Number(form.value.sortOrder) || 0,
    }
    if (editing.value) {
      await api.put(`/admin/about/rings/${editing.value.id}`, payload)
      showToast('已更新', 'success')
    } else {
      await api.post('/admin/about/rings', payload)
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

async function remove(item) {
  if (!confirm(`确认删除「${item.title}」？`)) return
  try {
    await api.delete(`/admin/about/rings/${item.id}`)
    showToast('已删除', 'success')
    await load()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
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
        <h2>年轮管理</h2>
        <p class="page-desc">按年份归档的人生经历，前台事件日历下方按年份联动展示</p>
      </div>
      <button class="btn-primary" @click="openNew">+ 新增年轮</button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-year">年份</th>
            <th class="col-title">标题</th>
            <th class="col-desc">描述</th>
            <th class="col-order">排序</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td class="cell-year">{{ item.year }}</td>
            <td class="cell-title">{{ item.title }}</td>
            <td class="cell-desc">{{ item.desc }}</td>
            <td class="cell-order">{{ item.sortOrder }}</td>
            <td class="cell-ops">
              <button class="link" @click="openEdit(item)">编辑</button>
              <button class="link link--danger" @click="remove(item)">删除</button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="5" class="empty-row">暂无年轮记录，点击右上角新增</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 弹窗 -->
    <transition name="fade">
      <div v-if="modalOpen" class="modal-mask" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modal-head">
            <span>{{ editing ? '编辑年轮' : '新增年轮' }}</span>
            <button class="modal-close" @click="modalOpen = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>年份</label>
              <input v-model="form.year" type="text" maxlength="10" placeholder="如：2024" />
            </div>
            <div class="form-field">
              <label>标题</label>
              <input v-model="form.title" type="text" maxlength="120" placeholder="如：墨堆 · 数字生命" />
            </div>
            <div class="form-field">
              <label>描述</label>
              <textarea v-model="form.desc" rows="4" placeholder="这段经历的具体描述"></textarea>
            </div>
            <div class="form-field">
              <label>排序（数字越小越靠前）</label>
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
.col-year { width: 80px; }
.col-title { width: 200px; }
.col-desc { }
.col-order { width: 80px; }
.col-ops { width: 120px; text-align: right; }
.cell-year { font-family: var(--font-mono); color: var(--accent); font-weight: 600; }
.cell-title { font-weight: 600; }
.cell-desc { color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
.cell-ops .link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; padding: 2px 6px; }
.link--danger { color: #e03131; }
.empty-row { text-align: center; color: var(--text-tertiary); padding: 32px; }
/* modal */
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
