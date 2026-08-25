<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { defaultResumeContent } from '@/data/resume'
import ResumeContent from '@/components/resume/ResumeContent.vue'

const api = useApi()

const loading = ref(true)
const saving = ref(false)
const actionLoading = ref(false)
const toastMsg = ref('')
const toastType = ref('success')
const previewOpen = ref(false)

/* ===== 新建版本弹窗 ===== */
const createOpen = ref(false)
const createName = ref('')
const createBaseCurrent = ref(true)
const creating = ref(false)

/* ===== 预览抽屉等比例缩放 =====
 * ResumeContent 以 1120px 宽度设计（.page max-width），抽屉宽度不足以容纳原布局。
 * 用 CSS zoom 在基准宽度上整体缩放：占位尺寸与滚动高度由浏览器自动按缩放比例计算，
 * 不会出现 transform: scale + 手动测高导致的「下方内容空白/被裁剪」问题。 */
const PREVIEW_BASE_WIDTH = 1120
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
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  stopAutosave()
})

/* ===== 版本列表 ===== */
const versions = ref([])
const currentId = ref('')

/* ===== 编辑中的 content（浅拷贝：顶层引用随版本切换更新） ===== */
const form = ref(clone(defaultResumeContent))
const versionName = ref('')

/* 未保存修改标记（用于切换/删除时确认） */
const dirty = ref(false)
watch(
  () => JSON.stringify(form.value),
  () => {
    dirty.value = true
  },
)

const currentVersion = computed(() => versions.value.find((v) => v.id === currentId.value) || null)

/* ===== 加载版本列表 ===== */
async function loadVersions(selectId) {
  try {
    const list = await api.get('/admin/resume')
    versions.value = list
    const active = list.find((v) => v.isActive)
    const targetId = selectId || active?.id || list[0]?.id
    if (targetId) await selectVersion(targetId)
  } catch (e) {
    showToast('加载版本列表失败: ' + e.message, 'error')
  }
}

async function selectVersion(id) {
  if (id === currentId.value) return
  if (dirty.value && !confirm('当前版本有未保存的修改，切换后修改将丢失，是否继续？')) return
  currentId.value = id
  dirty.value = false
  await loadDetail(id)
}

async function loadDetail(id) {
  loading.value = true
  try {
    const detail = await api.get(`/admin/resume/${id}`)
    versionName.value = detail.name || '未命名版本'
    form.value = clone(detail.content || {})
    dirty.value = false
  } catch (e) {
    showToast('加载简历内容失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/* ===== 版本操作 ===== */
async function activate(id) {
  actionLoading.value = true
  try {
    await api.put(`/admin/resume/${id}/activate`)
    showToast('已切换生效版本', 'success')
    await loadVersions(id)
  } catch (e) {
    showToast('切换失败: ' + e.message, 'error')
  } finally {
    actionLoading.value = false
  }
}

function openCreate() {
  createName.value = ''
  createBaseCurrent.value = true
  creating.value = false
  createOpen.value = true
  nextTick(() => {
    const el = document.querySelector('.create-modal input')
    if (el) el.focus()
  })
}

async function confirmCreate() {
  if (creating.value) return
  const name = createName.value.trim()
  if (!name) {
    showToast('请填写版本名称', 'error')
    return
  }
  creating.value = true
  try {
    const payload = {
      name,
      content: createBaseCurrent.value ? clone(form.value) : clone(defaultResumeContent),
    }
    const created = await api.post('/admin/resume', payload)
    createOpen.value = false
    showToast('新版本已创建', 'success')
    await loadVersions(created.id)
  } catch (e) {
    showToast('创建失败: ' + e.message, 'error')
  } finally {
    creating.value = false
  }
}

function closeCreate() {
  if (creating.value) return
  createOpen.value = false
}

/* ===== 删除确认弹窗 ===== */
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

function openDelete(v) {
  if (!v) return
  if (v.isActive) {
    showToast('不能删除当前生效版本，请先切换其他版本为生效', 'error')
    return
  }
  deleteTarget.value = v
  deleting.value = false
  deleteOpen.value = true
}

async function confirmDelete() {
  const v = deleteTarget.value
  if (!v || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/resume/${v.id}`)
    deleteOpen.value = false
    deleteTarget.value = null
    showToast('版本已删除', 'success')
    dirty.value = false
    currentId.value = ''
    await loadVersions()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
  } finally {
    deleting.value = false
  }
}

function closeDelete() {
  if (deleting.value) return
  deleteOpen.value = false
  deleteTarget.value = null
}

/* ===== 保存 =====
 * opts.auto = true 表示自动保存触发：成功时不弹 toast 打扰，失败仍提示错误。
 * saving 互斥保护：自动保存与 Ctrl+S / 手动保存并发时只执行一个。 */
async function save(opts = {}) {
  if (saving.value) return
  if (!currentId.value) return
  saving.value = true
  try {
    await api.put(`/admin/resume/${currentId.value}`, {
      name: versionName.value.trim(),
      content: clone(form.value),
    })
    dirty.value = false
    lastSavedAt.value = Date.now()
    if (!opts.auto) {
      showToast(
        currentVersion.value?.isActive
          ? '已保存，前台简历页刷新后即可看到更新'
          : '已保存（该版本未设为生效，前台暂不展示）',
        'success',
      )
    }
    await loadVersions(currentId.value)
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

/* ===== 每 20s 自动保存 ===== */
const AUTOSAVE_INTERVAL = 20_000
let autosaveTimer = null
const lastSavedAt = ref(0)

function startAutosave() {
  stopAutosave()
  autosaveTimer = setInterval(() => {
    if (dirty.value && currentId.value && !saving.value) {
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

/* ===== Ctrl + S 保存 / Esc 关闭弹窗 ===== */
function onKeydown(e) {
  if (createOpen.value) {
    if (e.key === 'Escape' && !creating.value) {
      e.preventDefault()
      closeCreate()
    }
    return
  }
  if (deleteOpen.value) {
    if (e.key === 'Escape' && !deleting.value) {
      e.preventDefault()
      closeDelete()
    }
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

/* ===== 列表增删 ===== */
function addItem(list, item) {
  list.push(item)
}
function removeItem(list, index) {
  list.splice(index, 1)
}
function addInfo() {
  form.value.info = form.value.info || []
  form.value.info.push({ icon: 'user', label: '', value: '', href: null })
}
function addCertificate() {
  form.value.certificates = form.value.certificates || []
  form.value.certificates.push({ label: '', accent: false })
}
function addCategory() {
  form.value.techCategories = form.value.techCategories || []
  form.value.techCategories.push({ title: '', items: [] })
}
function addTechItem(cat) {
  cat.items = cat.items || []
  cat.items.push({ name: '', desc: '' })
}
function addProject() {
  form.value.projects = form.value.projects || []
  form.value.projects.push({ title: '', year: '', desc: '', tags: [] })
}
function addProjectTag(project) {
  project.tags = project.tags || []
  project.tags.push({ label: '', accent: false })
}
function addExperience() {
  form.value.experiences = form.value.experiences || []
  form.value.experiences.push({ role: '', period: '', org: '', points: [] })
}
function addPoint(exp) {
  exp.points = exp.points || []
  exp.points.push('')
}
function addLead() {
  form.value.about = form.value.about || { leads: [], callout: '' }
  form.value.about.leads = form.value.about.leads || []
  form.value.about.leads.push('')
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMsg.value = ''
  }, 3000)
}

onMounted(async () => {
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
  startAutosave()
  try {
    await loadVersions()
  } finally {
    loading.value = false
  }
})

const hasVersions = computed(() => versions.value.length > 0)
</script>

<template>
  <div class="resume-manage">
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
            <span class="kicker">Resume · 简历</span>
            <h1>简历管理</h1>
          </div>
          <div class="hero-side">
            <span class="autosave-status" :class="{ dirty }" title="每 20 秒自动保存 · Ctrl + S 手动保存">
              {{ saving ? '保存中…' : dirty ? '未保存修改' : lastSavedAt ? '已保存 · ' + new Date(lastSavedAt).toLocaleTimeString() : '' }}
            </span>
            <button class="btn btn--ghost" :disabled="actionLoading" @click="openCreate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建版本
            </button>
            <a class="btn btn--ghost" href="#/resume" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              打开前台
            </a>
            <button class="btn btn--primary" :disabled="saving || !currentId" @click="save()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {{ saving ? '保存中…' : '保存当前版本' }}
            </button>
          </div>
        </div>
        <p class="lede">管理多个简历版本：编辑内容、切换前台生效版本，保存后即时生效。</p>
        <p class="hero-note">每 20s 自动保存 · Ctrl + S 立即保存 · 切换版本前请注意保存未完成的修改</p>
      </div>
    </section>

    <!-- ===== Loading / Empty ===== -->
    <div v-if="loading && !versions.length" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <div v-else-if="!hasVersions" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 9h5M7 13h10M7 17h7"/></svg>
      <span>暂无简历版本，点击右上角「新建版本」开始。</span>
    </div>

    <template v-else>
      <!-- ===== 版本列表 ===== -->
      <section class="version-bar">
        <div
          v-for="v in versions"
          :key="v.id"
          class="version-item"
          :class="{ selected: v.id === currentId }"
          @click="selectVersion(v.id)"
        >
          <div class="version-name">{{ v.name }}</div>
          <div class="version-meta">
            <span v-if="v.isActive" class="active-tag">生效中</span>
            <span class="version-time">{{ new Date(v.updatedAt).toLocaleString() }}</span>
          </div>
          <div class="version-actions" @click.stop>
            <button
              v-if="!v.isActive"
              class="mini-btn"
              title="切换为生效版本"
              :disabled="actionLoading"
              @click="activate(v.id)"
            >
              设为生效
            </button>
            <button
              class="mini-btn danger"
              title="删除版本"
              :disabled="actionLoading || v.isActive"
              @click="openDelete(v)"
            >
              删除
            </button>
          </div>
        </div>
      </section>

      <!-- ===== 编辑区 ===== -->
      <div class="settings-wrap">
        <section class="settings-card">
          <!-- 版本信息 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">版本信息</span>
              <button class="btn btn--link" :disabled="!currentId" @click="previewOpen = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path></svg>
                实时预览
              </button>
            </div>
            <div class="version-name-row">
              <input
                v-model="versionName"
                class="form-input"
                type="text"
                maxlength="120"
                placeholder="如：默认版本 / 2026 夏季版"
              />
              <span v-if="currentVersion" class="edit-status" :class="{ active: currentVersion.isActive }">
                {{ currentVersion.isActive ? '● 生效中 · 前台展示此版本' : '○ 未生效 · 前台不展示' }}
              </span>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">基本信息</span>
            </div>
            <div class="form-field">
              <label class="field-label" for="rName">姓名</label>
              <input id="rName" v-model="form.profile.name" class="form-input" type="text" maxlength="60" placeholder="姓名" />
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label" for="rAvatar">头像文字</label>
                <input id="rAvatar" v-model="form.profile.avatarText" class="form-input" type="text" maxlength="4" placeholder="如：墨" />
              </div>
              <div class="form-field">
                <label class="field-label" for="rHandle">Handle</label>
                <input id="rHandle" v-model="form.profile.handle" class="form-input" type="text" maxlength="120" placeholder="如：AI 全栈工程师（偏后端）" />
              </div>
            </div>
            <div class="form-field">
              <label class="field-label" for="rTagline">Tagline</label>
              <textarea id="rTagline" v-model="form.profile.tagline" class="form-input form-textarea" rows="2" maxlength="300" placeholder="一句话介绍"></textarea>
            </div>
            <div class="form-field">
              <label class="field-label" for="rHeroInfo">隐私提示（hero 问号 tooltip）</label>
              <textarea id="rHeroInfo" v-model="form.profile.heroInfo" class="form-input form-textarea" rows="2" maxlength="200" placeholder="如：为保护个人隐私，网页简历信息已做脱敏处理…"></textarea>
            </div>
          </div>

          <!-- 关于我 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">关于我</span>
            </div>
            <div v-for="(lead, i) in (form.about?.leads || [])" :key="'lead' + i" class="form-field">
              <div class="field-head-inline">
                <label class="field-label">段落 {{ i + 1 }}</label>
                <button class="btn btn--link btn--danger" @click="removeItem(form.about.leads, i)">删除该段</button>
              </div>
              <textarea v-model="form.about.leads[i]" class="form-input form-textarea" rows="2" placeholder="支持 &lt;strong&gt; 强调文本"></textarea>
            </div>
            <button class="btn btn--ghost add-btn" @click="addLead">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加段落
            </button>
            <div class="form-field">
              <label class="field-label" for="rCallout">Callout 金句</label>
              <textarea id="rCallout" v-model="form.about.callout" class="form-input form-textarea" rows="2" placeholder="一段引用/金句"></textarea>
            </div>
          </div>

          <!-- 个人信息（侧栏） -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">个人信息（侧栏）</span>
            </div>
            <div v-for="(item, i) in (form.info || [])" :key="'info' + i" class="repeat-row">
              <select v-model="item.icon" class="form-input" title="图标">
                <option value="mail">邮箱</option>
                <option value="chat">微信</option>
                <option value="location">地址</option>
                <option value="user">用户</option>
                <option value="badge">徽章</option>
              </select>
              <input v-model="item.label" class="form-input w-sm" type="text" placeholder="标签" />
              <input v-model="item.value" class="form-input flex-1" type="text" placeholder="内容" />
              <input v-model="item.href" class="form-input w-lg" type="text" placeholder="链接(可选)" />
              <button class="mini-btn danger" title="删除" @click="removeItem(form.info, i)">删</button>
            </div>
            <button class="btn btn--ghost add-btn" @click="addInfo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加信息项
            </button>
          </div>

          <!-- 教育背景 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">教育背景</span>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="field-label" for="rSchool">学校</label>
                <input id="rSchool" v-model="form.education.school" class="form-input" type="text" placeholder="学校" />
              </div>
              <div class="form-field">
                <label class="field-label" for="rPeriod">时间</label>
                <input id="rPeriod" v-model="form.education.period" class="form-input" type="text" placeholder="2019 — 2023" />
              </div>
            </div>
            <div class="form-field">
              <label class="field-label" for="rMajor">专业</label>
              <input id="rMajor" v-model="form.education.major" class="form-input" type="text" placeholder="专业" />
            </div>
          </div>

          <!-- 资质 / 证书 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">资质 / 证书</span>
            </div>
            <div v-for="(cert, i) in (form.certificates || [])" :key="'cert' + i" class="repeat-row">
              <input v-model="cert.label" class="form-input flex-1" type="text" placeholder="证书名称" />
              <label class="check-label">
                <input v-model="cert.accent" type="checkbox" /> 高亮
              </label>
              <button class="mini-btn danger" title="删除" @click="removeItem(form.certificates, i)">删</button>
            </div>
            <button class="btn btn--ghost add-btn" @click="addCertificate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加证书
            </button>
          </div>

          <!-- 技术与能力 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">技术与能力</span>
            </div>
            <div v-for="(cat, ci) in (form.techCategories || [])" :key="'cat' + ci" class="repeat-block">
              <div class="repeat-head">
                <input v-model="cat.title" class="form-input flex-1" type="text" placeholder="分类名称" />
                <button class="mini-btn danger" @click="removeItem(form.techCategories, ci)">删分类</button>
              </div>
              <div v-for="(item, ii) in cat.items" :key="'item' + ci + '-' + ii" class="repeat-row">
                <input v-model="item.name" class="form-input w-md" type="text" placeholder="能力名" />
                <textarea v-model="item.desc" class="form-input flex-1" rows="2" placeholder="描述"></textarea>
                <button class="mini-btn danger" title="删除" @click="removeItem(cat.items, ii)">删</button>
              </div>
              <button class="btn btn--link add-btn" @click="addTechItem(cat)">+ 添加能力</button>
            </div>
            <button class="btn btn--ghost add-btn" @click="addCategory">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加分类
            </button>
          </div>

          <!-- 项目经历 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">项目经历</span>
            </div>
            <div v-for="(proj, pi) in (form.projects || [])" :key="'proj' + pi" class="repeat-block">
              <div class="repeat-head">
                <input v-model="proj.title" class="form-input flex-1" type="text" placeholder="项目名" />
                <input v-model="proj.year" class="form-input w-sm" type="text" placeholder="年份" />
                <button class="mini-btn danger" @click="removeItem(form.projects, pi)">删</button>
              </div>
              <div class="form-field">
                <textarea v-model="proj.desc" class="form-input form-textarea" rows="2" placeholder="项目描述"></textarea>
              </div>
              <div v-for="(tag, ti) in proj.tags" :key="'tag' + pi + '-' + ti" class="repeat-row">
                <input v-model="tag.label" class="form-input flex-1" type="text" placeholder="标签" />
                <label class="check-label">
                  <input v-model="tag.accent" type="checkbox" /> 高亮
                </label>
                <button class="mini-btn danger" title="删除" @click="removeItem(proj.tags, ti)">删</button>
              </div>
              <button class="btn btn--link add-btn" @click="addProjectTag(proj)">+ 添加标签</button>
            </div>
            <button class="btn btn--ghost add-btn" @click="addProject">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加项目
            </button>
          </div>

          <!-- 工作经历 -->
          <div class="field">
            <div class="field-head">
              <span class="section-title">工作经历</span>
            </div>
            <div v-for="(exp, ei) in (form.experiences || [])" :key="'exp' + ei" class="repeat-block">
              <div class="repeat-head">
                <input v-model="exp.role" class="form-input flex-1" type="text" placeholder="职位" />
                <input v-model="exp.period" class="form-input w-lg" type="text" placeholder="时间" />
                <button class="mini-btn danger" @click="removeItem(form.experiences, ei)">删</button>
              </div>
              <div class="form-field">
                <input v-model="exp.org" class="form-input" type="text" placeholder="组织/公司" />
              </div>
              <div v-for="(point, pi2) in exp.points" :key="'p' + ei + '-' + pi2" class="repeat-row">
                <textarea v-model="exp.points[pi2]" class="form-input flex-1" rows="2" placeholder="工作内容描述"></textarea>
                <button class="mini-btn danger" title="删除" @click="removeItem(exp.points, pi2)">删</button>
              </div>
              <button class="btn btn--link add-btn" @click="addPoint(exp)">+ 添加描述</button>
            </div>
            <button class="btn btn--ghost add-btn" @click="addExperience">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加工作经历
            </button>
          </div>
        </section>
      </div>
    </template>

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
            <ResumeContent :content="form" />
          </div>
        </div>
      </aside>
    </transition>

    <!-- ===== 新建版本弹窗 ===== -->
    <transition name="modal-fade">
      <div v-if="createOpen" class="modal-mask" @click.self="closeCreate">
        <div class="create-modal" role="dialog" aria-modal="true" aria-label="新建简历版本">
          <div class="modal-head">
            <span class="modal-title">新建简历版本</span>
            <button class="modal-close" title="关闭" :disabled="creating" @click="closeCreate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label class="field-label" for="createName">版本名称</label>
              <input
                id="createName"
                v-model="createName"
                class="form-input"
                type="text"
                maxlength="120"
                placeholder="如：默认版本 / 2026 夏季版"
                @keydown.enter="confirmCreate"
              />
            </div>
            <label class="radio-row">
              <input type="radio" :value="true" v-model="createBaseCurrent" :disabled="creating" />
              <span>基于当前版本内容创建（复制现有内容）</span>
            </label>
            <label class="radio-row">
              <input type="radio" :value="false" v-model="createBaseCurrent" :disabled="creating" />
              <span>从空白模板创建（使用默认空简历）</span>
            </label>
          </div>
          <div class="modal-foot">
            <button class="btn btn--ghost" :disabled="creating" @click="closeCreate">取消</button>
            <button class="btn btn--primary" :disabled="creating" @click="confirmCreate">
              {{ creating ? '创建中…' : '创建版本' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===== 删除版本确认弹窗 ===== -->
    <transition name="modal-fade">
      <div v-if="deleteOpen" class="modal-mask" @click.self="closeDelete">
        <div class="create-modal confirm-modal" role="dialog" aria-modal="true" aria-label="删除简历版本">
          <div class="modal-head">
            <span class="modal-title">删除简历版本</span>
            <button class="modal-close" title="关闭" :disabled="deleting" @click="closeDelete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="confirm-warn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p>
                确定删除版本
                <strong class="confirm-name">{{ deleteTarget?.name }}</strong>
                吗？删除后不可恢复。
              </p>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn--ghost" :disabled="deleting" @click="closeDelete">取消</button>
            <button class="btn btn--danger" :disabled="deleting" @click="confirmDelete">
              {{ deleting ? '删除中…' : '删除版本' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.resume-manage { position: relative; }

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
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--link {
  background: transparent; color: var(--accent);
  padding: 4px 10px; font-size: 13px; border-color: transparent;
}
.btn--link:hover:not(:disabled) { background-color: var(--accent-light); }
.btn--link:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--link.btn--danger { color: #e0533d; }
.btn--link.btn--danger:hover:not(:disabled) { background-color: #fdf1ef; color: #c7442f; }
:global([data-theme='dark']) .btn--link.btn--danger:hover:not(:disabled) { background-color: #33211e; }
.btn--danger {
  background-color: #e0533d; color: #fff; border-color: #e0533d;
  box-shadow: 0 1px 0 rgba(224, 83, 61, 0.3);
}
.btn--danger:hover:not(:disabled) {
  background-color: #c7442f; border-color: #c7442f;
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}
.btn--danger:disabled { opacity: 0.6; cursor: not-allowed; }

/* ===== Loading / Empty ===== */
.empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.empty svg { width: 22px; height: 22px; flex-shrink: 0; color: var(--text-tertiary); }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Version bar ===== */
.version-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0 8px;
}
.version-item {
  flex: 1 1 220px;
  max-width: 300px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  cursor: pointer;
  transition: all var(--transition);
}
.version-item:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.version-item.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
.version-item.selected .version-name { color: var(--accent); }
.version-name {
  font-family: var(--font-serif); font-size: 15.5px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  margin-bottom: 8px; word-break: break-all;
}
.version-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 12px;
}
.active-tag {
  font-size: 11px; font-weight: 600; color: #fff;
  background: var(--accent); padding: 2px 10px;
  border-radius: 100px; white-space: nowrap;
}
:global([data-theme='dark']) .active-tag { color: #0f0f0f; }
.version-time {
  font-family: var(--font-mono); font-size: 11.5px; color: var(--text-tertiary);
}
.version-actions { display: flex; gap: 6px; }
.mini-btn {
  padding: 4px 10px;
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
.mini-btn:hover:not(:disabled) {
  color: var(--accent); border-color: var(--accent);
  background-color: var(--accent-light);
}
.mini-btn.danger:hover:not(:disabled) {
  color: #e0533d; border-color: #e0533d; background-color: #fdf1ef;
}
:global([data-theme='dark']) .mini-btn.danger:hover:not(:disabled) { background-color: #33211e; }
.mini-btn:disabled { opacity: 0.45; cursor: not-allowed; }

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
  gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
}
.field-head-inline {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 6px;
}
.section-title {
  font-family: var(--font-serif); font-size: 16px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  padding-left: 14px; position: relative;
}
.section-title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 16px; border-radius: 4px; background-color: var(--accent);
}

/* Inputs */
.form-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-field:last-child { margin-bottom: 0; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-input {
  display: block; width: 100%;
  font-family: var(--font-sans); font-size: 14px; color: var(--text-primary);
  background-color: var(--bg-soft); border: 1px solid transparent;
  border-radius: var(--radius-sm); padding: 11px 13px;
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
  font-size: 13.5px; line-height: 1.7;
  resize: vertical; min-height: 44px;
}
select.form-input {
  width: auto; flex: 0 0 auto; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  padding-right: 30px;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

/* 宽度工具类（repeat 行内布局） */
.w-sm { width: 90px; flex: 0 0 auto; }
.w-md { width: 140px; flex: 0 0 auto; }
.w-lg { width: 160px; flex: 0 0 auto; }
.flex-1 { flex: 1; min-width: 0; }

/* 添加按钮 */
.add-btn { margin-top: 10px; }

/* Repeat 结构 */
.repeat-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 14px;
  margin-bottom: 12px;
  background: var(--bg-soft);
}
.repeat-block .add-btn { margin-top: 2px; }
.repeat-head {
  display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;
}
.repeat-row {
  display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;
}
.repeat-row:last-child { margin-bottom: 0; }
.repeat-row .form-input,
.repeat-head .form-input { padding: 8px 12px; font-size: 13.5px; }
.repeat-row .form-input:focus,
.repeat-head .form-input:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
}
.repeat-row textarea.form-input { min-height: 40px; }
.repeat-row .mini-btn { flex: 0 0 auto; }
.check-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: var(--text-secondary);
  white-space: nowrap; cursor: pointer;
}
.check-label input { accent-color: var(--accent); width: auto; margin: 0; }

/* 版本名称 + 生效状态 */
.version-name-row {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.version-name-row .form-input { flex: 1; min-width: 220px; }
.edit-status {
  font-family: var(--font-mono); font-size: 12px;
  color: var(--text-tertiary); white-space: nowrap;
}
.edit-status.active { color: var(--accent); font-weight: 500; }

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

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.create-modal {
  width: 100%;
  max-width: 460px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
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
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-body .form-field { margin-bottom: 0; }
.radio-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 0;
}
.radio-row input { width: auto; accent-color: var(--accent); margin: 0; }
.radio-row:hover { color: var(--text-primary); }
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
.modal-fade-enter-active .create-modal { transition: transform 0.2s ease; }
.modal-fade-enter-from .create-modal { transform: translateY(-12px) scale(0.98); }

/* 删除确认弹窗 */
.confirm-modal { max-width: 420px; }
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
  color: #e0533d;
  margin-top: 1px;
}
.confirm-warn p { margin: 0; }
.confirm-name {
  color: var(--text-primary);
  font-weight: 700;
  word-break: break-all;
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
  .field { padding: 18px; }
  .form-row { grid-template-columns: 1fr; }
  .version-item { flex: 1 1 100%; max-width: none; }
  .drawer-body { padding: 14px; }
  .repeat-row .w-sm, .repeat-row .w-md, .repeat-row .w-lg { width: 100%; flex: 1 1 100%; }
  .repeat-row .flex-1 { flex: 1 1 100%; }
  .repeat-row .mini-btn { margin-left: auto; }
}
</style>
