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
    <transition name="fade">
      <div v-if="toastMsg" class="toast" :class="toastType">{{ toastMsg }}</div>
    </transition>

    <div class="page-head">
      <div>
        <h2>简历管理</h2>
        <p class="page-desc">管理多个简历版本：编辑内容、切换前台生效版本，保存后即时生效</p>
        <span class="autosave-status" :class="{ dirty }" :title="'每 20 秒自动保存 · Ctrl + S 手动保存'">
          {{ saving ? '保存中…' : dirty ? '未保存' : lastSavedAt ? '已自动保存 ' + new Date(lastSavedAt).toLocaleTimeString() : '' }}
        </span>
      </div>
      <div class="head-actions">
        <button class="btn-ghost" :disabled="actionLoading" @click="openCreate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建版本
        </button>
        <a class="btn-ghost" href="#/resume" target="_blank" rel="noopener">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          打开前台
        </a>
        <button class="btn-primary" :disabled="saving || !currentId" @click="save()">
          {{ saving ? '保存中…' : '保存当前版本' }}
        </button>
      </div>
    </div>

    <div v-if="loading && !versions.length" class="empty">加载中…</div>

    <div v-else-if="!hasVersions" class="empty">暂无简历版本，请先新建。</div>

    <template v-else>
      <!-- 版本列表 -->
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

      <!-- 编辑区 -->
      <div class="edit-main">
        <!-- 表单 -->
        <section class="panel form-panel">
          <div class="panel-title panel-title-row">
            <span>版本信息</span>
            <button class="btn-ghost" :disabled="!currentId" @click="previewOpen = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              实时预览
            </button>
          </div>
          <div class="form-field">
            <label>版本名称</label>
            <div class="version-name-row">
              <input v-model="versionName" type="text" maxlength="120" placeholder="如：默认版本 / 2026 夏季版" />
              <span v-if="currentVersion" class="edit-status" :class="{ active: currentVersion.isActive }">
                {{ currentVersion.isActive ? '● 生效中 · 前台展示此版本' : '○ 未生效 · 前台不展示' }}
              </span>
            </div>
          </div>

          <div class="panel-title">基本信息</div>
          <div class="form-field">
            <label>姓名</label>
            <input v-model="form.profile.name" type="text" maxlength="60" placeholder="姓名" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>头像文字</label>
              <input v-model="form.profile.avatarText" type="text" maxlength="4" placeholder="如：墨" />
            </div>
            <div class="form-field">
              <label>Handle</label>
              <input v-model="form.profile.handle" type="text" maxlength="120" placeholder="如：AI 全栈工程师（偏后端）" />
            </div>
          </div>
          <div class="form-field">
            <label>Tagline</label>
            <textarea v-model="form.profile.tagline" rows="2" maxlength="300" placeholder="一句话介绍"></textarea>
          </div>
          <div class="form-field">
            <label>隐私提示（hero 问号 tooltip）</label>
            <textarea v-model="form.profile.heroInfo" rows="2" maxlength="200" placeholder="如：为保护个人隐私，网页简历信息已做脱敏处理…"></textarea>
          </div>

          <div class="panel-title">关于我</div>
          <div v-for="(lead, i) in (form.about?.leads || [])" :key="'lead' + i" class="form-field">
            <label>段落 {{ i + 1 }}</label>
            <textarea v-model="form.about.leads[i]" rows="2" placeholder="支持 &lt;strong&gt; 强调文本"></textarea>
            <button class="btn-ghost small" @click="removeItem(form.about.leads, i)">删除该段</button>
          </div>
          <button class="btn-ghost" @click="addLead">+ 添加段落</button>
          <div class="form-field" style="margin-top: 14px">
            <label>Callout 金句</label>
            <textarea v-model="form.about.callout" rows="2" placeholder="一段引用/金句"></textarea>
          </div>

          <div class="panel-title">个人信息（侧栏）</div>
          <div v-for="(item, i) in (form.info || [])" :key="'info' + i" class="repeat-row">
            <select v-model="item.icon">
              <option value="mail">邮箱</option>
              <option value="chat">微信</option>
              <option value="location">地址</option>
              <option value="user">用户</option>
              <option value="badge">徽章</option>
            </select>
            <input v-model="item.label" type="text" placeholder="标签" style="width: 90px" />
            <input v-model="item.value" type="text" placeholder="内容" />
            <input v-model="item.href" type="text" placeholder="链接(可选)" style="width: 160px" />
            <button class="mini-btn danger" @click="removeItem(form.info, i)">删</button>
          </div>
          <button class="btn-ghost" @click="addInfo">+ 添加信息项</button>

          <div class="panel-title">教育背景</div>
          <div class="form-row">
            <div class="form-field">
              <label>学校</label>
              <input v-model="form.education.school" type="text" placeholder="学校" />
            </div>
            <div class="form-field">
              <label>时间</label>
              <input v-model="form.education.period" type="text" placeholder="2019 — 2023" />
            </div>
          </div>
          <div class="form-field">
            <label>专业</label>
            <input v-model="form.education.major" type="text" placeholder="专业" />
          </div>

          <div class="panel-title">资质 / 证书</div>
          <div v-for="(cert, i) in (form.certificates || [])" :key="'cert' + i" class="repeat-row">
            <input v-model="cert.label" type="text" placeholder="证书名称" style="flex: 1" />
            <label class="check-label">
              <input v-model="cert.accent" type="checkbox" /> 高亮
            </label>
            <button class="mini-btn danger" @click="removeItem(form.certificates, i)">删</button>
          </div>
          <button class="btn-ghost" @click="addCertificate">+ 添加证书</button>

          <div class="panel-title">技术与能力</div>
          <div v-for="(cat, ci) in (form.techCategories || [])" :key="'cat' + ci" class="repeat-block">
            <div class="repeat-head">
              <input v-model="cat.title" type="text" placeholder="分类名称" style="flex: 1" />
              <button class="mini-btn danger" @click="removeItem(form.techCategories, ci)">删分类</button>
            </div>
            <div v-for="(item, ii) in cat.items" :key="'item' + ci + '-' + ii" class="repeat-row">
              <input v-model="item.name" type="text" placeholder="能力名" style="width: 140px" />
              <textarea v-model="item.desc" rows="2" placeholder="描述"></textarea>
              <button class="mini-btn danger" @click="removeItem(cat.items, ii)">删</button>
            </div>
            <button class="btn-ghost small" @click="addTechItem(cat)">+ 添加能力</button>
          </div>
          <button class="btn-ghost" @click="addCategory">+ 添加分类</button>

          <div class="panel-title">项目经历</div>
          <div v-for="(proj, pi) in (form.projects || [])" :key="'proj' + pi" class="repeat-block">
            <div class="repeat-head">
              <input v-model="proj.title" type="text" placeholder="项目名" style="flex: 1" />
              <input v-model="proj.year" type="text" placeholder="年份" style="width: 90px" />
              <button class="mini-btn danger" @click="removeItem(form.projects, pi)">删</button>
            </div>
            <div class="form-field">
              <textarea v-model="proj.desc" rows="2" placeholder="项目描述"></textarea>
            </div>
            <div v-for="(tag, ti) in proj.tags" :key="'tag' + pi + '-' + ti" class="repeat-row">
              <input v-model="tag.label" type="text" placeholder="标签" style="flex: 1" />
              <label class="check-label">
                <input v-model="tag.accent" type="checkbox" /> 高亮
              </label>
              <button class="mini-btn danger" @click="removeItem(proj.tags, ti)">删</button>
            </div>
            <button class="btn-ghost small" @click="addProjectTag(proj)">+ 添加标签</button>
          </div>
          <button class="btn-ghost" @click="addProject">+ 添加项目</button>

          <div class="panel-title">工作经历</div>
          <div v-for="(exp, ei) in (form.experiences || [])" :key="'exp' + ei" class="repeat-block">
            <div class="repeat-head">
              <input v-model="exp.role" type="text" placeholder="职位" style="flex: 1" />
              <input v-model="exp.period" type="text" placeholder="时间" style="width: 150px" />
              <button class="mini-btn danger" @click="removeItem(form.experiences, ei)">删</button>
            </div>
            <div class="form-field">
              <input v-model="exp.org" type="text" placeholder="组织/公司" />
            </div>
            <div v-for="(point, pi2) in exp.points" :key="'p' + ei + '-' + pi2" class="repeat-row">
              <textarea v-model="exp.points[pi2]" rows="2" placeholder="工作内容描述"></textarea>
              <button class="mini-btn danger" @click="removeItem(exp.points, pi2)">删</button>
            </div>
            <button class="btn-ghost small" @click="addPoint(exp)">+ 添加描述</button>
          </div>
          <button class="btn-ghost" @click="addExperience">+ 添加工作经历</button>
        </section>
      </div>
    </template>

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
            <ResumeContent :content="form" />
          </div>
        </div>
      </aside>
    </transition>

    <!-- 新建版本弹窗 -->
    <transition name="modal-fade">
      <div v-if="createOpen" class="modal-mask" @click.self="closeCreate">
        <div class="create-modal" role="dialog" aria-modal="true" aria-label="新建简历版本">
          <div class="modal-head">
            <span>新建简历版本</span>
            <button class="modal-close" title="关闭" :disabled="creating" @click="closeCreate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>版本名称</label>
              <input
                v-model="createName"
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
            <button class="btn-ghost" :disabled="creating" @click="closeCreate">取消</button>
            <button class="btn-primary" :disabled="creating" @click="confirmCreate">
              {{ creating ? '创建中…' : '创建版本' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 删除版本确认弹窗 -->
    <transition name="modal-fade">
      <div v-if="deleteOpen" class="modal-mask" @click.self="closeDelete">
        <div class="create-modal confirm-modal" role="dialog" aria-modal="true" aria-label="删除简历版本">
          <div class="modal-head">
            <span>删除简历版本</span>
            <button class="modal-close" title="关闭" :disabled="deleting" @click="closeDelete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
            <button class="btn-ghost" :disabled="deleting" @click="closeDelete">取消</button>
            <button class="btn-danger" :disabled="deleting" @click="confirmDelete">
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

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
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

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}
.btn-ghost:hover { color: var(--accent); border-color: var(--accent); }
.btn-ghost.small { padding: 4px 8px; font-size: 12px; margin-top: 6px; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.empty { padding: 48px; text-align: center; color: var(--text-tertiary); }

/* ===== Version bar ===== */
.version-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}
.version-item {
  flex: 1 1 220px;
  max-width: 300px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  cursor: pointer;
  transition: all var(--transition);
}
.version-item:hover { border-color: var(--accent); }
.version-item.selected { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
.version-name { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.version-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.active-tag {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  padding: 2px 8px;
  border-radius: 100px;
}
.version-time { font-size: 12px; color: var(--text-tertiary); }
.version-actions { display: flex; gap: 8px; }
.mini-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
}
.mini-btn:hover { color: var(--accent); border-color: var(--accent); }
.mini-btn.danger:hover { color: #e03131; border-color: #e03131; }
.mini-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Edit main ===== */
.edit-main {
  display: block;
  max-width: 1100px;
}

.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.04em;
  margin: 22px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}
.panel-title:first-child { margin-top: 0; }

.form-field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 720px) {
  .form-row { grid-template-columns: 1fr; }
}
.form-field input,
.form-field textarea,
.repeat-row input,
.repeat-row textarea,
.repeat-row select {
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-body);
  color: var(--text-primary);
  font-size: 13.5px;
  font-family: inherit;
  resize: vertical;
}
.form-field input:focus,
.form-field textarea:focus,
.repeat-row input:focus,
.repeat-row textarea:focus,
.repeat-row select:focus { outline: none; border-color: var(--accent); }
.form-field textarea { min-height: 40px; }

.repeat-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 12px;
  background: var(--bg-soft);
}
.repeat-head { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.repeat-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.repeat-row input { flex: 1; min-width: 0; }
.repeat-row select { width: 90px; }
.check-label { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text-secondary); white-space: nowrap; }

/* ===== Panel title with action ===== */
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.panel-title-row .btn-ghost { margin: 0; white-space: nowrap; }

/* ===== Version name + active status ===== */
.version-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.version-name-row input { flex: 1; }
.edit-status {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}
.edit-status.active {
  color: var(--accent);
  font-weight: 600;
}

/* ===== a as ghost button ===== */
a.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}

/* ===== Preview drawer ===== */
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

/* ===== 新建版本弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
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
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.modal-close {
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
.modal-close:hover { color: var(--accent); border-color: var(--accent); }
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
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-secondary);
  cursor: pointer;
}
.radio-row input { width: auto; accent-color: var(--accent); }
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
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
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13.5px;
  line-height: 1.6;
}
.confirm-warn svg {
  flex-shrink: 0;
  color: #e5484d;
  margin-top: 1px;
}
.confirm-warn p { margin: 0; }
.confirm-name {
  color: var(--text-primary);
  font-weight: 700;
  word-break: break-all;
}
.btn-danger {
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: #e5484d;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
  white-space: nowrap;
}
.btn-danger:hover:not(:disabled) { background: #d7363b; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

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
  max-width: 360px;
}
.toast.success { background: #2d8264; }
.toast.error { background: #e03131; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
