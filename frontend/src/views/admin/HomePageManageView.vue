<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import HomeView from '@/views/HomeView.vue'

const api = useApi()

const loading = ref(true)
const saving = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

const form = ref({
  siteName: '',
  personTitle: '',
  codeContent: '',
  avatar: '',
})

// 上传后服务端返回的文件记录 id（用于移除时删除）
const uploadedFileId = ref('')
const uploading = ref(false)

// 已保存的代码框内容快照（用于「还原」）
let savedCodeContent = ''

/* ===== 实时预览：抽屉内直接复用前台首页页面渲染 ===== */
const previewOpen = ref(false)
const previewData = computed(() => ({
  siteName: form.value.siteName,
  personTitle: form.value.personTitle,
  codeContent: form.value.codeContent,
  avatar: form.value.avatar,
}))

/* ===== 预览抽屉等比例缩放 =====
 * HomeView 以 1320px 设计宽度（顶栏 max-width），抽屉宽度不足以容纳原布局。
 * 用 CSS zoom 在基准宽度上整体缩放，实现方式与简历管理抽屉一致。 */
const PREVIEW_BASE_WIDTH = 1320
const drawerBodyRef = ref(null)
const drawerWidth = ref(0)

const previewScale = computed(() => {
  if (!drawerWidth.value) return 1
  return Math.min(1, drawerWidth.value / PREVIEW_BASE_WIDTH)
})
const previewScaleStyle = computed(() => ({
  width: PREVIEW_BASE_WIDTH + 'px',
  zoom: previewScale.value,
}))

function measurePreview() {
  nextTick(() => {
    if (drawerBodyRef.value) {
      const cs = window.getComputedStyle(drawerBodyRef.value)
      const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
      drawerWidth.value = drawerBodyRef.value.clientWidth - pad
    }
  })
}
function onWindowResize() {
  measurePreview()
}
watch(previewOpen, (open) => {
  if (open) measurePreview()
})

/* ===== 未保存修改标记 ===== */
const dirty = ref(false)
let suppressDirty = false
watch(
  () => JSON.stringify(form.value),
  () => {
    if (!suppressDirty) dirty.value = true
  },
)

async function load() {
  loading.value = true
  suppressDirty = true
  try {
    const data = await api.get('/admin/home-page')
    form.value = {
      siteName: data.siteName ?? '',
      personTitle: data.personTitle ?? '',
      codeContent: data.codeContent ?? '',
      avatar: data.avatar ?? '',
    }
    savedCodeContent = form.value.codeContent
    uploadedFileId.value = ''
    dirty.value = false
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
    // 等 dirty watcher 完成回填触发后再解除抑制，避免误判为「未保存修改」
    await nextTick()
    suppressDirty = false
  }
}

// ===== 头像上传 =====
async function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.upload('/admin/upload', fd)
    form.value.avatar = res.url
    uploadedFileId.value = res.id
    showToast('头像上传成功', 'success')
  } catch (err) {
    showToast('上传失败: ' + err.message, 'error')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

// 移除头像：先删服务端文件（磁盘 + files 表），再清空字段
async function removeAvatar() {
  try {
    if (uploadedFileId.value) {
      await api.delete(`/admin/upload/${uploadedFileId.value}`)
    }
    form.value.avatar = ''
    uploadedFileId.value = ''
    showToast('头像已移除', 'success')
  } catch (err) {
    showToast('移除失败: ' + err.message, 'error')
  }
}

/* ===== 保存 =====
 * opts.auto = true 表示自动保存触发：成功时不弹 toast 打扰，失败仍提示错误。
 * saving 互斥保护：自动保存与 Ctrl+S / 手动保存并发时只执行一个。 */
async function save(opts = {}) {
  if (saving.value) return
  saving.value = true
  try {
    const payload = {
      siteName: form.value.siteName.trim(),
      personTitle: form.value.personTitle.trim(),
      codeContent: form.value.codeContent,
      avatar: form.value.avatar || null,
    }
    await api.put('/admin/home-page', payload)
    dirty.value = false
    savedCodeContent = form.value.codeContent
    lastSavedAt.value = Date.now()
    if (!opts.auto) showToast('首页配置已保存', 'success')
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function resetCode() {
  form.value.codeContent = savedCodeContent
}

/* ===== 每 20s 自动保存 ===== */
const AUTOSAVE_INTERVAL = 20_000
let autosaveTimer = null
const lastSavedAt = ref(0)

function startAutosave() {
  stopAutosave()
  autosaveTimer = setInterval(() => {
    if (dirty.value && !saving.value) {
      save({ auto: true })
    }
  }, AUTOSAVE_INTERVAL)
}
function stopAutosave() {
  if (autosaveTimer) {
    clearInterval(autosaveTimer)
    autosaveTimer = null
  }
}

/* ===== Ctrl + S 保存 ===== */
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(async () => {
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
  startAutosave()
  await load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  stopAutosave()
})
</script>

<template>
  <div class="homepage-manage">
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>首页管理</h2>
        <p class="page-desc">配置前台首页展示的名称、人物 title 与代码框内容，保存后即时生效</p>
        <span class="autosave-status" :class="{ dirty }" :title="'每 20 秒自动保存 · Ctrl + S 手动保存'">
          {{ saving ? '保存中…' : dirty ? '未保存' : lastSavedAt ? '已自动保存 ' + new Date(lastSavedAt).toLocaleTimeString() : '' }}
        </span>
      </div>
      <div class="head-actions">
        <button class="btn-primary" :disabled="saving" @click="save()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
          {{ saving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <div v-else class="manage-grid">
      <!-- 表单 -->
      <section class="panel">
        <div class="form-field">
          <div class="label-row">
            <label>首页名称</label>
            <button class="btn-ghost" @click="previewOpen = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              实时预览
            </button>
          </div>
          <input
            v-model="form.siteName"
            type="text"
            maxlength="120"
            placeholder="如：INKHEAP"
          />
          <small class="hint">展示在首页标题与浏览器页签，前端数据由后台驱动</small>
        </div>

        <div class="form-field">
          <label>人物 Title</label>
          <input
            v-model="form.personTitle"
            type="text"
            maxlength="240"
            placeholder="如：Digital Gardener & Lifelong Learner"
          />
          <small class="hint">首页人物头像/署名下方的副标题</small>
        </div>

        <div class="form-field">
          <label>代码框内容</label>
          <textarea
            v-model="form.codeContent"
            rows="12"
            placeholder="支持多行文本，如终端风格的介绍代码"
          ></textarea>
          <div class="field-foot">
            <small class="hint">首页终端/代码展示框内的正文</small>
            <button class="btn-ghost" @click="resetCode">还原</button>
          </div>
        </div>

        <div class="form-field">
          <label>首页头像</label>
          <div class="avatar-upload">
            <div class="avatar-preview">
              <img v-if="form.avatar" :src="api.assetUrl(form.avatar)" alt="头像预览" />
              <div v-else class="avatar-empty">👤</div>
            </div>
            <div class="avatar-actions">
              <label class="btn-ghost file-btn">
                {{ uploading ? '上传中…' : '选择图片' }}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  :disabled="uploading"
                  @change="onAvatarChange"
                  hidden
                />
              </label>
              <button
                v-if="form.avatar"
                class="btn-ghost danger"
                :disabled="uploading"
                @click="removeAvatar"
              >
                移除头像
              </button>
            </div>
          </div>
          <small class="hint">支持 png/jpeg/gif/webp，最大 5MB；保存后回显到前台首页</small>
        </div>
      </section>
    </div>

    <!-- 实时预览抽屉 -->
    <transition name="drawer-fade">
      <div v-if="previewOpen" class="drawer-mask" @click="previewOpen = false"></div>
    </transition>
    <transition name="drawer-slide">
      <aside v-if="previewOpen" class="preview-drawer">
        <div class="drawer-head">
          <span>实时预览</span>
          <button class="drawer-close" title="关闭预览" @click="previewOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="drawer-body" ref="drawerBodyRef">
          <div class="preview-scale" :style="previewScaleStyle">
            <HomeView :preview-data="previewData" />
          </div>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.homepage-manage { position: relative; }

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.page-head h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--text-primary); }
.page-desc { font-size: 14px; color: var(--text-tertiary); margin: 4px 0 0; }
.head-actions { display: flex; align-items: center; gap: 10px; }

.autosave-status {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}
.page-head .autosave-status { display: block; margin-top: 6px; }
.autosave-status.dirty {
  color: var(--text-secondary);
  font-weight: 600;
}

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
  white-space: nowrap;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.empty { padding: 48px; text-align: center; color: var(--text-tertiary); }

.manage-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.form-field { margin-bottom: 18px; display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.label-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.label-row .btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.form-field input,
.form-field textarea {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-body);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}
.form-field input:focus,
.form-field textarea:focus { outline: none; border-color: var(--accent); }
.hint { font-size: 12px; color: var(--text-tertiary); }
.field-foot { display: flex; align-items: center; justify-content: space-between; }
.btn-ghost {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
}
.btn-ghost:hover { color: var(--accent); border-color: var(--accent); }
.btn-ghost.danger:hover { color: #e03131; border-color: #e03131; }

/* ===== Avatar Upload ===== */
.avatar-upload { display: flex; align-items: center; gap: 16px; }
.avatar-preview {
  width: 72px; height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
.avatar-empty { font-size: 30px; }
.avatar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.file-btn { cursor: pointer; display: inline-flex; align-items: center; }
.file-btn input { display: none; }

/* ===== Preview Drawer ===== */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}
.preview-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(720px, 92vw);
  background: var(--bg-body);
  box-shadow: var(--shadow-md);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition);
}
.drawer-close:hover { color: var(--accent); border-color: var(--accent); }
.drawer-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
}
.preview-scale {
  transform-origin: top left;
}
.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.25s; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.25s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

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
</style>
