<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()
const loading = ref(true)
const list = ref([])
const toastMsg = ref('')
const toastType = ref('success')

const modalOpen = ref(false)
const editing = ref(null)
const form = ref({ province: '', place: '', time: '', location: '', elevation: '', note: '', sortOrder: 0 })
const saving = ref(false)

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

async function remove(item) {
  if (!confirm(`确认删除「${item.place}」？`)) return
  try {
    await api.delete(`/admin/about/footprints/${item.id}`)
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
        <h2>足迹管理</h2>
        <p class="page-desc">按省份聚合为树形结构，点击省份可展开/收起该省下的足迹</p>
      </div>
      <button class="btn-primary" @click="openNew">+ 新增足迹</button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-province">
              省份
              <button class="tree-all-toggle" @click="toggleAll">{{ allExpanded ? '收起全部' : '展开全部' }}</button>
            </th>
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
                <span class="tree-arrow">{{ isExpanded(group.province) ? '▾' : '▸' }}</span>
                <span class="province-name">{{ group.province }}</span>
                <span class="count-badge">{{ group.children.length }} 条</span>
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
                  <button class="link link--danger" @click="remove(item)">删除</button>
                </td>
              </tr>
            </template>
          </template>
          <tr v-if="!tree.length">
            <td colspan="5" class="empty-row">暂无足迹记录</td>
          </tr>
        </tbody>
      </table>
    </section>

    <transition name="fade">
      <div v-if="modalOpen" class="modal-mask" @click.self="modalOpen = false">
        <div class="modal">
          <div class="modal-head">
            <span>{{ editing ? '编辑足迹' : '新增足迹' }}</span>
            <button class="modal-close" @click="modalOpen = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>省份（全称）</label>
              <input v-model="form.province" type="text" maxlength="60" placeholder="如：新疆维吾尔自治区" />
              <small class="hint">需与前端 PROVINCE_FULL 映射的全称一致</small>
            </div>
            <div class="form-field">
              <label>地点</label>
              <input v-model="form.place" type="text" maxlength="120" placeholder="如：慕士塔格峰" />
            </div>
            <div class="form-field">
              <label>时间</label>
              <input v-model="form.time" type="text" maxlength="60" placeholder="如：2022" />
            </div>
            <div class="form-field">
              <label>位置</label>
              <input v-model="form.location" type="text" maxlength="120" placeholder="如：新疆 · 喀什地区 · 阿克陶县" />
            </div>
            <div class="form-field">
              <label>海拔</label>
              <input v-model="form.elevation" type="text" maxlength="40" placeholder="如：7546 m，无则填 —" />
            </div>
            <div class="form-field">
              <label>笔记</label>
              <textarea v-model="form.note" rows="3" placeholder="这趟旅程的感受"></textarea>
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
.col-province { width: 220px; }
.col-place { width: 160px; }
.col-time { width: 100px; }
.col-elev { width: 100px; }
.col-ops { width: 120px; text-align: right; }
.cell-province { font-weight: 600; }
.cell-time { font-family: var(--font-mono); color: var(--accent); }
/* 树形：省份父节点 */
.province-row { cursor: pointer; background: var(--bg-soft); }
.province-row:hover { background: var(--accent-light); }
.province-row td { padding: 11px 14px; border-bottom: 1px solid var(--border); }
.province-row.is-collapsed td { border-bottom: 1px solid var(--border-light); }
.tree-arrow { display: inline-block; width: 16px; font-size: 12px; color: var(--text-tertiary); }
.province-name { font-weight: 700; color: var(--text-primary); }
.count-badge { margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: var(--accent-light); color: var(--accent); font-size: 12px; font-weight: 600; }
.tree-all-toggle { margin-left: 10px; background: none; border: none; padding: 0; font-size: 12px; font-weight: 500; color: var(--accent); cursor: pointer; }
.tree-all-toggle:hover { text-decoration: underline; }
/* 树形：子节点 */
.child-row td { padding-top: 10px; padding-bottom: 10px; }
.child-indent { position: relative; padding-left: 40px !important; }
.child-indent::before { content: ''; position: absolute; left: 24px; top: 0; bottom: 0; width: 0; border-left: 1px dashed var(--border); }
.child-row td:first-child::after { content: ''; position: absolute; left: 24px; top: 50%; width: 12px; border-top: 1px dashed var(--border); }
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
.hint { font-size: 12px; color: var(--text-tertiary); }
.toast { position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px 18px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 500; color: #fff; box-shadow: var(--shadow-md); }
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
