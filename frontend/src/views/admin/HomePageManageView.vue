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

// 代码框字符计数（与原型一致：上限 2000，超 90% 提醒）
const CODE_MAX = 2000
const codeCount = computed(() => form.value.codeContent.length)
const codeWarn = computed(() => codeCount.value > CODE_MAX * 0.9)

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
  showToast('已还原为上次保存的内容', 'success')
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
            <span class="kicker">Settings · 配置</span>
            <h1>首页管理</h1>
          </div>
          <div class="hero-side">
            <span class="autosave-status" :class="{ dirty }" title="每 20 秒自动保存 · Ctrl + S 手动保存">
              {{ saving ? '保存中…' : dirty ? '未保存修改' : lastSavedAt ? '已保存 · ' + new Date(lastSavedAt).toLocaleTimeString() : '' }}
            </span>
            <button class="btn btn--primary" type="button" :disabled="saving" @click="save()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {{ saving ? '保存中…' : '保存配置' }}
            </button>
          </div>
        </div>
        <p class="lede">配置前台首页展示的名称、人物 title 与代码框内容，保存后即时生效。</p>
        <p class="hero-note">每 20s 自动保存 · Ctrl + S 立即保存 · 数据持久化于后端</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== Settings ===== -->
    <div v-else class="settings-wrap">
      <form class="settings-card" @submit.prevent>
        <!-- 首页名称 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="fName">首页名称</label>
            <button class="btn btn--link" type="button" @click="previewOpen = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path></svg>
              实时预览
            </button>
          </div>
          <input
            id="fName"
            v-model="form.siteName"
            class="form-input"
            type="text"
            maxlength="120"
            placeholder="如：INKHEAP"
            autocomplete="off"
          />
          <p class="field-hint">展示在首页标题与浏览器页签，前端数据由后台驱动。</p>
        </div>

        <!-- 人物 Title -->
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="fTitle">人物 Title</label>
          </div>
          <input
            id="fTitle"
            v-model="form.personTitle"
            class="form-input"
            type="text"
            maxlength="240"
            placeholder="如：Digital Gardener & Lifelong Learner"
            autocomplete="off"
          />
          <p class="field-hint">首页人物头像 / 署名下方的副标题。</p>
        </div>

        <!-- 代码框内容 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="fCode">代码框内容</label>
            <button class="btn btn--link" type="button" @click="resetCode">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              还原
            </button>
          </div>
          <textarea
            id="fCode"
            v-model="form.codeContent"
            class="form-input form-textarea"
            rows="10"
            :maxlength="CODE_MAX"
            placeholder="支持多行文本，如终端风格的介绍代码"
          ></textarea>
          <div class="field-foot">
            <span class="form-foot-hint">首页终端 / 代码框内的正文；首行的 <code>$</code> 会作为提示符渲染。</span>
            <span class="char-count" :class="{ warn: codeWarn }">{{ codeCount }} / {{ CODE_MAX }}</span>
          </div>
        </div>

        <!-- 首页头像 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label">首页头像</label>
          </div>
          <div class="avatar-uploader">
            <div class="avatar-preview" :class="{ 'has-image': form.avatar }" aria-hidden="true">
              <img v-if="form.avatar" :src="api.assetUrl(form.avatar)" alt="头像预览" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div class="avatar-actions">
              <label class="btn btn--ghost" :class="{ 'is-loading': uploading }">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
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
                class="btn btn--link btn--danger"
                type="button"
                :disabled="uploading"
                @click="removeAvatar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>
                移除头像
              </button>
            </div>
          </div>
          <p class="field-hint">支持 png / jpeg / gif / webp，最大 5MB；保存后回显到前台首页。</p>
        </div>
      </form>
    </div>

    <!-- ===== 实时预览抽屉 ===== -->
    <transition name="drawer-fade">
      <div v-if="previewOpen" class="drawer-mask" @click="previewOpen = false"></div>
    </transition>
    <transition name="drawer-slide">
      <aside v-if="previewOpen" class="preview-drawer">
        <div class="drawer-head">
          <span class="drawer-title">实时预览</span>
          <button class="drawer-close" title="关闭预览" @click="previewOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div ref="drawerBodyRef" class="drawer-body">
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
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.autosave-status {
  font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);
  white-space: nowrap;
}
.autosave-status.dirty { color: var(--accent); font-weight: 500; }

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
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--link {
  background: transparent; color: var(--accent);
  padding: 4px 10px; font-size: 13px; border-color: transparent;
}
.btn--link:hover { background-color: var(--accent-light); }
.btn--link:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--link.btn--danger { color: #e0533d; }
.btn--link.btn--danger:hover { background-color: #fdf1ef; color: #c7442f; }
:global([data-theme='dark']) .btn--link.btn--danger:hover { background-color: #33211e; }

/* ===== Settings card ===== */
.settings-wrap { margin: 22px 0 8px; }
.settings-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 8px 4px;
}
.field {
  padding: 22px 26px; border-bottom: 1px solid var(--border-light);
}
.field:last-child { border-bottom: none; }
.field-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
}
.field-label {
  font-family: var(--font-serif); font-size: 16px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
}
.field-hint {
  font-size: 12.5px; color: var(--text-tertiary); margin: 8px 0 0;
  font-family: var(--font-mono);
}

/* Inputs */
.form-input {
  display: block; width: 100%;
  font-family: var(--font-sans); font-size: 14.5px; color: var(--text-primary);
  background-color: var(--bg-soft); border: 1px solid transparent;
  border-radius: var(--radius-sm); padding: 12px 14px;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
  outline: none;
}
.form-input::placeholder { color: var(--text-tertiary); }
.form-input:hover { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.form-input:focus {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.form-textarea {
  font-family: var(--font-mono); font-size: 13.5px; line-height: 1.85;
  resize: vertical; min-height: 220px;
}
.field-foot {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; gap: 10px; flex-wrap: wrap;
}
.form-foot-hint { font-size: 12.5px; color: var(--text-tertiary); font-family: var(--font-mono); }
.form-foot-hint code {
  font-family: var(--font-mono); color: var(--accent);
  background-color: var(--accent-light); border-radius: 4px; padding: 1px 6px;
}
.char-count {
  font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);
  padding: 3px 10px; border-radius: 100px; background-color: var(--bg-soft);
}
.char-count.warn { color: var(--accent); }

/* Avatar uploader */
.avatar-uploader {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
}
.avatar-preview {
  width: 76px; height: 76px; border-radius: 50%; flex-shrink: 0;
  background: var(--bg-soft); border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; color: var(--text-tertiary);
  transition: border-color var(--transition);
}
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar-preview.has-image { border-color: var(--accent); }
.avatar-preview svg { width: 32px; height: 32px; }
.avatar-actions {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
}
.btn--ghost.is-loading { opacity: 0.6; pointer-events: none; }

/* ===== Loading ===== */
.empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
  box-shadow: var(--shadow-lg);
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
  border-bottom: 1px solid var(--border-light);
}
.drawer-title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  padding-left: 14px;
  position: relative;
}
.drawer-title::before {
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
.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--transition);
}
.drawer-close:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}
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
  .hero-side { width: 100%; justify-content: space-between; }
  .field { padding: 18px; }
  .form-textarea { min-height: 180px; }
  .avatar-uploader { gap: 14px; }
  .drawer-body { padding: 14px; }
}
</style>
