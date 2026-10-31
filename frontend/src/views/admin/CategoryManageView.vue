<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import ThemeSelect from '@/components/ThemeSelect.vue'

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
const form = ref({ name: '', key: '', parentKey: '', sortOrder: 0 })
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

/* 父级下拉（ThemeSelect）选项 */
const parentSelectOptions = computed(() => [
  { value: '', label: '（无，作为一级分类）' },
  ...parentOptions.value.map((o) => ({ value: o.key, label: o.name, desc: o.key })),
])

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
  form.value = { name: '', key: '', parentKey, sortOrder: 0 }
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
            <span class="kicker">Categories · 分类</span>
            <h1>分类管理</h1>
          </div>
          <div class="hero-side">
            <button class="btn btn--primary" type="button" @click="openCreate('')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建一级分类
            </button>
          </div>
        </div>
        <p class="lede">维护知识库分类树，支持多级嵌套。</p>
        <p class="hero-note">{{ flat.length }} 个分类 · 子分类可无限嵌套 · 分类下存在文章时不可删除</p>
      </div>
    </section>

    <!-- ===== Loading / Empty ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>
    <div v-else-if="!flat.length" class="empty">
      <div class="empty__illus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </div>
      <p class="empty__title">暂无分类</p>
      <p class="empty__sub">点击右上角「新建一级分类」开始</p>
    </div>

    <!-- ===== Tree ===== -->
    <section v-else class="tree-card">
      <ul class="cat-tree">
        <li
          v-for="node in visibleList"
          :key="node.key"
          class="cat-row"
          :style="{ paddingLeft: 14 + (node.depth - 1) * 26 + 'px' }"
        >
          <button
            class="twisty"
            :class="{ leaf: !node.hasChildren, collapsed: node.collapsed }"
            :aria-label="node.hasChildren ? (node.collapsed ? '展开' : '收起') : ''"
            @click="toggleCollapse(node)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span class="cat-name" :class="{ root: node.depth === 1 }">{{ node.name }}</span>
          <span class="cat-key">/ {{ node.key }}</span>
          <span class="cat-count" :class="{ zero: !node.articleCount }">{{ node.articleCount }}</span>
          <span class="cat-actions">
            <button
              class="mini-btn"
              :disabled="!canAddChild(node)"
              :title="canAddChild(node) ? '添加子级' : ''"
              @click="openCreate(node.key)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              子级
            </button>
            <button class="mini-btn" @click="openEdit(node)">编辑</button>
            <button
              class="mini-btn danger"
              :disabled="node.articleCount > 0"
              :title="node.articleCount > 0 ? '该分类下存在文章，无法删除' : '删除'"
              @click="confirmDelete(node)"
            >删除</button>
          </span>
        </li>
      </ul>
    </section>

    <!-- 新建/编辑 Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showModal" class="modal-overlay" @mousedown.self="showModal = false" @click.self="showModal = false">
          <div class="modal-card" role="dialog" aria-modal="true" :aria-label="editingId ? '编辑分类' : '新建分类'">
            <div class="modal-head">
              <span class="modal-title">{{ editingId ? '编辑分类' : '新建分类' }}</span>
              <button class="modal-close" title="关闭" :disabled="saving" @click="showModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label class="field-label" for="cName">名称</label>
                <input id="cName" v-model="form.name" type="text" placeholder="如：前端开发" @input="onNameInput" />
              </div>
              <div class="form-field">
                <label class="field-label" for="cKey">Key</label>
                <input
                  id="cKey"
                  v-model="form.key"
                  type="text"
                  class="input-mono"
                  :disabled="!!editingId"
                  :placeholder="editingId ? '创建后不可修改' : '由名称自动生成，可修改'"
                  @input="keyTouched = true"
                />
                <small v-if="editingId" class="hint">Key 创建后不可修改</small>
              </div>
              <div class="form-field">
                <label class="field-label" for="cParent">父级</label>
                <ThemeSelect v-model="form.parentKey" aria-label="父级分类" :options="parentSelectOptions" />
              </div>
              <div class="form-field">
                <label class="field-label" for="cOrder">排序</label>
                <input id="cOrder" v-model="form.sortOrder" type="number" />
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn--ghost" :disabled="saving" @click="showModal = false">取消</button>
              <button class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 删除确认 Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showDeleteModal" class="modal-overlay" @mousedown.self="showDeleteModal = false" @click.self="showDeleteModal = false">
          <div class="modal-card modal-card--confirm" role="dialog" aria-modal="true" aria-label="确认删除">
            <div class="modal-head">
              <span class="modal-title">删除分类</span>
              <button class="modal-close" title="关闭" @click="showDeleteModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="confirm-warn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p>确定要删除「<strong>{{ deleteTarget?.name }}</strong>」吗？此操作不可撤销。</p>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn--ghost" @click="showDeleteModal = false">取消</button>
              <button class="btn btn--danger" @click="doDelete">删除</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.category-manage { position: relative; }

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
  box-shadow: 0 1px 0 rgba(224, 83, 61, 0.3);
}
.btn--danger:hover:not(:disabled) {
  background-color: #c7442f; border-color: #c7442f;
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}

/* ===== Loading / Empty ===== */
.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 64px 24px;
}
.empty > span {
  display: inline-flex; align-items: center; gap: 10px;
  color: var(--text-tertiary); font-size: 14px;
}
.empty__illus {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--bg-soft);
  display: grid; place-items: center;
  margin-bottom: 10px; color: var(--text-tertiary);
}
.empty__illus svg { width: 28px; height: 28px; }
.empty__title {
  font-family: var(--font-serif); font-size: 15.5px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.empty__sub { margin: 4px 0 0; font-size: 13px; color: var(--text-tertiary); }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Tree card ===== */
.tree-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 22px 0 8px;
}
.cat-tree { list-style: none; margin: 0; padding: 6px 0; }
.cat-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px 11px 14px;
  border-radius: var(--radius-sm);
  margin: 0 6px;
  transition: background-color var(--transition);
}
.cat-row + .cat-row { margin-top: 2px; }
.cat-row:hover { background-color: color-mix(in srgb, var(--accent-light) 35%, transparent); }

/* 展开箭头 */
.twisty {
  width: 22px; height: 22px; flex: 0 0 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: none; padding: 0;
  cursor: pointer; color: var(--text-tertiary);
  border-radius: 50%;
  transition: all var(--transition);
}
.twisty svg { width: 12px; height: 12px; }
.twisty:hover { color: var(--accent); background-color: var(--accent-light); }
.twisty.collapsed svg { transform: rotate(0deg); }
.twisty:not(.collapsed) svg { transform: rotate(90deg); }
.twisty.leaf { visibility: hidden; }

.cat-name {
  font-size: 14px; font-weight: 500; color: var(--text-primary);
  letter-spacing: 0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cat-name.root {
  font-family: var(--font-serif); font-size: 14.5px; font-weight: 600;
  letter-spacing: 0.02em;
}
.cat-key {
  font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cat-count {
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;
  color: var(--accent); background-color: var(--accent-light);
  padding: 1px 9px; border-radius: 100px;
  flex-shrink: 0;
}
.cat-count.zero { color: var(--text-tertiary); background-color: var(--bg-soft); }

.cat-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }

/* ===== mini-btn ===== */
.mini-btn {
  display: inline-flex; align-items: center; gap: 4px;
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
.mini-btn svg { width: 12px; height: 12px; }
.mini-btn:hover:not(:disabled) {
  color: var(--accent); border-color: var(--accent);
  background-color: var(--accent-light);
}
.mini-btn.danger:hover:not(:disabled) {
  color: #e0533d; border-color: #e0533d; background-color: #fdf1ef;
}
:global([data-theme='dark']) .mini-btn.danger:hover:not(:disabled) { background-color: #33211e; }
.mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ===== Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-card {
  width: 460px;
  max-width: calc(100vw - 32px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-card--confirm { width: 420px; }
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
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
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
.modal-fade-enter-active .modal-card { transition: transform 0.2s ease; }
.modal-fade-enter-from .modal-card { transform: translateY(-12px) scale(0.98); }

/* ===== 表单 ===== */
.form-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-field input,
.form-field select {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.form-field input::placeholder { color: var(--text-tertiary); }
.form-field input:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%);
}
.form-field input:focus:not(:disabled),
.form-field select:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.form-field input:disabled {
  background: var(--bg-soft);
  color: var(--text-tertiary);
  cursor: not-allowed;
  opacity: 0.75;
}
.input-mono { font-family: var(--font-mono); font-size: 13px; }
/* ThemeSelect 父级下拉 */
.form-field :deep(.tsel) { width: 100%; display: flex; }
.form-field :deep(.tsel__trigger) { width: 100%; background: var(--bg-soft); border-color: transparent; padding: 11px 13px; border-radius: var(--radius-sm); }
.form-field :deep(.tsel__trigger:hover:not(:disabled)) { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.form-field :deep(.tsel.open .tsel__trigger) { background: var(--bg-card); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
.form-row { display: flex; gap: 14px; }
.form-row .form-field { flex: 1; min-width: 0; }
.hint {
  font-size: 12px; color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* 删除确认 warn */
.confirm-warn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  background: #fdf1ef;
  border: 1px solid #f3c9c2;
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.6;
}
:global([data-theme='dark']) .confirm-warn {
  background: #2a1a17;
  border-color: #4a2a24;
}
.confirm-warn svg {
  flex-shrink: 0;
  width: 20px; height: 20px;
  color: #e0533d;
  margin-top: 1px;
}
.confirm-warn p { margin: 0; }
.confirm-warn strong {
  color: var(--text-primary);
  font-weight: 700;
}

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
  .cat-row { padding: 10px 12px; gap: 8px; margin: 0 4px; }
  .cat-key { display: none; }
  .form-row { flex-direction: column; }
}
</style>
