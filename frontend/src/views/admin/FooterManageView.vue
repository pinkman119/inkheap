<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'
import SocialIcon from '@/components/SocialIcon.vue'
import { FOOTER_ICONS, DEFAULT_FOOTER_ICON, getFooterIconLabel } from '@/utils/footer-icons'

const api = useApi()

const links = ref([])
const loading = ref(true)
const toastMsg = ref('')
const toastType = ref('success')

// ===== Modal 状态 =====
const showModal = ref(false)
const saving = ref(false)
const editingId = ref(null) // null = 新建
const emptyForm = () => ({
  type: 'nav',
  mode: 0,
  label: '',
  url: '',
  icon: DEFAULT_FOOTER_ICON,
  svg: '',
})
const form = ref(emptyForm())

// 是否为自定义 SVG 图标模式（true 时忽略预设 icon）
const useCustomSvg = computed(() => !!form.value.svg.trim())

const modalTitle = computed(() => {
  const isSocial = form.value.type === 'social'
  const action = editingId.value ? '编辑' : '新增'
  return action + (isSocial ? '社交图标' : '链接')
})

// ===== 备案信息（全站单条配置） =====
const config = ref({ icpNo: '', icpUrl: '' })
const configSaving = ref(false)

async function loadConfig() {
  try {
    const data = await api.get('/admin/footer-config')
    if (data) config.value = data
  } catch (e) {
    showToast('备案信息加载失败: ' + e.message, 'error')
  }
}

async function saveConfig() {
  const icpUrl = (config.value.icpUrl || '').trim()
  if (icpUrl && !/^https?:\/\//i.test(icpUrl)) {
    showToast('备案地址需以 http:// 或 https:// 开头', 'error')
    return
  }
  configSaving.value = true
  try {
    const data = await api.put('/admin/footer-config', {
      icpNo: (config.value.icpNo || '').trim(),
      icpUrl,
    })
    if (data) config.value = data
    showToast('备案信息已保存', 'success')
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    configSaving.value = false
  }
}

// ===== 删除确认 =====
const showDeleteModal = ref(false)
const deleteTarget = ref(null)

// 后台展示顺序：导航 → 扩展 → 社交图标，各自按 sortOrder
const sortedLinks = computed(() => {
  const order = { nav: 0, ext: 1, social: 2 }
  return [...links.value].sort((a, b) => {
    const ta = order[a.type] ?? 9
    const tb = order[b.type] ?? 9
    if (ta !== tb) return ta - tb
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
})

// 判断某条记录是否为同类型中的第一个 / 最后一个（用于禁用上移/下移）
function isFirstInType(item) {
  const sameType = links.value
    .filter((l) => l.type === item.type)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return sameType[0]?.id === item.id
}
function isLastInType(item) {
  const sameType = links.value
    .filter((l) => l.type === item.type)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return sameType[sameType.length - 1]?.id === item.id
}

const typeLabel = (t) => (t === 'nav' ? '导航' : t === 'ext' ? '扩展' : '社交')
const modeLabel = (m) => (m === 0 ? '全模式' : m === 1 ? '工作' : '生活')
const iconLabel = (item) => (item.svg ? '自定义 SVG' : getFooterIconLabel(item.icon))

async function load() {
  loading.value = true
  try {
    links.value = await api.get('/admin/footer-links')
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  loadConfig()
})

// ===== 新建 / 编辑 =====
function openCreate(type = 'nav') {
  editingId.value = null
  form.value = { ...emptyForm(), type }
  showModal.value = true
}

function openEdit(item) {
  editingId.value = item.id
  form.value = {
    type: item.type,
    mode: item.mode ?? 0,
    label: item.label,
    url: item.url,
    icon: item.icon || DEFAULT_FOOTER_ICON,
    svg: item.svg || '',
  }
  showModal.value = true
}

async function save() {
  if (!form.value.label.trim()) {
    showToast('请填写显示名称', 'error')
    return
  }
  if (!form.value.url.trim()) {
    showToast('请填写 URL 地址', 'error')
    return
  }
  saving.value = true
  const customSvg = form.value.svg.trim()
  if (form.value.type === 'social' && customSvg && !/<svg[\s\S]*<\/svg>/i.test(customSvg)) {
    showToast('自定义图标需为完整的 SVG 代码（以 <svg> 开头、</svg> 结尾）', 'error')
    saving.value = false
    return
  }
  const payload = {
    type: form.value.type,
    mode: Number(form.value.mode),
    label: form.value.label.trim(),
    url: form.value.url.trim(),
  }
  if (form.value.type === 'social') {
    // 自定义 SVG 优先级高于预设图标
    payload.icon = customSvg ? null : form.value.icon || DEFAULT_FOOTER_ICON
    payload.svg = customSvg || null
  } else {
    payload.icon = null
    payload.svg = null
  }
  try {
    if (editingId.value) {
      await api.put(`/admin/footer-links/${editingId.value}`, payload)
      showToast('链接已更新', 'success')
    } else {
      await api.post('/admin/footer-links', payload)
      showToast('链接已添加', 'success')
    }
    showModal.value = false
    await load()
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

// ===== 上移 / 下移 =====
async function move(item, direction) {
  try {
    await api.post('/admin/footer-links/move', { id: item.id, direction })
    await load()
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
  }
}

// ===== 删除 =====
function confirmDelete(item) {
  deleteTarget.value = item
  showDeleteModal.value = true
}
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await api.delete(`/admin/footer-links/${deleteTarget.value.id}`)
    showToast(`「${deleteTarget.value.label}」已删除`, 'success')
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
  <div class="footer-manage">
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
            <span class="kicker">Footer · 底部</span>
            <h1>底部管理</h1>
          </div>
          <div class="hero-side">
            <button class="btn btn--ghost" type="button" @click="openCreate('nav')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              新增链接
            </button>
            <button class="btn btn--primary" type="button" @click="openCreate('social')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增图标
            </button>
          </div>
        </div>
        <p class="lede">维护页脚「导航」「扩展」链接，以及顶部品牌区右侧的圆形「社交图标」。</p>
        <p class="hero-note">{{ links.length }} 条记录 · 导航为站内路由，扩展/社交为外链 · 按当前模式（工作/生活）过滤展示</p>
      </div>
    </section>

    <!-- ===== 备案信息（全站单条配置） ===== -->
    <section v-if="config" class="icp-card">
      <div class="icp-card__head">
        <span class="icp-card__title">备案信息</span>
        <span class="icp-card__desc">展示在页脚底部版权行，全站唯一配置；备案号留空则不展示</span>
      </div>
      <div class="icp-card__body">
        <div class="form-field">
          <label class="field-label" for="icpNo">备案号</label>
          <input
            id="icpNo"
            v-model="config.icpNo"
            type="text"
            placeholder="如：苏ICP备2024125779号"
          />
        </div>
        <div class="form-field">
          <label class="field-label" for="icpUrl">备案地址</label>
          <input
            id="icpUrl"
            v-model="config.icpUrl"
            type="text"
            class="input-mono"
            placeholder="https://beian.miit.gov.cn"
          />
          <small class="hint">点击备案号跳转的链接，留空则默认跳转工信部备案查询系统</small>
        </div>
        <div class="icp-card__foot">
          <button class="btn btn--primary" type="button" :disabled="configSaving" @click="saveConfig">
            {{ configSaving ? '保存中…' : '保存备案信息' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ===== Loading / Empty ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>
    <div v-else-if="!links.length" class="empty">
      <div class="empty__illus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </div>
      <p class="empty__title">暂无底部链接</p>
      <p class="empty__sub">点击右上角「新增链接」或「新增图标」开始配置</p>
    </div>

    <!-- ===== List ===== -->
    <section v-else class="list-card">
      <ul class="link-list">
        <li v-for="item in sortedLinks" :key="item.id" class="link-row">
          <span class="link-type" :class="item.type">{{ typeLabel(item.type) }}</span>
          <span class="link-mode" :class="'mode-' + (item.mode ?? 0)">{{ modeLabel(item.mode ?? 0) }}</span>
          <span v-if="item.type === 'social'" class="link-icon" :title="iconLabel(item)">
            <SocialIcon :name="item.icon" :svg="item.svg" />
          </span>
          <span class="link-label">{{ item.label }}</span>
          <span v-if="item.type === 'social'" class="link-icon-name">{{ iconLabel(item) }}</span>
          <span class="link-url">{{ item.url }}</span>
          <span class="link-actions">
            <button class="mini-btn" :disabled="isFirstInType(item)" title="上移" @click="move(item, 'up')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="mini-btn" :disabled="isLastInType(item)" title="下移" @click="move(item, 'down')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="mini-btn" @click="openEdit(item)">编辑</button>
            <button class="mini-btn danger" @click="confirmDelete(item)">删除</button>
          </span>
        </li>
      </ul>
    </section>

    <!-- 新建/编辑 Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal-card" :class="{ 'modal-card--wide': form.type === 'social' }" role="dialog" aria-modal="true" :aria-label="modalTitle">
            <div class="modal-head">
              <span class="modal-title">{{ modalTitle }}</span>
              <button class="modal-close" title="关闭" :disabled="saving" @click="showModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <div class="form-field">
                  <label class="field-label" for="fType">类型</label>
                  <select id="fType" v-model="form.type">
                    <option value="nav">导航（站内路由）</option>
                    <option value="ext">扩展（外链）</option>
                    <option value="social">社交（圆形图标）</option>
                  </select>
                </div>
                <div class="form-field">
                  <label class="field-label" for="fMode">显示模式</label>
                  <select id="fMode" v-model="form.mode">
                    <option :value="0">全模式</option>
                    <option :value="1">仅工作</option>
                    <option :value="2">仅生活</option>
                  </select>
                </div>
              </div>
              <div class="form-field">
                <label class="field-label" for="fLabel">显示名称</label>
                <input id="fLabel" v-model="form.label" type="text" placeholder="如：联系我" />
              </div>
              <div class="form-field">
                <label class="field-label" for="fUrl">URL 地址</label>
                <input
                  id="fUrl"
                  v-model="form.url"
                  type="text"
                  class="input-mono"
                  :placeholder="form.type === 'nav' ? '站内路径，如 /contact' : '外链，如 https://…'"
                />
                <small v-if="form.type === 'nav'" class="hint">导航按站内路由跳转，请填写以 / 开头的路径</small>
                <small v-else class="hint">外链，在新标签页打开；邮箱请填 mailto:xxx@xx.com</small>
              </div>

              <!-- ===== 社交图标专属配置 ===== -->
              <template v-if="form.type === 'social'">
                <div class="form-field">
                  <label class="field-label">图标预览</label>
                  <div class="icon-preview">
                    <span class="icon-preview__circle">
                      <SocialIcon :name="form.icon" :svg="form.svg" />
                    </span>
                    <span class="icon-preview__text">
                      {{ useCustomSvg ? '自定义 SVG' : getFooterIconLabel(form.icon) }}
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
                      :class="{ active: !useCustomSvg && form.icon === ic.key }"
                      :title="ic.label"
                      @click="form.icon = ic.key; form.svg = ''"
                    >
                      <SocialIcon :name="ic.key" />
                    </button>
                  </div>
                </div>
                <div class="form-field">
                  <label class="field-label" for="fSvg">
                    自定义图标（可选，填了则优先于预设图标）
                  </label>
                  <textarea
                    id="fSvg"
                    v-model="form.svg"
                    class="input-mono svg-input"
                    rows="4"
                    spellcheck="false"
                    placeholder='<svg viewBox="0 0 24 24">...</svg>'
                  />
                  <small class="hint">粘贴完整 SVG 源码（推荐 24×24 / 1024×1024 viewBox），尺寸由容器自适应</small>
                </div>
              </template>
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
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal-card modal-card--confirm" role="dialog" aria-modal="true" aria-label="确认删除">
            <div class="modal-head">
              <span class="modal-title">删除链接</span>
              <button class="modal-close" title="关闭" @click="showDeleteModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="confirm-warn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <p>确定要删除「<strong>{{ deleteTarget?.label }}</strong>」吗？此操作不可撤销，前端页脚将不再显示该链接。</p>
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
.footer-manage { position: relative; }

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

/* ===== 备案信息卡片 ===== */
.icp-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 22px 0 0;
}
.icp-card__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-soft);
}
.icp-card__title {
  font-family: var(--font-serif);
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}
.icp-card__desc { font-size: 12.5px; color: var(--text-tertiary); }
.icp-card__body {
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.6fr);
  gap: 16px 18px;
  align-items: start;
}
.icp-card__foot { grid-column: 1 / -1; display: flex; }

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

/* ===== List card ===== */
.list-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 22px 0 8px;
}
.link-list { list-style: none; margin: 0; padding: 6px 0; }
.link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  border-radius: var(--radius-sm);
  margin: 0 6px;
  transition: background-color var(--transition);
}
.link-row + .link-row { margin-top: 2px; }
.link-row:hover { background-color: color-mix(in srgb, var(--accent-light) 35%, transparent); }

.link-type {
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;
  color: var(--accent); background-color: var(--accent-light);
  padding: 2px 9px; border-radius: 100px;
  flex-shrink: 0;
}
.link-type.ext { color: #2b6cb0; background-color: rgba(43, 108, 176, 0.12); }
.link-type.social { color: #8a5a2b; background-color: rgba(138, 90, 43, 0.14); }

/* 列表中的社交图标预览 */
.link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.link-icon :deep(svg),
.link-icon :deep(span) { width: 14px; height: 14px; }
.link-icon-name {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-tertiary);
  background-color: var(--bg-soft);
  padding: 2px 9px;
  border-radius: 100px;
  flex-shrink: 0;
  white-space: nowrap;
}
.link-mode {
  font-family: var(--font-mono); font-size: 11.5px; font-weight: 500;
  color: var(--text-tertiary); background-color: var(--bg-soft);
  padding: 2px 9px; border-radius: 100px;
  flex-shrink: 0;
}
.link-mode.mode-1 { color: #b0692b; background-color: rgba(176, 105, 43, 0.12); }
.link-mode.mode-2 { color: #6f42c1; background-color: rgba(111, 66, 193, 0.12); }

.link-label {
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex-shrink: 0;
  max-width: 140px;
}
.link-url {
  font-family: var(--font-mono); font-size: 12.5px; color: var(--text-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-width: 0;
}
.link-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }

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
.input-mono { font-family: var(--font-mono); font-size: 13px; }
.form-field select {
  cursor: pointer; appearance: none; -webkit-appearance: none;
  padding-right: 30px;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
.form-row { display: flex; gap: 14px; }
.form-row .form-field { flex: 1; min-width: 0; }

/* ===== 社交图标：预览 / 选择器 / 自定义 SVG ===== */
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
  .icp-card__body { grid-template-columns: 1fr; }
  .link-row { padding: 10px 12px; gap: 8px; margin: 0 4px; flex-wrap: wrap; }
  .link-url { flex-basis: 100%; order: 5; }
  .link-actions { margin-left: auto; }
  .form-row { flex-direction: column; }
  .modal-card--wide { width: calc(100vw - 32px); }
  .icon-picker { grid-template-columns: repeat(auto-fill, minmax(34px, 1fr)); }
}
</style>
