<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '@/composables/useApi'
import { useSiteIdentity } from '@/composables/useSiteIdentity'
import MarkdownSplitEditor from '@/components/MarkdownSplitEditor.vue'
import ThemeSelect from '@/components/ThemeSelect.vue'

const router = useRouter()
const route = useRoute()
const api = useApi()

// 站点身份：作者留空时前台回退展示的名称
const { siteName, loadSiteIdentity } = useSiteIdentity()

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
  author: '',
  authorUrl: '',
  published: false,
  featured: false,
  viewCount: 0,
  virtualViewCount: null,
})

const tagInput = ref('')
const categories = ref([])

/* 分类下拉选项（ThemeSelect）：label 显示完整路径（父 / 子），搜索仅匹配分类名 */
const RECENT_CATEGORY_COUNT = 5

// key -> 分类映射，用于沿 parentKey 回溯祖先名称
const categoryByKey = computed(() => new Map(categories.value.map((c) => [c.key, c])))

// 完整路径：如「前端 / Vue」（含自身名称），带循环引用保护
function categoryPath(cat) {
  const names = []
  let cur = cat
  const seen = new Set()
  while (cur && !seen.has(cur.key)) {
    seen.add(cur.key)
    names.unshift(cur.name)
    cur = categoryByKey.value.get(cur.parentKey)
  }
  return names.join(' / ')
}

// 相对创建时间（用于「最近使用」分组的 desc）
function relativeCreatedTime(iso) {
  const t = new Date(iso).getTime()
  if (!t) return ''
  const days = Math.floor((Date.now() - t) / 86400000)
  if (days <= 0) return '今天创建'
  if (days < 30) return `${days} 天前创建`
  if (days < 365) return `${Math.floor(days / 30)} 个月前创建`
  return `${Math.floor(days / 365)} 年前创建`
}

// 最近使用的分类：后端 Redis 全站共享，文章保存成功后置顶（Redis 不可用时按文章数据推导）
const recentCategories = ref([])

async function loadRecentCategories() {
  try {
    recentCategories.value = (await api.get('/admin/categories/recent')) || []
  } catch (e) { /* ignore */ }
}

const categorySelectOptions = computed(() => {
  // 按路径排序，父分类与其子分类自然相邻，呈现树状分组效果
  const all = categories.value
    .map((cat) => ({
      value: cat.key,
      label: categoryPath(cat),
      searchText: cat.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh'))
  // 分类总数不多于回显条数时，最近列表与全量完全重复，直接展示全量
  if (categories.value.length <= RECENT_CATEGORY_COUNT) return all
  const recent = recentCategories.value
    .slice(0, RECENT_CATEGORY_COUNT)
    .map((cat) => ({
      value: cat.key,
      label: categoryPath(cat),
      searchText: cat.name,
      desc: relativeCreatedTime(cat.createdAt),
    }))
  if (!recent.length) return all
  return [{ header: '最近使用' }, ...recent, { header: '全部分类' }, ...all]
})

onMounted(async () => {
  loadSiteIdentity()
  try {
    categories.value = await api.get('/admin/categories')
  } catch (e) { /* ignore */ }
  loadRecentCategories()

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
        author: article.author || '',
        authorUrl: article.authorUrl || '',
        published: article.published,
        featured: article.featured,
        viewCount: article.viewCount ?? 0,
        virtualViewCount: article.virtualViewCount ?? null,
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

// 生成一张随机占位封面（seed 决定图片，换 seed 即换图）
function randomCover() {
  form.value.coverImage = `https://picsum.photos/seed/${Date.now()}/600/400`
}

// 移除封面：真正清空封面地址（保存后前台回退为标题文字封面），不再自动补随机占位图
function removeCover() {
  form.value.coverImage = ''
}

/* ===== 摘要自动生成：后端读取正文内容，调用已启用的 LLM 生成摘要 ===== */
const generating = ref(false)

async function generateSummary() {
  if (!form.value.content.trim()) {
    showToast('请先填写正文内容，再生成摘要', 'error')
    return
  }
  generating.value = true
  try {
    const res = await api.post('/admin/articles/generate-summary', {
      content: form.value.content,
      title: form.value.title,
    })
    const summary = (res?.summary || '').trim()
    if (!summary) {
      showToast('生成结果为空，请重试', 'error')
      return
    }
    form.value.summary = summary
    showToast('摘要已生成', 'success')
  } catch (e) {
    showToast('生成摘要失败: ' + e.message, 'error')
  } finally {
    generating.value = false
  }
}

/* ===== 正文预览：由 MarkdownSplitEditor 分栏实时渲染（左编辑 / 右预览） ===== */

async function handleSave() {
  if (!form.value.title || !form.value.content || !form.value.categoryKey) {
    showToast('请填写标题、内容和分类', 'error')
    return
  }
  if (!form.value.slug) autoSlug()

  const payload = { ...form.value }
  // 真实阅读量由后端按 IP 统计，前端只读，不参与提交
  delete payload.viewCount
  // 清空输入框会得到空字符串，统一转成 null（= 未设置，前台回到展示真实阅读量）
  if (
    payload.virtualViewCount === '' ||
    payload.virtualViewCount === null ||
    Number.isNaN(payload.virtualViewCount)
  ) {
    payload.virtualViewCount = null
  }

  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/admin/articles/${route.params.id}`, payload)
      showToast('文章已更新', 'success')
      // 编辑更新后停留当前页，方便继续修改；刷新最近使用列表（本次使用的分类置顶）
      loadRecentCategories()
    } else {
      await api.post('/admin/articles', payload)
      showToast('文章已创建', 'success')
      loadRecentCategories()
      // 新建保存后返回列表
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
    <transition name="toast-pop">
      <div v-if="toast" class="toast" :class="toastType" role="status" aria-live="polite">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        <span>{{ toast }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <button class="btn-back" @click="goBack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12,19 5,12 12,5"/>
          </svg>
          返回列表
        </button>
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">Articles · {{ isEdit ? '编辑' : '新建' }}</span>
            <h1>{{ isEdit ? '编辑文章' : '新建文章' }}</h1>
          </div>
          <div class="hero-side">
            <span v-if="saving" class="saving-hint">保存中…</span>
            <button class="btn btn--primary" @click="handleSave" :disabled="saving">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {{ saving ? '保存中…' : (isEdit ? '更新文章' : '发布文章') }}
            </button>
          </div>
        </div>
        <p class="lede">撰写 Markdown 正文，配置分类、标签与封面，保存后即时生效。</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="loading-wrap">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <div v-else class="edit-body">
      <!-- ===== 左：表单 ===== -->
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
            <input v-model="form.author" type="text" :placeholder="`留空则使用站点名称（${siteName}）`" />
          </div>
        </div>

        <div class="field">
          <label>作者链接</label>
          <input v-model="form.authorUrl" type="text" placeholder="作者主页链接，留空则点击作者跳转站点首页" />
          <p class="field-hint">前台文章列表中，作者名会作为超链接跳转到该地址；填写站外地址时新窗口打开。</p>
        </div>

        <div class="field-row">
          <div class="field flex-1">
            <label>分类 <span class="req">*</span></label>
            <ThemeSelect
              v-model="form.categoryKey"
              placeholder="选择分类"
              aria-label="选择分类"
              :options="categorySelectOptions"
              searchable
              search-placeholder="搜索分类"
            />
          </div>
          <div class="field flex-1">
            <label>封面图 URL</label>
            <input v-model="form.coverImage" type="text" placeholder="https://..." />
            <button type="button" class="btn-random-cover" @click="randomCover">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              随机图片
            </button>
          </div>
        </div>

        <div class="field">
          <div class="editor-label">
            <span>摘要</span>
            <button
              type="button"
              class="btn-preview"
              :disabled="generating"
              :title="generating ? '正在生成…' : '读取正文内容，使用 AI 自动生成摘要'"
              @click="generateSummary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z"></path><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"></path></svg>
              {{ generating ? '生成中…' : '自动生成' }}
            </button>
          </div>
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
          <div class="editor-label">
            <span>正文 <span class="req">*</span></span>
            <span class="md-badge">Markdown · 左编辑右预览</span>
          </div>
          <MarkdownSplitEditor
            v-model="form.content"
            placeholder="在此用 Markdown 撰写正文，支持 ``` 代码块 ..."
            min-height="440px"
          />
        </div>

        <div class="field-row">
          <div class="field flex-1">
            <label>虚拟阅读量</label>
            <input
              v-model.number="form.virtualViewCount"
              type="number"
              min="0"
              placeholder="留空则展示真实阅读量"
            />
          </div>
          <div class="field flex-1">
            <label>&nbsp;</label>
            <p class="field-hint">
              真实阅读 {{ form.viewCount ?? 0 }} 次（按 IP 每天去重）
              <template v-if="form.virtualViewCount !== null && form.virtualViewCount !== ''">
                <br />前台将展示 {{ form.virtualViewCount }}
              </template>
            </p>
          </div>
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

      <!-- ===== 右：封面预览 ===== -->
      <div class="form-side">
        <div class="side-title">封面图预览</div>
        <div class="cover-preview" v-if="form.coverImage">
          <img :src="form.coverImage" alt="封面图" />
          <button class="btn-remove-cover" @click="removeCover">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
            移除封面
          </button>
        </div>
        <div v-else class="cover-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <p>填入封面图 URL 后在此预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-edit { position: relative; }

/* ===== Hero ===== */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 24px 28px 24px;
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
.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  margin-bottom: 14px; font-size: 13px; font-weight: 500;
  color: var(--accent); background: none; border: none;
  cursor: pointer; padding: 4px 0;
  font-family: var(--font-mono);
  transition: opacity var(--transition);
}
.btn-back:hover { opacity: 0.75; text-decoration: underline; }
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
  font-family: var(--font-serif); font-size: 34px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.lede { font-size: 15px; color: var(--text-secondary); max-width: 680px; margin: 10px 0 0; }
.hero-side {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.saving-hint {
  font-family: var(--font-mono); font-size: 12.5px; color: var(--accent);
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

/* ===== Loading ===== */
.loading-wrap {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 80px 0; color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Body ===== */
.edit-body {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  margin: 24px 0 8px;
}
.form-main { flex: 1; min-width: 0; }
.form-side { width: 260px; flex-shrink: 0; position: sticky; top: 12px; }

/* 右栏标题 */
.side-title {
  font-family: var(--font-serif); font-size: 15px; font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  padding-left: 14px; position: relative;
  margin-bottom: 12px;
}
.side-title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 15px; border-radius: 4px; background-color: var(--accent);
}

/* ===== Fields ===== */
.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 16px;
}
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.req { color: #e0533d; margin-left: 2px; }

.field input,
.field select,
.field textarea {
  padding: 11px 14px;
  font-size: 14px;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
  resize: vertical;
}
.field input::placeholder,
.field textarea::placeholder { color: var(--text-tertiary); }
.field input:hover,
.field textarea:hover {
  background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%);
}
/* ThemeSelect 分类下拉 */
.field :deep(.tsel) { width: 100%; display: flex; }
.field :deep(.tsel__trigger) {
  width: 100%; padding: 11px 14px; font-size: 14px; color: var(--text-primary);
  background: var(--bg-soft); border-color: transparent; border-radius: var(--radius-sm);
}
.field :deep(.tsel__trigger:hover:not(:disabled)) { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.field :deep(.tsel.open .tsel__trigger) {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.field input:focus,
.field select:focus,
.field textarea:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.field-row { display: flex; gap: 16px; }
.flex-1 { flex: 1; min-width: 0; }
.field-hint {
  margin: 0;
  padding-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);
}

/* 正文编辑器标签：左侧标题 + 右侧（Markdown 徽标）同行两端对齐 */
.editor-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 「实时预览」按钮：次要操作，样式对齐「首页管理」的 .btn--link */
.btn-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-preview svg { width: 15px; height: 15px; flex-shrink: 0; }
.btn-preview:hover { background-color: var(--accent-light); }
.btn-preview:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn-preview:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-preview:disabled:hover { background-color: transparent; }
.md-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: var(--accent-light);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px;
  padding: 2px 10px;
}

/* ===== Markdown 编辑器：由 MarkdownSplitEditor 组件提供（深色编辑 + 右侧实时预览） ===== */

/* ===== Tags ===== */
.tags-input {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 7px 12px;
  background: var(--bg-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  min-height: 42px;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.tags-input:hover { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.tags-input:focus-within {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.tags-input input {
  border: none;
  outline: none;
  font-size: 13px;
  font-family: var(--font-sans);
  background: transparent;
  flex: 1;
  min-width: 120px;
  padding: 4px 0;
  color: var(--text-primary);
}
.tags-input input::placeholder { color: var(--text-tertiary); }
.tags-list { display: flex; flex-wrap: wrap; gap: 4px; }
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--accent-light);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
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

/* ===== Toggles ===== */
.toggle-row { align-items: center; }
.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}
.toggle-label input { display: none; }
.toggle-label input + span {
  width: 42px;
  height: 23px;
  border-radius: 100px;
  background: var(--border);
  position: relative;
  transition: background var(--transition);
  flex-shrink: 0;
}
.toggle-label input + span::after {
  content: '';
  position: absolute;
  top: 2.5px;
  left: 2.5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-label input:checked + span { background: var(--accent); }
.toggle-label input:checked + span::after { transform: translateX(19px); }

/* ===== Cover ===== */
.cover-preview {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.cover-preview img {
  width: 100%;
  aspect-ratio: 16/10;
  object-fit: cover;
  display: block;
}
.btn-remove-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px;
  font-size: 12.5px;
  font-weight: 500;
  color: #e0533d;
  background: #fdf1ef;
  border: none;
  border-top: 1px solid #f3c9c2;
  cursor: pointer;
  transition: background-color var(--transition);
}
.btn-remove-cover:hover { background: #f9e2de; }

/* 封面图 URL 下方的「随机图片」按钮：与输入框同宽，弱化的次要操作 */
.btn-random-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}
.btn-random-cover:hover {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}
:global([data-theme='dark']) .btn-remove-cover { background: #2a1a17; border-top-color: #4a2a24; }
:global([data-theme='dark']) .btn-remove-cover:hover { background: #33211e; }

.cover-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 16px;
  background: var(--bg-card);
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
}
.cover-placeholder svg { width: 34px; height: 34px; opacity: 0.45; }
.cover-placeholder p {
  font-size: 12.5px; margin: 0;
  font-family: var(--font-mono);
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
@media (max-width: 860px) {
  .page-hero { padding: 18px; }
  .page-hero h1 { font-size: 28px; }
  .hero-side { width: 100%; }
  .edit-body { flex-direction: column; }
  .form-side { width: 100%; position: static; }
  .field-row { flex-direction: column; }
}
</style>
