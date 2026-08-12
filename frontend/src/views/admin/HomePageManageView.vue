<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

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

// 实时预览用的派生值
const preview = ref({
  siteName: '',
  personTitle: '',
  codeContent: '',
  avatar: '',
})

async function load() {
  loading.value = true
  try {
    const data = await api.get('/admin/home-page')
    form.value = {
      siteName: data.siteName ?? '',
      personTitle: data.personTitle ?? '',
      codeContent: data.codeContent ?? '',
      avatar: data.avatar ?? '',
    }
    uploadedFileId.value = ''
    syncPreview()
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function syncPreview() {
  preview.value = { ...form.value, avatar: api.assetUrl(form.value.avatar) }
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
    syncPreview()
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
    syncPreview()
    showToast('头像已移除', 'success')
  } catch (err) {
    showToast('移除失败: ' + err.message, 'error')
  }
}

async function save() {
  saving.value = true
  try {
    const payload = {
      siteName: form.value.siteName.trim(),
      personTitle: form.value.personTitle.trim(),
      codeContent: form.value.codeContent,
      avatar: form.value.avatar || null,
    }
    await api.put('/admin/home-page', payload)
    syncPreview()
    showToast('首页配置已保存', 'success')
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function resetCode() {
  form.value.codeContent = preview.value.codeContent
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(load)
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
      </div>
      <button class="btn-primary" :disabled="saving" @click="save">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
        {{ saving ? '保存中…' : '保存配置' }}
      </button>
    </div>

    <div v-if="loading" class="empty">加载中…</div>

    <div v-else class="manage-grid">
      <!-- 表单 -->
      <section class="panel">
        <div class="form-field">
          <label>首页名称</label>
          <input
            v-model="form.siteName"
            type="text"
            maxlength="120"
            placeholder="如：INKHEAP"
            @input="syncPreview"
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
            @input="syncPreview"
          />
          <small class="hint">首页人物头像/署名下方的副标题</small>
        </div>

        <div class="form-field">
          <label>代码框内容</label>
          <textarea
            v-model="form.codeContent"
            rows="12"
            placeholder="支持多行文本，如终端风格的介绍代码"
            @input="syncPreview"
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

      <!-- 实时预览 -->
      <section class="panel preview-panel">
        <div class="preview-head">实时预览</div>
        <div class="preview-card">
          <div class="preview-site">{{ preview.siteName || 'INKHEAP' }}</div>
          <div class="preview-person">
            <div class="avatar">
              <img v-if="preview.avatar" :src="preview.avatar" alt="头像预览" />
              <span v-else>👤</span>
            </div>
            <div class="preview-title">{{ preview.personTitle || '人物 Title' }}</div>
          </div>
          <div class="preview-terminal">
            <div class="term-bar"><span></span><span></span><span></span></div>
            <pre class="term-body">{{ preview.codeContent || '// 代码框内容预览' }}</pre>
          </div>
        </div>
      </section>
    </div>
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
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}
@media (max-width: 980px) {
  .manage-grid { grid-template-columns: 1fr; }
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.form-field { margin-bottom: 18px; display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
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

/* ===== Preview ===== */
.preview-head { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 14px; }
.preview-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  background: var(--bg-body);
}
.preview-site { font-size: 24px; font-weight: 800; letter-spacing: 2px; color: var(--text-primary); margin-bottom: 18px; }
.preview-person { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--bg-soft);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
  border: 1px solid var(--border);
  overflow: hidden;
  flex-shrink: 0;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.preview-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.preview-terminal {
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0d1117;
}
.term-bar { display: flex; gap: 6px; padding: 8px 12px; background: #161b22; }
.term-bar span { width: 10px; height: 10px; border-radius: 50%; background: #ff5f56; }
.term-bar span:nth-child(2) { background: #ffbd2e; }
.term-bar span:nth-child(3) { background: #27c93f; }
.term-body {
  margin: 0;
  padding: 14px 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #9cdcfe;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 120px;
}

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
