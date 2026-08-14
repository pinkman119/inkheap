<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const route = useRoute()
const api = useApi()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const toast = ref('')
const toastType = ref('success')

const form = ref({
  title: '',
  slug: '',
  summary: '',
  content: '',
  coverImage: '',
  categoryKey: '',
  tags: [],
  author: '墨堆',
  published: false,
  featured: false,
})

const tagInput = ref('')
const categories = ref([])

onMounted(async () => {
  try {
    categories.value = await api.get('/admin/categories')
  } catch (e) { /* ignore */ }

  if (isEdit.value) {
    loading.value = true
    try {
      const article = await api.get(`/admin/articles/${route.params.id}`)
      form.value = {
        title: article.title,
        slug: article.slug,
        summary: article.summary || '',
        content: article.content,
        coverImage: article.coverImage || '',
        categoryKey: article.categoryKey,
        tags: article.tags || [],
        author: article.author,
        published: article.published,
        featured: article.featured,
      }
    } catch (e) {
      showToast('加载文章失败: ' + e.message, 'error')
    } finally {
      loading.value = false
    }
  }
})

function autoSlug() {
  if (!isEdit.value || !form.value.slug) {
    form.value.slug = form.value.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)
  }
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t)
    tagInput.value = ''
  }
}

function removeTag(t) {
  form.value.tags = form.value.tags.filter(x => x !== t)
}

function removeCover() {
  form.value.coverImage = ''
}

async function handleSave() {
  if (!form.value.title || !form.value.content || !form.value.categoryKey) {
    showToast('请填写标题、内容和分类', 'error')
    return
  }
  if (!form.value.slug) autoSlug()

  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/admin/articles/${route.params.id}`, form.value)
      showToast('文章已更新', 'success')
    } else {
      await api.post('/admin/articles', form.value)
      showToast('文章已创建', 'success')
      setTimeout(() => router.push({ name: 'admin-articles' }), 800)
    }
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function showToast(msg, type = 'success') {
  toast.value = msg
  toastType.value = type
  setTimeout(() => { toast.value = '' }, 3000)
}

function goBack() {
  router.push({ name: 'admin-articles' })
}
</script>

<template>
  <div class="article-edit">
    <transition name="fade">
      <div v-if="toast" class="toast" :class="toastType">{{ toast }}</div>
    </transition>

    <!-- Header -->
    <div class="edit-header">
      <button class="btn-back" @click="goBack">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
        </svg>
        返回列表
      </button>
      <div class="header-actions">
        <span v-if="saving" class="saving-hint">保存中...</span>
        <button class="btn-save" @click="handleSave" :disabled="saving">
          {{ isEdit ? '更新文章' : '发布文章' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap">
      <p>加载中...</p>
    </div>

    <div v-else class="edit-body">
      <!-- 左：表单 -->
      <div class="form-main">
        <div class="field">
          <label>标题 <span class="req">*</span></label>
          <input v-model="form.title" type="text" placeholder="输入文章标题" @change="autoSlug" />
        </div>

        <div class="field-row">
          <div class="field flex-1">
            <label>Slug</label>
            <input v-model="form.slug" type="text" placeholder="url-friendly-slug" />
          </div>
          <div class="field flex-1">
            <label>作者</label>
            <input v-model="form.author" type="text" placeholder="墨堆" />
          </div>
        </div>

        <div class="field-row">
          <div class="field flex-1">
            <label>分类 <span class="req">*</span></label>
            <select v-model="form.categoryKey">
              <option value="" disabled>选择分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.key">
                {{ cat.parentKey ? '  ' : '' }}{{ cat.name }}
              </option>
            </select>
          </div>
          <div class="field flex-1">
            <label>封面图 URL</label>
            <input v-model="form.coverImage" type="text" placeholder="https://..." />
          </div>
        </div>

        <div class="field">
          <label>摘要</label>
          <textarea v-model="form.summary" rows="2" placeholder="文章摘要，用于列表展示..."></textarea>
        </div>

        <div class="field">
          <label>标签</label>
          <div class="tags-input">
            <div class="tags-list">
              <span v-for="t in form.tags" :key="t" class="tag-chip">
                {{ t }}
                <button class="tag-remove" @click="removeTag(t)">&times;</button>
              </span>
            </div>
            <input
              v-model="tagInput"
              type="text"
              placeholder="输入标签后回车"
              @keyup.enter.prevent="addTag"
            />
          </div>
        </div>

        <div class="field">
          <label class="editor-label">
            <span>正文 <span class="req">*</span></span>
            <span class="md-badge">Markdown</span>
          </label>
          <textarea
            v-model="form.content"
            class="content-editor"
            rows="18"
            spellcheck="false"
            placeholder="在此用 Markdown 撰写正文，支持 ``` 代码块 ..."
          ></textarea>
        </div>

        <div class="field-row toggle-row">
          <label class="toggle-label">
            <input type="checkbox" v-model="form.published" />
            <span></span>
            发布
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="form.featured" />
            <span></span>
            精选
          </label>
        </div>
      </div>

      <!-- 右：封面预览 -->
      <div class="form-side">
        <div class="cover-preview" v-if="form.coverImage">
          <img :src="form.coverImage" alt="封面图" />
          <button class="btn-remove-cover" @click="removeCover">移除封面</button>
        </div>
        <div v-else class="cover-placeholder">
          <span>📷</span>
          <p>封面图预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-edit { max-width: 1200px; }

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  padding: 12px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  box-shadow: var(--shadow-md);
}
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }

/* Header */
.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
}
.btn-back:hover { color: var(--accent); }

.header-actions { display: flex; align-items: center; gap: 12px; }
.saving-hint { font-size: 13px; color: var(--text-tertiary); }

.btn-save {
  height: 38px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

.loading-wrap { text-align: center; padding: 80px 0; color: var(--text-tertiary); }

/* Body */
.edit-body {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.form-main { flex: 1; min-width: 0; }
.form-side { width: 260px; flex-shrink: 0; position: sticky; top: 32px; }

/* Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.req { color: #e03131; margin-left: 2px; }

.field input,
.field select,
.field textarea {
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition);
  resize: vertical;
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.field-row { display: flex; gap: 16px; }
.flex-1 { flex: 1; }

/* 正文编辑器标签：标题 + Markdown 徽标 同行右对齐 */
.editor-label {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.md-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--accent);
  background: var(--accent-light);
  border: 1px solid var(--accent);
  border-radius: 100px;
  padding: 1px 8px;
}

/* ===== Markdown 编辑器：深色代码主体 ===== */
.content-editor {
  font-family: var(--font-mono) !important;
  font-size: 13px !important;
  line-height: 1.7;
  min-height: 420px;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;

  /* 深色主体 —— One Dark Pro（!important 覆盖 .field textarea 的基础背景/边框） */
  color: #abb2bf !important;
  background-color: #282c34 !important;
  border: 1px solid #181a1f !important;
  border-radius: var(--radius-md);
  caret-color: #61afef;
}
:root[data-theme='dark'] .content-editor {
  background-color: #282c34 !important;
  border-color: #181a1f !important;
  color: #abb2bf !important;
}

/* 聚焦：保持深色，边框/光晕改用 One Dark 蓝，不再套浅色阴影 */
.content-editor:focus {
  border-color: #61afef;
  box-shadow: 0 0 0 3px rgba(97, 175, 239, 0.18);
}

/* 占位符 */
.content-editor::placeholder {
  color: #5c6370;
  opacity: 1;
}

/* 选区 */
.content-editor::selection {
  background-color: rgba(97, 175, 239, 0.32);
  color: #ffffff;
}

/* 自定义滚动条（One Dark Pro） */
.content-editor::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.content-editor::-webkit-scrollbar-track {
  background: transparent;
}
.content-editor::-webkit-scrollbar-thumb {
  background: #3a3f4b;
  border-radius: 100px;
  border: 2px solid #282c34;
}
.content-editor::-webkit-scrollbar-thumb:hover {
  background: #4b5263;
}
.content-editor {
  scrollbar-color: #3a3f4b #282c34;
  scrollbar-width: thin;
}

/* Tags */
.tags-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 38px;
}
.tags-input:focus-within { border-color: var(--accent); }
.tags-input input {
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
  flex: 1;
  min-width: 120px;
  padding: 4px 0;
}
.tags-list { display: flex; flex-wrap: wrap; gap: 4px; }
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 100px;
}
.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}
.tag-remove:hover { opacity: 1; }

/* Toggles */
.toggle-row { align-items: center; }
.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}
.toggle-label input { display: none; }
.toggle-label input + span {
  width: 40px;
  height: 22px;
  border-radius: 100px;
  background: var(--border);
  position: relative;
  transition: background var(--transition);
}
.toggle-label input + span::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-label input:checked + span { background: var(--accent); }
.toggle-label input:checked + span::after { transform: translateX(18px); }

/* Cover */
.cover-preview {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}
.cover-preview img {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: cover;
  display: block;
}
.btn-remove-cover {
  display: block;
  width: 100%;
  padding: 8px;
  font-size: 12px;
  color: #e03131;
  background: #fff5f5;
  border: none;
  cursor: pointer;
}
.btn-remove-cover:hover { background: #ffe3e3; }

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  background: var(--bg-card);
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
}
.cover-placeholder span { font-size: 36px; margin-bottom: 8px; opacity: 0.4; }
.cover-placeholder p { font-size: 13px; margin: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
