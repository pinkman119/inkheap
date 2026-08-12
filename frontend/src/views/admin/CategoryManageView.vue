<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const flat = ref([])          // 后端返回的扁平分类（含 articleCount）
const loading = ref(true)
const collapsedKeys = ref(new Set())  // 折叠的节点 key 集合
const toastMsg = ref('')
const toastType = ref('success')

// ===== Modal 状态 =====
const showModal = ref(false)
const saving = ref(false)
const editingId = ref(null)   // null = 新建
const form = ref({ name: '', key: '', parentKey: '', sortOrder: 0, icon: '' })
const keyTouched = ref(false) // 用户是否手改过 key

// ===== 删除确认 =====
const showDeleteModal = ref(false)
const deleteTarget = ref(null)

// 将扁平列表构建为带 depth 的树
const tree = computed(() => buildTree(flat.value))

function buildTree(list) {
  const map = new Map()
  const roots = []
  list.forEach((c) => map.set(c.key, { ...c, children: [], depth: 1 }))
  list.forEach((c) => {
    const node = map.get(c.key)
    if (c.parentKey && map.has(c.parentKey)) {
      const parent = map.get(c.parentKey)
      node.depth = parent.depth + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// 拍平树，按折叠状态过滤出可见行（含 depth 用于缩进与软约束）
const visibleList = computed(() => {
  const out = []
  const walk = (nodes, depth) => {
    nodes.forEach((n) => {
      out.push({ ...n, depth, hasChildren: n.children.length > 0, collapsed: collapsedKeys.value.has(n.key) })
      if (n.children.length && !collapsedKeys.value.has(n.key)) walk(n.children, depth + 1)
    })
  }
  walk(tree.value, 1)
  return out
})

// 父级下拉候选项（排除自身及其子孙，避免循环）
function descendantKeys(node) {
  const keys = new Set([node.key])
  const walk = (n) => n.children.forEach((c) => { keys.add(c.key); walk(c) })
  walk(node)
  return keys
}

const parentOptions = computed(() => {
  // 编辑时排除自身与子孙
  const exclude = editingId.value ? descendantKeys(findByKey(form.value.key) || { key: '', children: [] }) : new Set()
  return flat.value.filter((c) => !exclude.has(c.key))
})

function findByKey(key) {
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.key === key) return n
      const f = walk(n.children)
      if (f) return f
    }
    return null
  }
  return walk(tree.value)
}

async function load() {
  loading.value = true
  try {
    flat.value = await api.get('/admin/categories')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ===== key 自动生成 =====
function autoKey(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-一-龥]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-|-$/g, '')
}

function onNameInput() {
  if (!keyTouched.value) form.value.key = autoKey(form.value.name)
}

// ===== 新建 / 编辑 =====
function openCreate(parentKey = '') {
  editingId.value = null
  keyTouched.value = false
  form.value = { name: '', key: '', parentKey, sortOrder: 0, icon: '' }
  showModal.value = true
}

function openEdit(node) {
  editingId.value = node.id
  keyTouched.value = true // 编辑时 key 只读，不自动覆盖
  form.value = {
    name: node.name,
    key: node.key,
    parentKey: node.parentKey || '',
    sortOrder: node.sortOrder ?? 0,
    icon: node.icon || '',
  }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    showToast('请填写名称', 'error')
    return
  }
  if (!form.value.key.trim()) {
    showToast('请填写 key', 'error')
    return
  }
  saving.value = true
  const payload = {
    name: form.value.name.trim(),
    key: form.value.key.trim(),
    parentKey: form.value.parentKey || undefined,
    sortOrder: Number(form.value.sortOrder) || 0,
    icon: form.value.icon.trim(),
  }
  try {
    if (editingId.value) {
      await api.put(`/admin/categories/${editingId.value}`, payload)
      showToast('分类已更新', 'success')
    } else {
      await api.post('/admin/categories', payload)
      showToast('分类已创建', 'success')
    }
    showModal.value = false
    await load()
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ===== 折叠 =====
function toggleCollapse(node) {
  if (!node.hasChildren) return
  if (collapsedKeys.value.has(node.key)) collapsedKeys.value.delete(node.key)
  else collapsedKeys.value.add(node.key)
}
const isCollapsed = (key) => collapsedKeys.value.has(key)

// 任意层级均可添加子级（后端无层级上限兜底）
const canAddChild = () => true

// ===== 删除 =====
function confirmDelete(node) {
  deleteTarget.value = node
  showDeleteModal.value = true
}
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await api.delete(`/admin/categories/${deleteTarget.value.id}`)
    showToast(`「${deleteTarget.value.name}」已删除`, 'success')
    showDeleteModal.value = false
    deleteTarget.value = null
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
</script>

<template>
  <div class="category-manage">
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>分类管理</h2>
        <p class="page-desc">维护知识库分类树，支持多级嵌套</p>
      </div>
      <button class="btn-primary" @click="openCreate('')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建一级分类
      </button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>
    <div v-else-if="!flat.length" class="empty">暂无分类，点击右上角新建一级分类</div>

    <div v-else class="tree-wrap">
      <ul class="cat-tree">
        <li
          v-for="node in visibleList"
          :key="node.key"
          class="cat-row"
          :style="{ paddingLeft: (node.depth - 1) * 28 + 'px' }"
        >
          <span
            class="twisty"
            :class="{ leaf: !node.hasChildren, collapsed: node.collapsed }"
            @click="toggleCollapse(node)"
          >▸</span>
          <span class="cat-icon" v-if="node.icon">{{ node.icon }}</span>
          <span class="cat-name">{{ node.name }}</span>
          <span class="cat-key">/ {{ node.key }}</span>
          <span class="cat-count">({{ node.articleCount }})</span>
          <span class="cat-actions">
            <button
              class="act"
              :disabled="!canAddChild(node)"
              :title="canAddChild(node) ? '添加子级' : ''"
              @click="openCreate(node.key)"
            >+子级</button>
            <button class="act" @click="openEdit(node)">编辑</button>
            <button
              class="act danger"
              :disabled="node.articleCount > 0"
              :title="node.articleCount > 0 ? '该分类下存在文章，无法删除' : '删除'"
              @click="confirmDelete(node)"
            >删除</button>
          </span>
        </li>
      </ul>
    </div>

    <!-- 新建/编辑 Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-card">
          <h4>{{ editingId ? '编辑分类' : '新建分类' }}</h4>
          <div class="form-field">
            <label>名称</label>
            <input v-model="form.name" type="text" placeholder="如：前端开发" @input="onNameInput" />
          </div>
          <div class="form-field">
            <label>Key</label>
            <input v-model="form.key" type="text" :disabled="!!editingId" :placeholder="editingId ? '创建后不可修改' : '由名称自动生成，可修改'" @input="keyTouched = true" />
            <small v-if="editingId" class="hint">Key 创建后不可修改</small>
          </div>
          <div class="form-field">
            <label>父级</label>
            <select v-model="form.parentKey">
              <option value="">（无，作为一级分类）</option>
              <option v-for="opt in parentOptions" :key="opt.key" :value="opt.key">{{ opt.name }} / {{ opt.key }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>排序</label>
              <input v-model="form.sortOrder" type="number" />
            </div>
            <div class="form-field">
              <label>图标</label>
              <input v-model="form.icon" type="text" placeholder="可选" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal = false">取消</button>
            <button class="btn-primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-card">
          <h4>确认删除</h4>
          <p>确定要删除「<strong>{{ deleteTarget?.name }}</strong>」吗？此操作不可撤销。</p>
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
.category-manage { position: relative; }

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 4px 0 0; }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition);
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.empty { padding: 48px; text-align: center; color: var(--text-tertiary); }

.tree-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 0;
}
.cat-tree { list-style: none; margin: 0; padding: 0; }
.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}
.cat-row:last-child { border-bottom: none; }
.cat-row:hover { background: var(--bg-soft); }

.twisty {
  width: 16px;
  text-align: center;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: transform var(--transition);
  user-select: none;
}
.twisty.collapsed { transform: rotate(-90deg); }
.twisty.leaf { visibility: hidden; }

.cat-icon { font-size: 14px; }
.cat-name { font-weight: 600; color: var(--text-primary); }
.cat-key { font-size: 12px; color: var(--text-tertiary); }
.cat-count { font-size: 12px; color: var(--text-tertiary); margin-left: 2px; }

.cat-actions { margin-left: auto; display: flex; gap: 6px; }
.act {
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
}
.act:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.act.danger:hover:not(:disabled) { border-color: #e03131; color: #e03131; }
.act:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  padding: 10px 18px;
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

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px;
  width: 440px;
  max-width: calc(100vw - 32px);
  box-shadow: var(--shadow-lg);
}
.modal-card h4 { margin: 0 0 16px; font-size: 17px; color: var(--text-primary); }
.modal-card p { font-size: 14px; color: var(--text-secondary); }

.form-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-field input, .form-field select {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-body);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
}
.form-field input:disabled { background: var(--bg-soft); color: var(--text-tertiary); }
.form-row { display: flex; gap: 12px; }
.form-row .form-field { flex: 1; min-width: 0; }
.hint { font-size: 12px; color: var(--text-tertiary); }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.btn-cancel {
  padding: 9px 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
}
.btn-cancel:hover { background: var(--bg-soft); }
.btn-danger {
  padding: 9px 16px;
  border: none;
  background: #e03131;
  color: #fff;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-danger:hover { opacity: 0.9; }
</style>
