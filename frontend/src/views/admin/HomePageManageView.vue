<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useMode } from '@/composables/useMode'
import HomeView from '@/views/HomeView.vue'
import SocialIcon from '@/components/SocialIcon.vue'
import { FOOTER_ICONS, DEFAULT_FOOTER_ICON, getFooterIconLabel } from '@/utils/footer-icons'

const api = useApi()
const { mode, setMode } = useMode()

const loading = ref(true)
const saving = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

const form = ref({
  siteName: '',
  personTitle: '',
  codeContent: '',
  workPersonTitle: '',
  workCodeContent: '',
  lifePersonTitle: '',
  lifeCodeContent: '',
  avatar: '',
  socialLinks: [],
})

/* ===== 社交链接（首页头像下方的一排按钮） ===== */
const SOCIAL_MAX = 12
const socialModalOpen = ref(false)
const socialEditingIndex = ref(-1) // -1 = 新建
const emptySocial = () => ({ label: '', url: '', icon: DEFAULT_FOOTER_ICON, svg: '' })
const socialForm = ref(emptySocial())
// 填了自定义 SVG 时忽略预设图标
const socialUseCustomSvg = computed(() => !!socialForm.value.svg.trim())

const socialIconLabel = (item) => (item.svg ? '自定义 SVG' : getFooterIconLabel(item.icon))

function openSocialModal(index = -1) {
  socialEditingIndex.value = index
  socialForm.value = index >= 0 ? { ...form.value.socialLinks[index] } : emptySocial()
  socialModalOpen.value = true
}

function saveSocial() {
  const label = socialForm.value.label.trim()
  const url = socialForm.value.url.trim()
  if (!label) return showToast('请填写显示名称', 'error')
  if (!url) return showToast('请填写链接地址', 'error')
  const svg = socialForm.value.svg.trim()
  if (svg && !/<svg[\s\S]*<\/svg>/i.test(svg)) {
    return showToast('自定义图标需为完整的 SVG 代码（以 <svg> 开头、</svg> 结尾）', 'error')
  }
  const item = {
    label,
    url,
    // 自定义 SVG 优先级高于预设图标
    icon: svg ? '' : socialForm.value.icon || DEFAULT_FOOTER_ICON,
    svg,
  }
  const list = [...form.value.socialLinks]
  if (socialEditingIndex.value >= 0) list[socialEditingIndex.value] = item
  else list.push(item)
  form.value.socialLinks = list.slice(0, SOCIAL_MAX)
  socialModalOpen.value = false
}

function removeSocial(index) {
  form.value.socialLinks = form.value.socialLinks.filter((_, i) => i !== index)
}

function moveSocial(index, direction) {
  const target = index + direction
  if (target < 0 || target >= form.value.socialLinks.length) return
  const list = [...form.value.socialLinks]
  ;[list[index], list[target]] = [list[target], list[index]]
  form.value.socialLinks = list
}

// 上传后服务端返回的文件记录 id（用于移除时删除）
const uploadedFileId = ref('')
const uploading = ref(false)

// 已保存的代码框内容快照（用于「还原」），通用 / 工作 / 生活各存一份
let savedCode = { codeContent: '', workCodeContent: '', lifeCodeContent: '' }

// 代码框字符计数（与原型一致：上限 2000，超 90% 提醒）
const CODE_MAX = 2000
const codeCount = computed(() => form.value.codeContent.length)
const workCodeCount = computed(() => form.value.workCodeContent.length)
const lifeCodeCount = computed(() => form.value.lifeCodeContent.length)
const isNearLimit = (n) => n > CODE_MAX * 0.9

/* ===== 实时预览：抽屉内直接复用前台首页页面渲染 ===== */
const previewOpen = ref(false)
// 传全量字段，前台首页按当前预览模式挑选 title 与代码框内容
const previewData = computed(() => ({ ...form.value }))

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
// 预览抽屉内可临时切换工作 / 生活模式查看效果，关闭预览时还原原模式
let modeBeforePreview = null
watch(previewOpen, (open) => {
  if (open) {
    modeBeforePreview = mode.value
    measurePreview()
  } else if (modeBeforePreview) {
    setMode(modeBeforePreview)
    modeBeforePreview = null
  }
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
      workPersonTitle: data.workPersonTitle ?? '',
      workCodeContent: data.workCodeContent ?? '',
      lifePersonTitle: data.lifePersonTitle ?? '',
      lifeCodeContent: data.lifeCodeContent ?? '',
      avatar: data.avatar ?? '',
      socialLinks: Array.isArray(data.socialLinks)
        ? data.socialLinks.map((item) => ({
            label: item.label ?? '',
            url: item.url ?? '',
            icon: item.icon ?? '',
            svg: item.svg ?? '',
          }))
        : [],
    }
    savedCode = {
      codeContent: form.value.codeContent,
      workCodeContent: form.value.workCodeContent,
      lifeCodeContent: form.value.lifeCodeContent,
    }
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
      workPersonTitle: form.value.workPersonTitle.trim(),
      workCodeContent: form.value.workCodeContent,
      lifePersonTitle: form.value.lifePersonTitle.trim(),
      lifeCodeContent: form.value.lifeCodeContent,
      avatar: form.value.avatar || null,
      // 整体覆盖式保存：过滤掉名称与地址都为空的残留项
      socialLinks: form.value.socialLinks
        .filter((item) => item.label.trim() || item.url.trim())
        .map((item) => ({
          label: item.label.trim(),
          url: item.url.trim(),
          icon: item.icon || '',
          svg: item.svg.trim(),
        })),
    }
    await api.put('/admin/home-page', payload)
    dirty.value = false
    savedCode = {
      codeContent: form.value.codeContent,
      workCodeContent: form.value.workCodeContent,
      lifeCodeContent: form.value.lifeCodeContent,
    }
    lastSavedAt.value = Date.now()
    if (!opts.auto) showToast('首页配置已保存', 'success')
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function resetCode(field = 'codeContent') {
  form.value[field] = savedCode[field] ?? ''
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

        <!-- 人物 Title：按模式分别配置 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="fTitle">人物 Title</label>
          </div>
          <p class="field-hint field-hint--top">
            首页人物头像 / 署名下方的副标题。按模式分别配置，模式专属留空时回退到「通用」。
          </p>

          <div class="mode-group">
            <span class="mode-tag mode-tag--common">通用</span>
            <input
              id="fTitle"
              v-model="form.personTitle"
              class="form-input"
              type="text"
              maxlength="240"
              placeholder="如：Digital Gardener & Lifelong Learner"
              autocomplete="off"
            />
          </div>

          <div class="mode-group">
            <span class="mode-tag mode-tag--work">工作模式</span>
            <input
              v-model="form.workPersonTitle"
              class="form-input"
              type="text"
              maxlength="240"
              placeholder="留空则使用通用配置"
              autocomplete="off"
            />
          </div>

          <div class="mode-group">
            <span class="mode-tag mode-tag--life">生活模式</span>
            <input
              v-model="form.lifePersonTitle"
              class="form-input"
              type="text"
              maxlength="240"
              placeholder="留空则使用通用配置"
              autocomplete="off"
            />
          </div>
        </div>

        <!-- 代码框内容：按模式分别配置 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label" for="fCode">代码框内容</label>
          </div>
          <p class="field-hint field-hint--top">
            首页终端 / 代码框内的正文；首行的 <code>$</code> 会作为提示符渲染。按模式分别配置，模式专属留空时回退到「通用」。
          </p>

          <div class="mode-group">
            <div class="mode-group__head">
              <span class="mode-tag mode-tag--common">通用</span>
              <button class="btn btn--link" type="button" @click="resetCode('codeContent')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                还原
              </button>
            </div>
            <textarea
              id="fCode"
              v-model="form.codeContent"
              class="form-input form-textarea"
              rows="7"
              :maxlength="CODE_MAX"
              placeholder="支持多行文本，如终端风格的介绍代码"
            ></textarea>
            <div class="field-foot">
              <span class="form-foot-hint">两种模式均未配置时使用。</span>
              <span class="char-count" :class="{ warn: isNearLimit(codeCount) }">{{ codeCount }} / {{ CODE_MAX }}</span>
            </div>
          </div>

          <div class="mode-group">
            <div class="mode-group__head">
              <span class="mode-tag mode-tag--work">工作模式</span>
              <button class="btn btn--link" type="button" @click="resetCode('workCodeContent')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                还原
              </button>
            </div>
            <textarea
              v-model="form.workCodeContent"
              class="form-input form-textarea"
              rows="7"
              :maxlength="CODE_MAX"
              placeholder="留空则使用通用配置"
            ></textarea>
            <div class="field-foot">
              <span class="form-foot-hint">访客处于「工作模式」时展示。</span>
              <span class="char-count" :class="{ warn: isNearLimit(workCodeCount) }">{{ workCodeCount }} / {{ CODE_MAX }}</span>
            </div>
          </div>

          <div class="mode-group">
            <div class="mode-group__head">
              <span class="mode-tag mode-tag--life">生活模式</span>
              <button class="btn btn--link" type="button" @click="resetCode('lifeCodeContent')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                还原
              </button>
            </div>
            <textarea
              v-model="form.lifeCodeContent"
              class="form-input form-textarea"
              rows="7"
              :maxlength="CODE_MAX"
              placeholder="留空则使用通用配置"
            ></textarea>
            <div class="field-foot">
              <span class="form-foot-hint">访客处于「生活模式」时展示。</span>
              <span class="char-count" :class="{ warn: isNearLimit(lifeCodeCount) }">{{ lifeCodeCount }} / {{ CODE_MAX }}</span>
            </div>
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

        <!-- 社交链接：首页头像下方的一排按钮 -->
        <div class="field">
          <div class="field-head">
            <label class="field-label">社交链接</label>
            <button class="btn btn--link" type="button" @click="openSocialModal(-1)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加链接
            </button>
          </div>
          <p class="field-hint field-hint--top">
            首页头像下方的一排按钮（如语雀 / GitHub），可分别设置图标、名称与跳转地址；用上下箭头调整展示顺序，最多 {{ SOCIAL_MAX }} 条。
          </p>

          <div v-if="!form.socialLinks.length" class="social-empty">
            <span>暂无社交链接，点击右上角「添加链接」开始配置</span>
          </div>
          <ul v-else class="social-list">
            <li v-for="(item, index) in form.socialLinks" :key="index" class="social-row">
              <span class="social-row__icon" :title="socialIconLabel(item)">
                <SocialIcon :name="item.icon" :svg="item.svg" />
              </span>
              <span class="social-row__label">{{ item.label || '未命名' }}</span>
              <span class="social-row__url">{{ item.url }}</span>
              <span class="social-row__meta">{{ socialIconLabel(item) }}</span>
              <span class="social-row__actions">
                <button class="mini-btn" :disabled="index === 0" title="上移" @click="moveSocial(index, -1)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="mini-btn" :disabled="index === form.socialLinks.length - 1" title="下移" @click="moveSocial(index, 1)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <button class="mini-btn" @click="openSocialModal(index)">编辑</button>
                <button class="mini-btn danger" @click="removeSocial(index)">删除</button>
              </span>
            </li>
          </ul>
        </div>
      </form>
    </div>

    <!-- ===== 社交链接：新建 / 编辑 Modal ===== -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="socialModalOpen" class="modal-overlay" @mousedown.self="socialModalOpen = false" @click.self="socialModalOpen = false">
          <div class="modal-card modal-card--wide" role="dialog" aria-modal="true" aria-label="社交链接配置">
            <div class="modal-head">
              <span class="modal-title">{{ socialEditingIndex >= 0 ? '编辑社交链接' : '添加社交链接' }}</span>
              <button class="modal-close" title="关闭" @click="socialModalOpen = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label class="field-label" for="sLabel">显示名称</label>
                <input id="sLabel" v-model="socialForm.label" type="text" maxlength="60" placeholder="如：语雀" />
              </div>
              <div class="form-field">
                <label class="field-label" for="sUrl">链接地址</label>
                <input id="sUrl" v-model="socialForm.url" type="text" class="input-mono" placeholder="https://… 或 mailto:xxx@xx.com" />
                <small class="hint">在新标签页打开；邮箱请填 mailto:xxx@xx.com</small>
              </div>
              <div class="form-field">
                <label class="field-label">图标预览</label>
                <div class="icon-preview">
                  <span class="icon-preview__circle">
                    <SocialIcon :name="socialForm.icon" :svg="socialForm.svg" />
                  </span>
                  <span class="icon-preview__text">
                    {{ socialUseCustomSvg ? '自定义 SVG' : getFooterIconLabel(socialForm.icon) }}
                  </span>
                </div>
              </div>
              <div class="form-field">
                <label class="field-label">预设图标</label>
                <div class="icon-picker">
                  <button
                    v-for="ic in FOOTER_ICONS"
                    :key="ic.key"
                    type="button"
                    class="icon-picker__item"
                    :class="{ active: !socialUseCustomSvg && socialForm.icon === ic.key }"
                    :title="ic.label"
                    @click="socialForm.icon = ic.key; socialForm.svg = ''"
                  >
                    <SocialIcon :name="ic.key" />
                  </button>
                </div>
              </div>
              <div class="form-field">
                <label class="field-label" for="sSvg">自定义图标（可选，填了则优先于预设图标）</label>
                <textarea
                  id="sSvg"
                  v-model="socialForm.svg"
                  class="input-mono svg-input"
                  rows="4"
                  spellcheck="false"
                  placeholder='<svg viewBox="0 0 24 24">...</svg>'
                />
                <small class="hint">粘贴完整 SVG 源码（推荐 24×24 / 1024×1024 viewBox），尺寸由容器自适应</small>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn--ghost" @click="socialModalOpen = false">取消</button>
              <button class="btn btn--primary" @click="saveSocial">确定</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ===== 实时预览抽屉 ===== -->
    <transition name="drawer-fade">
      <div v-if="previewOpen" class="drawer-mask" @click="previewOpen = false"></div>
    </transition>
    <transition name="drawer-slide">
      <aside v-if="previewOpen" class="preview-drawer">
        <div class="drawer-head">
          <span class="drawer-title">实时预览</span>
          <div class="preview-modes" role="group" aria-label="预览模式">
            <button
              type="button"
              class="mode-switch"
              :class="{ active: mode === 'work' }"
              @click="setMode('work')"
            >工作模式</button>
            <button
              type="button"
              class="mode-switch"
              :class="{ active: mode === 'life' }"
              @click="setMode('life')"
            >生活模式</button>
          </div>
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
.field-hint--top { margin: 0 0 14px; }

/* 分模式配置：通用 / 工作 / 生活 */
.mode-group { margin-top: 16px; }
.mode-group:first-of-type { margin-top: 0; }
.mode-group__head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 8px;
}
.mode-tag {
  display: inline-block; font-family: var(--font-mono); font-size: 11.5px; font-weight: 500;
  letter-spacing: 0.06em; padding: 3px 10px; border-radius: 100px; white-space: nowrap;
  background-color: var(--bg-soft); color: var(--text-tertiary); border: 1px solid var(--border);
  margin-bottom: 8px;
}
.mode-group__head .mode-tag { margin-bottom: 0; }
.mode-tag--common { color: var(--text-secondary); }
.mode-tag--work {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background-color: var(--accent-light);
}
.mode-tag--life {
  color: #b07d3a;
  border-color: rgba(176, 125, 58, 0.35);
  background-color: rgba(176, 125, 58, 0.1);
}
.mode-group .form-textarea { min-height: 150px; }

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

/* ===== 社交链接列表 ===== */
.social-empty {
  padding: 18px 16px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
  background-color: var(--bg-soft);
}
.social-list { list-style: none; margin: 0; padding: 6px 0; }
.social-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  margin: 0 0 2px;
  border: 1px solid var(--border-light);
  background-color: var(--bg-card);
  transition: border-color var(--transition), background-color var(--transition);
}
.social-row:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background-color: color-mix(in srgb, var(--accent-light) 30%, transparent);
}
.social-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.social-row__icon :deep(svg),
.social-row__icon :deep(span) { width: 15px; height: 15px; }
.social-row__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.social-row__url {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.social-row__meta {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-tertiary);
  background-color: var(--bg-soft);
  padding: 2px 9px;
  border-radius: 100px;
  flex-shrink: 0;
  white-space: nowrap;
}
.social-row__actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }

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
.mini-btn svg { width: 13px; height: 13px; }
.mini-btn:hover:not(:disabled) {
  color: var(--accent); border-color: var(--accent);
  background-color: var(--accent-light);
}
.mini-btn.danger:hover:not(:disabled) {
  color: #e0533d; border-color: #e0533d; background-color: #fdf1ef;
}
:global([data-theme='dark']) .mini-btn.danger:hover:not(:disabled) { background-color: #33211e; }
.mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ===== 社交链接 Modal ===== */
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
.modal-card--wide { width: 540px; }
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
.modal-close:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
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

/* ===== Modal 表单 ===== */
.form-field { display: flex; flex-direction: column; gap: 6px; }
/* 覆盖页面级 .field-label（16px 衬线标题），弹窗内用小号标签 */
.modal-card .field-label {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.modal-card .form-field input {
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
.modal-card .form-field input::placeholder { color: var(--text-tertiary); }
.modal-card .form-field input:hover {
  background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%);
}
.modal-card .form-field input:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.input-mono { font-family: var(--font-mono); font-size: 13px; }
.hint { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

/* ===== 图标预览 / 选择器 / 自定义 SVG ===== */
.icon-preview { display: flex; align-items: center; gap: 12px; }
.icon-preview__circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.icon-preview__circle :deep(svg),
.icon-preview__circle :deep(span) { width: 19px; height: 19px; }
.icon-preview__text { font-size: 13px; color: var(--text-secondary); }

.icon-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  max-height: 168px;
  overflow-y: auto;
}
.icon-picker__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.icon-picker__item :deep(svg),
.icon-picker__item :deep(span) { width: 19px; height: 19px; }
.icon-picker__item:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
}
.icon-picker__item.active {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent);
}

.svg-input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.svg-input::placeholder { color: var(--text-tertiary); }
.svg-input:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

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
/* 预览抽屉：模式切换（临时切换，关闭预览时还原） */
.preview-modes {
  display: inline-flex; gap: 4px; padding: 3px; margin-left: auto;
  background-color: var(--bg-soft); border: 1px solid var(--border); border-radius: 100px;
}
.mode-switch {
  border: none; background: transparent; cursor: pointer;
  font-family: var(--font-sans); font-size: 12.5px; color: var(--text-tertiary);
  padding: 5px 14px; border-radius: 100px; transition: all var(--transition);
}
.mode-switch:hover { color: var(--accent); }
.mode-switch.active { background-color: var(--accent); color: #fff; }
:global([data-theme='dark']) .mode-switch.active { color: #0f0f0f; }

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
  /* 社交链接行：窄屏下让长链接独占一行，按钮组右对齐 */
  .social-row { flex-wrap: wrap; row-gap: 8px; }
  .social-row__url { flex-basis: 100%; }
}
</style>
