<script setup>
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()

const loading = ref(true)
const saving = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

const personas = ref([])
const activeId = ref('')
const form = ref({
  name: '',
  greeting: '',
  description: '',
  basicInfo: '',
  styleHint: '',
  accentColor: '#2d8264',
  avatarEmoji: '',
  personalityType: '',
})

let suppressDirty = false
const dirty = ref(false)
watch(
  () => JSON.stringify(form.value),
  () => { if (!suppressDirty) dirty.value = true },
)

const activePersona = computed(() => personas.value.find((p) => p.id === activeId.value) || null)

async function loadPersonas() {
  loading.value = true
  try {
    const list = await api.get('/admin/digital-life/personas')
    personas.value = list
    if (list.length && !list.find((p) => p.id === activeId.value)) {
      await selectPersona(list[0].id)
    }
  } catch (e) {
    showToast('加载人格列表失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

/* 未保存修改时切换人格的确认弹窗 */
const leaveOpen = ref(false)
const pendingPersonaId = ref('')

function selectPersona(id) {
  if (id === activeId.value) return
  if (dirty.value) {
    pendingPersonaId.value = id
    leaveOpen.value = true
    return
  }
  doSelectPersona(id)
}

async function doSelectPersona(id) {
  activeId.value = id
  suppressDirty = true
  try {
    const detail = await api.get(`/admin/digital-life/personas/${id}`)
    form.value = {
      name: detail.name || '',
      greeting: detail.greeting || '',
      description: detail.description || '',
      basicInfo: detail.basicInfo || '',
      styleHint: detail.styleHint || '',
      accentColor: detail.accentColor || '#2d8264',
      avatarEmoji: detail.avatarEmoji || '',
      personalityType: detail.personalityType || '',
    }
    dirty.value = false
  } catch (e) {
    showToast('加载人格详情失败: ' + e.message, 'error')
  } finally {
    await nextTick()
    suppressDirty = false
  }
}

function confirmLeave() {
  leaveOpen.value = false
  const id = pendingPersonaId.value
  pendingPersonaId.value = ''
  if (id) doSelectPersona(id)
}

function cancelLeave() {
  leaveOpen.value = false
  pendingPersonaId.value = ''
}

async function savePersona() {
  if (!activeId.value || saving.value) return
  saving.value = true
  try {
    await api.put(`/admin/digital-life/personas/${activeId.value}`, {
      name: form.value.name.trim(),
      greeting: form.value.greeting.trim(),
      description: form.value.description.trim(),
      basicInfo: form.value.basicInfo.trim(),
      styleHint: form.value.styleHint.trim(),
      accentColor: form.value.accentColor,
      avatarEmoji: form.value.avatarEmoji.trim(),
      personalityType: form.value.personalityType.trim(),
    })
    dirty.value = false
    showToast('人格配置已保存', 'success')
    await loadPersonas()
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(async () => {
  await loadPersonas()
})
</script>

<template>
  <div class="persona-manage">
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
            <span class="kicker">Digital Life · 人格</span>
            <h1>人格编写</h1>
          </div>
          <div class="hero-side">
            <span class="autosave-status" :class="{ dirty }">
              {{ saving ? '保存中…' : dirty ? '未保存修改' : '' }}
            </span>
            <button class="btn btn--primary" type="button" :disabled="saving || !activeId" @click="savePersona()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {{ saving ? '保存中…' : '保存人格' }}
            </button>
          </div>
        </div>
        <p class="lede">编写数字人生的各个人格：基本信息、问候语、性格描述、回复风格与主题色。</p>
        <p class="hero-note">{{ personas.length }} 个人格 · 保存后前台对话即时生效</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <template v-else>
      <!-- ===== 人格切换 ===== -->
      <section class="persona-bar">
        <div
          v-for="p in personas"
          :key="p.id"
          class="persona-item"
          :class="{ selected: p.id === activeId }"
          @click="selectPersona(p.id)"
        >
          <span class="persona-emoji" :style="{ '--p-accent': p.accentColor }">{{ p.avatarEmoji || '🙂' }}</span>
          <div class="persona-meta">
            <div class="persona-name">{{ p.name }}</div>
            <div class="persona-type">{{ p.personalityType || '—' }}</div>
          </div>
        </div>
      </section>

      <!-- ===== Settings ===== -->
      <div class="settings-wrap">
        <section class="settings-card">
          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pName">人格名称</label>
            </div>
            <input id="pName" v-model="form.name" class="form-input" type="text" placeholder="如：小墨" />
            <p class="field-hint">对话窗口显示的名称。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pGreeting">问候语</label>
            </div>
            <textarea id="pGreeting" v-model="form.greeting" class="form-input form-textarea" rows="2" placeholder="如：你好呀，我是小墨，很高兴见到你～"></textarea>
            <p class="field-hint">打开对话时的第一句话。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pBasic">基本信息</label>
            </div>
            <textarea id="pBasic" v-model="form.basicInfo" class="form-input form-textarea" rows="5" placeholder="如：&#10;姓名：小墨&#10;职业：产品经理 / 设计师&#10;所在城市：杭州&#10;兴趣：登山、写作、独立开发"></textarea>
            <p class="field-hint">站主的事实性资料（姓名、职业、城市、兴趣等），前台数字生命据此回答相关问题。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pDesc">性格描述</label>
            </div>
            <textarea id="pDesc" v-model="form.description" class="form-input form-textarea" rows="5" placeholder="描述人格的性格、背景、喜好…"></textarea>
            <p class="field-hint">写入 system prompt 的核心人格设定。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pStyle">回复风格提示</label>
            </div>
            <textarea id="pStyle" v-model="form.styleHint" class="form-input form-textarea" rows="3" placeholder="如：用轻松幽默的语气回复，偶尔用 emoji 点缀"></textarea>
            <p class="field-hint">控制语气、篇幅、格式等回复风格。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pType">MBTI / 人格标签</label>
            </div>
            <input id="pType" v-model="form.personalityType" class="form-input" type="text" placeholder="如：ENFJ" />
            <p class="field-hint">展示在人格切换卡片的标签。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pEmoji">头像 Emoji</label>
            </div>
            <input id="pEmoji" v-model="form.avatarEmoji" class="form-input input-emoji" type="text" placeholder="🙂" />
            <p class="field-hint">人格切换卡片左侧的圆形头像。</p>
          </div>

          <div class="field">
            <div class="field-head">
              <label class="field-label" for="pColor">主题色</label>
              <span class="color-chip" :style="{ backgroundColor: form.accentColor }">{{ form.accentColor }}</span>
            </div>
            <input id="pColor" v-model="form.accentColor" class="form-input input-color" type="color" />
            <p class="field-hint">对话窗口的气泡与强调色。</p>
          </div>
        </section>
      </div>
    </template>

    <!-- ===== 未保存修改确认 ===== -->
    <ConfirmDialog
      :open="leaveOpen"
      title="未保存的修改"
      confirm-label="放弃修改"
      :danger="false"
      @cancel="cancelLeave"
      @confirm="confirmLeave"
    >
      当前人格有未保存的修改，切换后修改将丢失，是否继续？
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.persona-manage { position: relative; }

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

/* ===== Persona bar ===== */
.persona-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 22px 0 8px;
}
.persona-item {
  flex: 1 1 200px;
  max-width: 280px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: all var(--transition);
}
.persona-item:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.persona-item.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
.persona-emoji {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0;
  font-size: 24px;
  background-color: color-mix(in srgb, var(--p-accent, var(--accent)) 14%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--p-accent, var(--accent)) 45%, transparent);
}
.persona-meta { min-width: 0; }
.persona-name {
  font-family: var(--font-serif); font-size: 15px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  margin-bottom: 3px; word-break: break-all;
}
.persona-item.selected .persona-name { color: var(--accent); }
.persona-type {
  font-family: var(--font-mono); font-size: 11.5px; color: var(--text-tertiary);
}

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
.color-chip {
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  color: #fff; padding: 3px 12px; border-radius: 100px;
  box-shadow: var(--shadow-sm);
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
  font-size: 13.5px; line-height: 1.7;
  resize: vertical; min-height: 44px;
}
.input-emoji { max-width: 140px; text-align: center; font-size: 18px; }
.input-color {
  width: 72px; height: 40px; padding: 3px; cursor: pointer;
  border-radius: var(--radius-sm);
}
.input-color::-webkit-color-swatch-wrapper { padding: 2px; }
.input-color::-webkit-color-swatch { border: none; border-radius: 4px; }

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
  .hero-side { width: 100%; justify-content: space-between; }
  .field { padding: 18px; }
  .persona-item { flex: 1 1 100%; max-width: none; }
}
</style>
