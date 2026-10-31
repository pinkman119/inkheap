<template>
  <div class="xj-edit">
    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <router-link class="back-link" :to="{ name: 'admin-xiaoji' }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          返回列表
        </router-link>
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">Xiaoji · {{ isNew ? '新建' : '编辑' }}</span>
            <h1>{{ isNew ? '新建小记' : '编辑小记' }}</h1>
          </div>
          <div class="hero-side">
            <span v-if="saving" class="saving-hint">保存中…</span>
            <span v-else-if="lastSavedAtText" class="saving-hint">上次保存 {{ lastSavedAtText }}</span>
            <router-link class="btn btn--ghost" :to="{ name: 'admin-xiaoji' }">取消</router-link>
            <button class="btn btn--primary" :disabled="saving" @click="save" title="快捷键：Ctrl + S">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
        <p class="lede">照片上传：相册不限张数，随笔最多 9 张；第一张作为列表封面。</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="loading-box">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <div v-else class="edit-grid">
      <!-- ===== 左列：主体信息 ===== -->
      <section class="card col-main">
        <div class="card__body">
          <div class="field">
            <label class="field-label">类型</label>
            <div class="seg">
              <button class="seg__item" :class="{ active: form.type === 'album' }" @click="setType('album')">相册</button>
              <button class="seg__item" :class="{ active: form.type === 'essay' }" @click="setType('essay')">随笔</button>
            </div>
          </div>

          <div class="field">
            <label class="field-label">标题 <span class="req">*</span></label>
            <input v-model="form.title" type="text" placeholder="输入小记标题" @change="autoSlug" />
          </div>

          <div class="field">
            <label class="field-label">Slug</label>
            <input v-model="form.slug" type="text" placeholder="url-friendly-slug（留空自动生成）" />
          </div>

          <div class="field-row">
            <div class="field flex-1">
              <label class="field-label">地点（来自足迹）</label>
              <ThemeSelect v-model="form.footprintId" aria-label="地点（来自足迹）" :options="footprintSelectOptions" />
              <p v-if="footprintTakenByOther" class="field-hint field-hint--warn">
                该足迹当前绑定在小记《{{ selectedFootprint.blog?.title || '其他小记' }}》上，保存后将改绑到本篇。
              </p>
              <p v-else-if="selectedFootprint" class="field-hint">
                保存后「关于我」页面的足迹卡片将可点击跳转到本篇小记。
              </p>
            </div>
            <div class="field flex-1">
              <label class="field-label">日期</label>
              <input v-model="form.date" type="text" placeholder="如：2025-10-03" />
            </div>
          </div>

          <div class="field">
            <label class="field-label">分类（输入新名称将自动创建）</label>
            <div class="tags-input">
              <span v-for="t in form.tags" :key="t" class="tag-chip">
                {{ t }}
                <button class="tag-remove" @click="removeTag(t)">&times;</button>
              </span>
              <input
                v-model="tagInput"
                type="text"
                placeholder="输入分类后回车"
                @keyup.enter.prevent="addTag"
                @blur="commitTag"
              />
            </div>
          </div>

          <div class="field">
            <div class="label-row">
              <label class="field-label">摘要</label>
              <button
                class="ai-btn"
                type="button"
                :disabled="!form.content.trim() || generatingSummary"
                :title="form.content.trim() ? '根据正文内容 AI 自动生成摘要' : '请先填写正文'"
                @click="generateSummary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>
                {{ generatingSummary ? '生成中…' : 'AI 生成' }}
              </button>
            </div>
            <textarea v-model="form.summary" rows="2" placeholder="列表展示的摘要文字；可点击右上角按钮由 AI 根据正文生成"></textarea>
          </div>

          <div v-if="form.type === 'essay'" class="field">
            <label class="field-label">引文（可选，随笔封面）</label>
            <textarea v-model="form.quote" rows="2" placeholder="一段有味道的引文；随笔封面优先显示它，未填写时显示标题"></textarea>
          </div>

          <div class="field">
            <label class="field-label">正文（Markdown，左编辑右预览） <span class="req">*</span></label>
            <MarkdownSplitEditor
              v-model="form.content"
              placeholder="支持 Markdown 语法，与文章一致"
              min-height="380px"
            />
          </div>

          <div class="field">
            <label class="field-label">虚拟阅读量</label>
            <input
              v-model.number="form.virtualViewCount"
              type="number"
              min="0"
              placeholder="留空则展示真实阅读量"
            />
            <p class="field-hint">
              真实阅读 {{ form.viewCount ?? 0 }} 次（按 IP 每天去重统计）
              <template v-if="form.virtualViewCount !== null && form.virtualViewCount !== ''">
                <br />前台将展示 {{ form.virtualViewCount }}
              </template>
            </p>
          </div>

          <div class="field toggle-row">
            <label class="toggle-label">
              <input type="checkbox" v-model="form.published" /><span></span> 发布（勾选后前台可见）
            </label>
          </div>
        </div>
      </section>

      <!-- ===== 右列：照片管理 ===== -->
      <section class="card col-side">
        <div class="card__head">
          <span class="card__head-title">照片管理（{{ form.photos.length }}{{ form.type === 'essay' ? '/9' : '' }}）</span>
          <label class="btn btn--soft btn--sm upload-btn" :class="{ disabled: photoLimitReached }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            上传
            <input ref="fileInput" type="file" multiple accept="image/*" :disabled="photoLimitReached" @change="onUpload" />
          </label>
        </div>
        <div class="photo-list">
          <div v-if="!form.photos.length" class="photo-empty">
            暂无照片。相册不限张数，随笔最多 9 张；第一张将作为列表封面。
          </div>
          <div v-for="(p, i) in form.photos" :key="p.url + '-' + i" class="photo-item">
            <span class="photo-index">{{ i + 1 }}</span>
            <img class="photo-item__img" :src="assetUrl(p.url)" alt="" />
            <div class="photo-item__body">
              <input
                v-model="p.caption"
                class="photo-item__cap"
                type="text"
                :placeholder="`照片 ${i + 1} 说明`"
              />
              <div class="photo-item__ops">
                <button class="link" :disabled="i === 0" @click="movePhoto(i, -1)">上移</button>
                <button class="link" :disabled="i === form.photos.length - 1" @click="movePhoto(i, 1)">下移</button>
                <button class="link link--danger" @click="removePhoto(i)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <p class="photo-tip">相册封面取第一张；相册不限张数，随笔最多 9 张。</p>
      </section>
    </div>

    <!-- ===== Toast ===== -->
    <transition name="toast-pop">
      <div v-if="toastMsg" class="toast" :class="toastType" role="status" aria-live="polite">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { useApi } from '../../composables/useApi'
import MarkdownSplitEditor from '../../components/MarkdownSplitEditor.vue'
import ThemeSelect from '../../components/ThemeSelect.vue'

const api = useApi()

export default {
  name: 'AdminXiaojiEdit',
  components: {
    MarkdownSplitEditor,
    ThemeSelect,
  },
  data() {
    return {
      loading: false,
      saving: false,
      generatingSummary: false,
      lastSavedAt: null,
      toastMsg: '',
      toastType: 'success',
      tagInput: '',
      // 「关于我」足迹列表：地点从这里选择
      footprints: [],
      form: {
        title: '',
        slug: '',
        type: 'album',
        tags: [],
        content: '',
        summary: '',
        quote: '',
        footprintId: '',
        date: '',
        photos: [],
        published: false,
        viewCount: 0,
        virtualViewCount: null,
      },
    }
  },
  computed: {
    isNew() {
      return !this.$route.params.id
    },
    /** 当前选中的足迹 */
    selectedFootprint() {
      return this.footprints.find((f) => f.id === this.form.footprintId) || null
    },
    /** 地点下拉（ThemeSelect）选项 */
    footprintSelectOptions() {
      return [
        { value: '', label: '不关联地点' },
        ...this.footprints.map((f) => ({ value: f.id, label: f.place, desc: f.location })),
      ]
    },
    /** 选中的足迹是否已绑定到其他小记 */
    footprintTakenByOther() {
      if (!this.selectedFootprint?.blogId) return false
      return this.selectedFootprint.blogId !== this.$route.params.id
    },
    /** 上次保存时间的展示文本（今天只显示时分秒，往日带上日期） */
    lastSavedAtText() {
      if (!this.lastSavedAt) return ''
      const d = new Date(this.lastSavedAt)
      if (Number.isNaN(d.getTime())) return ''
      const today = new Date()
      const sameDay = d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate()
      const time = d.toLocaleTimeString('zh-CN', { hour12: false })
      return sameDay ? time : d.toLocaleString('zh-CN', { hour12: false })
    },
    /** 照片上限：相册不限（Infinity），随笔最多 9 张 */
    photoLimit() {
      return this.form.type === 'album' ? Infinity : 9
    },
    photoLimitReached() {
      return Number.isFinite(this.photoLimit) && this.form.photos.length >= this.photoLimit
    },
  },
  async created() {
    // 先加载足迹列表，编辑态才能按 blogId 反查出当前绑定的足迹
    await this.loadFootprints()
    if (!this.isNew) this.load()
  },
  mounted() {
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    assetUrl: (p) => api.assetUrl(p),
    /** Ctrl/Cmd + S 触发保存，并拦截浏览器默认的「保存网页」行为 */
    onKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        if (!this.loading && !this.saving) this.save()
      }
    },
    showToast(msg, type = 'success') {
      this.toastMsg = msg
      this.toastType = type
      setTimeout(() => { this.toastMsg = '' }, 3000)
    },
    /** AI 根据正文自动生成摘要，成功后填入摘要输入框（不覆盖未保存的手动修改之外的逻辑） */
    async generateSummary() {
      if (!this.form.content.trim() || this.generatingSummary) return
      this.generatingSummary = true
      try {
        const d = await api.post('/admin/xiaoji/generate-summary', {
          content: this.form.content,
          title: this.form.title.trim() || undefined,
        })
        if (d?.summary) {
          this.form.summary = d.summary
          this.showToast('摘要已生成')
        } else {
          this.showToast('模型未返回摘要，请稍后再试', 'error')
        }
      } catch (e) {
        this.showToast('生成失败：' + (e?.message || e), 'error')
      } finally {
        this.generatingSummary = false
      }
    },
    async loadFootprints() {
      try {
        this.footprints = await api.get('/about/footprints')
      } catch {
        // 地点选择非关键数据，失败不打断编辑
        this.footprints = []
      }
    },
    async load() {
      this.loading = true
      try {
        const d = await api.get(`/admin/xiaoji/${this.$route.params.id}`)
        this.lastSavedAt = d.updatedAt || null
        // 绑定的足迹：按足迹上的 blogId 反查（足迹列表由 loadFootprints 并行加载）
        const bound = this.footprints.find((f) => f.blogId === d.id)
        this.form = {
          title: d.title || '',
          slug: d.slug || '',
          type: d.type || 'album',
          tags: d.tags || [],
          content: d.content || '',
          summary: d.summary || '',
          quote: d.quote || '',
          footprintId: bound?.id || '',
          date: d.date || '',
          photos: (d.photos || []).map((p) => ({ url: p.url, caption: p.caption || '' })),
          published: !!d.published,
          viewCount: d.viewCount ?? 0,
          virtualViewCount: d.virtualViewCount ?? null,
        }
      } catch (e) {
        this.showToast('加载小记失败：' + (e?.message || e), 'error')
        this.$router.replace({ name: 'admin-xiaoji' })
      } finally {
        this.loading = false
      }
    },
    /** 虚拟阅读量：空字符串 / NaN 统一视为「未设置」，提交 null 由后端清除 */
    normalizeVirtualViews(v) {
      if (v === '' || v === null || v === undefined || Number.isNaN(v)) return null
      return v
    },
    autoSlug() {
      if (!this.form.slug) {
        this.form.slug = (this.form.title || '')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
          .replace(/\-\-+/g, '-')
          .replace(/^-|-$/g, '')
      }
    },
    addTag() {
      const t = this.tagInput.trim()
      if (t && !this.form.tags.includes(t)) this.form.tags.push(t)
      this.tagInput = ''
    },
    commitTag() {
      if (this.tagInput.trim()) this.addTag()
    },
    removeTag(t) {
      this.form.tags = this.form.tags.filter((x) => x !== t)
    },
    /** 切换类型：随笔最多 9 张，超出时不切换并提示 */
    setType(type) {
      if (type === this.form.type) return
      if (type === 'essay' && this.form.photos.length > 9) {
        this.showToast('随笔最多 9 张照片，请先删除多余照片再切换', 'error')
        return
      }
      this.form.type = type
    },
    async onUpload(e) {
      const files = Array.from(e.target.files || [])
      if (!files.length) return
      const limit = this.photoLimit
      const unlimited = !Number.isFinite(limit)
      if (!unlimited) {
        const remain = limit - this.form.photos.length
        if (remain <= 0) {
          this.showToast(`最多上传 ${limit} 张照片`, 'error')
          if (this.$refs.fileInput) this.$refs.fileInput.value = ''
          return
        }
        if (files.length > remain) {
          this.showToast(`最多上传 ${limit} 张照片，超出部分未上传（仅保留前 ${remain} 张）`, 'error')
        }
      }
      const picked = unlimited ? files : files.slice(0, limit - this.form.photos.length)
      const uploading = picked.map(async (file) => {
        const fd = new FormData()
        fd.append('file', file)
        const res = await api.upload('/admin/upload', fd)
        return { url: res.url, caption: '' }
      })
      try {
        const added = await Promise.all(uploading)
        this.form.photos = this.form.photos.concat(added)
      } catch (err) {
        this.showToast('上传失败：' + (err?.message || err), 'error')
      } finally {
        if (this.$refs.fileInput) this.$refs.fileInput.value = ''
      }
    },
    removePhoto(i) {
      this.form.photos.splice(i, 1)
    },
    movePhoto(i, dir) {
      const j = i + dir
      if (j < 0 || j >= this.form.photos.length) return
      const arr = this.form.photos
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    },
    async save() {
      if (!this.form.title.trim() || !this.form.content.trim()) {
        this.showToast('请填写标题和正文', 'error')
        return
      }
      if (!this.form.slug) this.autoSlug()
      if (this.form.type !== 'album' && this.form.photos.length > 9) {
        this.showToast('随笔最多上传 9 张照片', 'error')
        return
      }
      this.saving = true
      try {
        const payload = {
          title: this.form.title.trim(),
          slug: this.form.slug.trim(),
          type: this.form.type,
          tags: this.form.tags,
          content: this.form.content,
          summary: this.form.summary.trim(),
          quote: this.form.quote.trim(),
          // 地点从足迹中选择：传足迹 id，后端据此写入地点并建立绑定（空 = 不绑定）
          footprintId: this.form.footprintId || '',
          date: this.form.date.trim(),
          photos: this.form.photos,
          published: this.form.published,
          // 清空输入框会得到空字符串，统一转成 null（= 未设置，前台回到展示真实阅读量）
          virtualViewCount: this.normalizeVirtualViews(this.form.virtualViewCount),
        }
        if (this.isNew) {
          const d = await api.post('/admin/xiaoji', payload)
          // 原地切换到编辑态：URL 携带新 id，后续保存走更新而非重复创建
          if (d?.id) this.$router.replace({ name: 'admin-xiaoji-edit', params: { id: d.id } })
          this.lastSavedAt = d?.updatedAt || new Date().toISOString()
          this.showToast('已保存')
        } else {
          const d = await api.put(`/admin/xiaoji/${this.$route.params.id}`, payload)
          this.lastSavedAt = d?.updatedAt || new Date().toISOString()
          this.showToast('已保存')
        }
      } catch (e) {
        this.showToast('保存失败：' + (e?.message || e), 'error')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.xj-edit {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

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
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  margin-bottom: 14px; font-size: 13px; font-weight: 500;
  color: var(--accent); text-decoration: none;
  font-family: var(--font-mono);
  transition: opacity var(--transition);
}
.back-link svg { width: 14px; height: 14px; }
.back-link:hover { opacity: 0.75; text-decoration: underline; }
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

/* ===== Loading ===== */
.loading-box {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px; color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

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
.btn--soft {
  background: var(--accent-light); color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}
.btn--soft:hover:not(.disabled) { background-color: var(--accent); color: #fff; }
:global([data-theme='dark']) .btn--soft:hover:not(.disabled) { color: #0f0f0f; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--sm { padding: 6px 13px; font-size: 12.5px; }
.upload-btn { position: relative; cursor: pointer; }
.upload-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.upload-btn.disabled input { cursor: not-allowed; }
.upload-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

/* ===== Edit grid ===== */
.edit-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
  margin: 22px 0 8px;
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.card__body { padding: 22px 24px; }
.card__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-soft);
}
.card__head-title {
  font-family: var(--font-serif); font-size: 15px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  padding-left: 14px; position: relative;
}
.card__head-title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 15px; border-radius: 4px; background-color: var(--accent);
}
.col-side { position: sticky; top: 12px; }

/* ===== Seg ===== */
.seg {
  display: inline-flex; gap: 4px; padding: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border-light);
  border-radius: 100px;
}
.seg__item {
  border: none; background: none; padding: 7px 22px; border-radius: 100px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
  transition: all var(--transition); white-space: nowrap;
}
.seg__item:hover { color: var(--accent); }
.seg__item.active {
  background: var(--bg-card); color: var(--accent); font-weight: 600;
  box-shadow: var(--shadow-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

/* ===== Fields ===== */
.field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.label-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.ai-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; font-size: 12px; font-weight: 500;
  font-family: var(--font-sans); cursor: pointer;
  color: var(--accent); background: var(--accent-light);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 100px;
  transition: all var(--transition);
}
.ai-btn svg { width: 13px; height: 13px; }
.ai-btn:hover:not(:disabled) {
  background: var(--accent); color: #fff;
  border-color: var(--accent);
}
::global([data-theme='dark']) .ai-btn:hover:not(:disabled) { color: #0f0f0f; }
.ai-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.req { color: #e0533d; margin-left: 2px; }
.field input, .field select, .field textarea {
  padding: 11px 14px; font-size: 14px; font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-soft); border: 1px solid transparent;
  border-radius: var(--radius-sm); outline: none; resize: vertical;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.field input::placeholder, .field textarea::placeholder { color: var(--text-tertiary); }
.field input:hover, .field textarea:hover {
  background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%);
}
/* ThemeSelect 地点下拉 */
.field :deep(.tsel) { width: 100%; display: flex; }
.field :deep(.tsel__trigger) {
  width: 100%; padding: 11px 14px; font-size: 14px;
  background: var(--bg-soft); border-color: transparent; border-radius: var(--radius-sm);
}
.field :deep(.tsel.open .tsel__trigger) {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.field input:focus, .field select:focus, .field textarea:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.field-row { display: flex; gap: 14px; }
.flex-1 { flex: 1; min-width: 0; }
.field-hint {
  margin: 0; font-size: 12px; line-height: 1.6; color: var(--text-tertiary);
}
.field-hint--warn { color: #d97a1f; }

/* ===== Tags input ===== */
.tags-input {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 7px 12px;
  background: var(--bg-soft); border: 1px solid transparent;
  border-radius: var(--radius-sm); min-height: 42px;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.tags-input:hover { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.tags-input:focus-within {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.tags-input input {
  border: none; outline: none; font-size: 13px; font-family: var(--font-sans);
  background: transparent; flex: 1; min-width: 110px; padding: 4px 0;
  color: var(--text-primary);
}
.tags-input input::placeholder { color: var(--text-tertiary); }
.tag-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px;
  font-size: 12px; font-weight: 500;
  background: var(--accent-light); color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 100px;
}
.tag-remove { border: none; background: transparent; color: inherit; font-size: 14px; line-height: 1; cursor: pointer; padding: 0; opacity: 0.6; }
.tag-remove:hover { opacity: 1; }

/* ===== Toggle ===== */
.toggle-row { align-items: center; }
.toggle-label {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--text-primary);
  cursor: pointer; user-select: none;
}
.toggle-label input { display: none; }
.toggle-label input + span {
  width: 42px; height: 23px; border-radius: 100px;
  background: var(--border); position: relative;
  transition: background var(--transition); flex-shrink: 0;
}
.toggle-label input + span::after {
  content: ''; position: absolute; top: 2.5px; left: 2.5px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; transition: transform var(--transition);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-label input:checked + span { background: var(--accent); }
.toggle-label input:checked + span::after { transform: translateX(19px); }

/* ===== Photo list ===== */
.photo-list {
  padding: 12px; display: flex; flex-direction: column; gap: 10px;
  max-height: 560px; overflow-y: auto;
}
.photo-empty {
  padding: 36px 12px; text-align: center;
  color: var(--text-tertiary); font-size: 13px;
  font-family: var(--font-mono);
}
.photo-item {
  display: flex; gap: 10px; align-items: flex-start;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); padding: 8px;
  background: var(--bg-soft);
  transition: border-color var(--transition);
}
.photo-item:hover { border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
.photo-index {
  flex: 0 0 auto;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  color: var(--accent); background-color: var(--accent-light);
  width: 20px; height: 20px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  margin-top: 2px;
}
.photo-item__img {
  width: 72px; height: 54px; object-fit: cover;
  border-radius: 6px; flex: 0 0 72px;
  background: var(--bg-card);
}
.photo-item__body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.photo-item__cap {
  width: 100%; padding: 6px 10px; font-size: 12px; font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-card); border: 1px solid transparent;
  border-radius: 6px; outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.photo-item__cap::placeholder { color: var(--text-tertiary); }
.photo-item__cap:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
}
.photo-item__ops { display: flex; gap: 2px; }
.link {
  border: none; background: none; color: var(--accent); cursor: pointer;
  font-size: 12px; font-weight: 500; padding: 0; margin-right: 8px;
  transition: color var(--transition);
}
.link:hover:not(:disabled) { color: var(--accent-hover); text-decoration: underline; }
.link:disabled { color: var(--text-tertiary); cursor: not-allowed; text-decoration: none; }
.link--danger { color: #e0533d; }
.link--danger:hover:not(:disabled) { color: #c7442f; }
.photo-tip {
  padding: 0 18px 14px; font-size: 12px;
  color: var(--text-tertiary); font-family: var(--font-mono);
}

.photo-list::-webkit-scrollbar { width: 8px; }
.photo-list::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-tertiary) 35%, transparent); border-radius: 4px;
}

/* ===== Toast ===== */
.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  background: var(--bg-card); border: 1px solid var(--accent); color: var(--accent);
  font-size: 14px; font-weight: 500; padding: 10px 22px; border-radius: 100px;
  box-shadow: var(--shadow-lg);
  display: inline-flex; align-items: center; gap: 8px;
  z-index: 4000; max-width: min(480px, 90vw);
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
@media (max-width: 900px) {
  .page-hero { padding: 18px; }
  .page-hero h1 { font-size: 28px; }
  .hero-side { width: 100%; }
  .edit-grid { grid-template-columns: 1fr; }
  .col-side { position: static; }
  .field-row { flex-direction: column; }
}
</style>
