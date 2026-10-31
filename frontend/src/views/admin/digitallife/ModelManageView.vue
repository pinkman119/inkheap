<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()

const loading = ref(true)
const actionLoading = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

const models = ref([])
const testingId = ref(null)
const testResult = ref({}) // id -> { ok, message }

/** 模型类型枚举（与后端 MODEL_TYPES 对应，预留扩展枚举） */
const MODEL_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'general', label: '通用' },
  { value: 'embedding', label: '嵌入' },
]
const MODEL_TYPE_LABELS = { general: '通用', embedding: '嵌入' }
const typeFilter = ref('all')

const filteredModels = computed(() => {
  if (typeFilter.value === 'all') return models.value
  return models.value.filter((m) => (m.modelType || 'general') === typeFilter.value)
})

async function loadModels() {
  loading.value = true
  try {
    const list = await api.get('/admin/digital-life/models')
    models.value = list
  } catch (e) {
    showToast('加载模型列表失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function toggleModel(m) {
  actionLoading.value = true
  try {
    await api.put(`/admin/digital-life/models/${m.id}/toggle`)
    showToast(m.enabled ? `已停用 ${m.name}` : `已启用 ${m.name}`, 'success')
    await loadModels()
  } catch (e) {
    showToast('操作失败: ' + e.message, 'error')
  } finally {
    actionLoading.value = false
  }
}

// ===== 删除确认弹窗 =====
const confirmOpen = ref(false)
const pendingItem = ref(null)
const deleting = ref(false)

function deleteModel(m) {
  pendingItem.value = m
  confirmOpen.value = true
}

function cancelDelete() {
  confirmOpen.value = false
  pendingItem.value = null
}

async function confirmDelete() {
  const m = pendingItem.value
  if (!m || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/digital-life/models/${m.id}`)
    confirmOpen.value = false
    pendingItem.value = null
    showToast(`已删除 ${m.name}`, 'success')
    await loadModels()
  } catch (e) {
    showToast('删除失败: ' + e.message, 'error')
  } finally {
    deleting.value = false
  }
}

async function testModel(m) {
  testingId.value = m.id
  testResult.value = { ...testResult.value, [m.id]: null }
  try {
    const res = await api.post(`/admin/digital-life/models/${m.id}/test`, {})
    // 后端 200 也可能返回 success:false（如未配置 Key），按字段判定成败
    testResult.value = {
      ...testResult.value,
      [m.id]: { ok: res.success !== false, message: res.message || '连接成功' },
    }
  } catch (e) {
    testResult.value = { ...testResult.value, [m.id]: { ok: false, message: e.message || '连接失败' } }
  } finally {
    testingId.value = null
  }
}

function providerName(p) {
  const map = { openai: 'OpenAI', anthropic: 'Anthropic', zhipu: '智谱 AI', deepseek: 'DeepSeek', qwen: '通义千问' }
  return map[p] || p
}

// ===== 配置弹窗 =====
const showEditModal = ref(false)
const saving = ref(false)
const editingModel = ref(null)
const showKey = ref(false)
const keyTouched = ref(false)
const clearKey = ref(false)
const editForm = ref({ name: '', modelId: '', modelType: 'general', apiKey: '' })

/** 各厂商常用对话模型 ID 建议（仅输入提示，不限制自定义输入） */
const MODEL_PRESETS = {
  zhipu: ['glm-4.7', 'glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-flash', 'glm-4-flash'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  qwen: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
}

/** 各厂商常用嵌入模型 ID 建议（需支持 OpenAI 兼容 /embeddings 接口） */
const EMBEDDING_PRESETS = {
  zhipu: ['embedding-3'],
  openai: ['text-embedding-3-small', 'text-embedding-3-large'],
  qwen: ['text-embedding-v3'],
}

/** 当前编辑模型的厂商对应输入建议（按模型类型区分对话 / 嵌入） */
const editPresets = computed(() => {
  const provider = editingModel.value?.provider
  const pool = editForm.value.modelType === 'embedding' ? EMBEDDING_PRESETS : MODEL_PRESETS
  return pool[provider] || []
})

const keyPlaceholder = computed(() =>
  editingModel.value?.hasApiKey
    ? `当前已保存 ${editingModel.value.apiKeyMasked}，留空保持不变`
    : '尚未配置，输入该模型的 API Key',
)

function openEdit(m) {
  editingModel.value = m
  editForm.value = { name: m.name, modelId: m.modelId, modelType: m.modelType || 'general', apiKey: '' }
  keyTouched.value = false
  clearKey.value = false
  showKey.value = false
  showEditModal.value = true
}

function closeEdit() {
  if (saving.value) return
  showEditModal.value = false
}

async function saveModel() {
  if (!editingModel.value || saving.value) return
  const name = editForm.value.name.trim()
  const modelId = editForm.value.modelId.trim()
  if (!name) { showToast('显示名称不能为空', 'error'); return }
  if (!modelId) { showToast('模型 ID 不能为空', 'error'); return }

  // apiKey：勾选清除 → 空串；输入过且非空 → 新值；否则不传（保留原值）
  const apiKey = clearKey.value ? '' : keyTouched.value ? editForm.value.apiKey.trim() : undefined
  const payload = { name, modelId, modelType: editForm.value.modelType }
  if (apiKey !== undefined) payload.apiKey = apiKey

  saving.value = true
  try {
    await api.put(`/admin/digital-life/models/${editingModel.value.id}`, payload)
    showToast(`「${name}」配置已保存`, 'success')
    showEditModal.value = false
    await loadModels()
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

// ===== 新增弹窗 =====
const PROVIDERS = [
  { value: 'zhipu', label: '智谱 AI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'qwen', label: '通义千问' },
  { value: 'anthropic', label: 'Anthropic' },
]

const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', provider: 'zhipu', modelId: '', modelType: 'general', apiKey: '' })

/** 新增弹窗的模型 ID 输入建议（按厂商 × 类型） */
const createPresets = computed(() => {
  const pool = createForm.value.modelType === 'embedding' ? EMBEDDING_PRESETS : MODEL_PRESETS
  return pool[createForm.value.provider] || []
})

function openCreate() {
  createForm.value = { name: '', provider: 'zhipu', modelId: '', modelType: 'general', apiKey: '' }
  showCreateModal.value = true
}

function closeCreate() {
  if (creating.value) return
  showCreateModal.value = false
}

async function createModel() {
  if (creating.value) return
  const name = createForm.value.name.trim()
  const modelId = createForm.value.modelId.trim()
  if (!name) { showToast('显示名称不能为空', 'error'); return }
  if (!modelId) { showToast('模型 ID 不能为空', 'error'); return }

  creating.value = true
  try {
    const payload = {
      name,
      provider: createForm.value.provider,
      modelId,
      modelType: createForm.value.modelType,
    }
    const apiKey = createForm.value.apiKey.trim()
    if (apiKey) payload.apiKey = apiKey
    await api.post('/admin/digital-life/models', payload)
    showToast(`已新增模型「${name}」，默认停用，请配置后启用`, 'success')
    showCreateModal.value = false
    await loadModels()
  } catch (e) {
    showToast('新增失败: ' + e.message, 'error')
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await loadModels()
})
</script>

<template>
  <div class="model-manage">
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
            <span class="kicker">Digital Life · 模型</span>
            <h1>模型管理</h1>
          </div>
          <button class="btn btn--primary" @click="openCreate()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增模型
          </button>
        </div>
        <p class="lede">管理数字人生的 LLM 接入：配置 API Key、启用 / 停用模型、测试连通性。通用模型用于对话，嵌入模型用于训练与检索。</p>
        <p class="hero-note">{{ models.length }} 个模型 · 通用 {{ models.filter(m => (m.modelType || 'general') === 'general').length }} 个 · 嵌入 {{ models.filter(m => m.modelType === 'embedding').length }} 个 · 已配置 Key {{ models.filter(m => m.hasApiKey).length }} 个</p>
      </div>
    </section>

    <!-- ===== 类型分类筛选 ===== -->
    <div class="type-tabs" role="tablist" aria-label="按模型类型筛选">
      <button
        v-for="t in MODEL_TYPES"
        :key="t.value"
        class="type-tab"
        :class="{ active: typeFilter === t.value }"
        role="tab"
        :aria-selected="typeFilter === t.value"
        @click="typeFilter = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== Empty ===== -->
    <div v-else-if="!models.length" class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
      <span>暂无可用模型。</span>
    </div>

    <!-- ===== List ===== -->
    <div v-else class="models-wrap">
      <div
        v-for="m in filteredModels"
        :key="m.id"
        class="model-card"
        :class="{ disabled: !m.enabled }"
      >
        <div class="model-head">
          <div class="model-name-group">
            <span class="provider-tag">{{ providerName(m.provider) }}</span>
            <span class="type-tag" :class="(m.modelType || 'general') === 'embedding' ? 'embedding' : 'general'">
              {{ MODEL_TYPE_LABELS[m.modelType || 'general'] }}
            </span>
            <h3 class="model-name">{{ m.name }}</h3>
          </div>
          <span class="status-dot" :class="m.enabled ? 'on' : 'off'">
            {{ m.enabled ? '启用中' : '已停用' }}
          </span>
        </div>
        <p class="model-id">{{ m.modelId }}</p>
        <div class="key-row" :class="m.hasApiKey ? 'set' : 'missing'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <span v-if="m.hasApiKey" class="key-value">{{ m.apiKeyMasked }}</span>
          <span v-else>未配置 API Key · 点击「配置」填写</span>
        </div>
        <div v-if="testResult[m.id]" class="test-result" :class="testResult[m.id].ok ? 'ok' : 'fail'">
          <svg v-if="testResult[m.id].ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span>{{ testResult[m.id].message }}</span>
        </div>
        <div class="model-actions">
          <button class="mini-btn" :disabled="actionLoading" @click="openEdit(m)">配置</button>
          <button class="mini-btn" :disabled="testingId === m.id" @click="testModel(m)">
            {{ testingId === m.id ? '测试中…' : '测试连接' }}
          </button>
          <button class="mini-btn" :class="{ danger: m.enabled }" :disabled="actionLoading" @click="toggleModel(m)">
            {{ m.enabled ? '停用' : '启用' }}
          </button>
          <button class="mini-btn danger" :disabled="actionLoading" @click="deleteModel(m)">删除</button>
        </div>
      </div>
    </div>

    <!-- ===== 配置弹窗 ===== -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showEditModal" class="modal-overlay" @mousedown.self="closeEdit()" @click.self="closeEdit()">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="配置模型">
            <div class="modal-head">
              <span class="modal-title">配置模型 · {{ editingModel?.name }}</span>
              <button class="modal-close" title="关闭" :disabled="saving" @click="closeEdit()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="provider-line">
                <span class="provider-tag">{{ providerName(editingModel?.provider) }}</span>
                <span class="provider-note">OpenAI 兼容端点 · Key 加密存储</span>
              </div>

              <div class="form-field">
                <label class="field-label" for="mName">显示名称</label>
                <input id="mName" v-model="editForm.name" type="text" maxlength="60" placeholder="如：GLM-4.6" :disabled="saving" />
              </div>

              <div class="form-field">
                <label class="field-label" for="mModelId">模型 ID</label>
                <input id="mModelId" v-model="editForm.modelId" class="input-mono" type="text" list="model-presets" maxlength="120" placeholder="如：deepseek-v4-flash" :disabled="saving" />
                <datalist id="model-presets">
                  <option v-for="p in editPresets" :key="p" :value="p"></option>
                </datalist>
                <small class="hint">{{ editPresets.length ? '有本厂商常用模型建议，也可直接输入其他模型 ID' : '直接输入模型 ID' }}</small>
              </div>

              <div class="form-field">
                <label class="field-label" for="mModelType">模型类型</label>
                <div class="type-select-wrap">
                  <button
                    v-for="t in MODEL_TYPES.filter(t => t.value !== 'all')"
                    :key="t.value"
                    type="button"
                    class="type-option"
                    :class="{ active: editForm.modelType === t.value }"
                    :disabled="saving"
                    @click="editForm.modelType = t.value"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <small class="hint">
                  <template v-if="editForm.modelType === 'embedding'">嵌入模型用于训练与检索（建议选择 1024 维向量模型）</template>
                  <template v-else>通用模型用于数字生命对话，可按顺序自动切换</template>
                </small>
              </div>

              <div class="form-field">
                <label class="field-label" for="mKey">API Key</label>
                <div class="key-input-wrap">
                  <input
                    id="mKey"
                    v-model="editForm.apiKey"
                    class="input-mono"
                    :type="showKey ? 'text' : 'password'"
                    autocomplete="new-password"
                    spellcheck="false"
                    maxlength="300"
                    :disabled="clearKey || saving"
                    :placeholder="keyPlaceholder"
                    @input="keyTouched = true"
                  />
                  <button type="button" class="key-eye" :title="showKey ? '隐藏' : '显示'" :disabled="clearKey || saving" @click="showKey = !showKey">
                    <svg v-if="!showKey" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
                <small class="hint">以 AES-256-GCM 加密存入数据库，页面仅显示脱敏形式</small>
              </div>

              <label v-if="editingModel?.hasApiKey" class="clear-key" :class="{ checked: clearKey }">
                <input v-model="clearKey" type="checkbox" :disabled="saving" />
                <span>清除已保存的 API Key</span>
              </label>
            </div>
            <div class="modal-foot">
              <button class="btn btn--ghost" :disabled="saving" @click="closeEdit()">取消</button>
              <button class="btn btn--primary" :disabled="saving" @click="saveModel()">
                {{ saving ? '保存中…' : '保存配置' }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- ===== 新增模型弹窗 ===== -->
      <transition name="modal-fade">
        <div v-if="showCreateModal" class="modal-overlay" @mousedown.self="closeCreate()" @click.self="closeCreate()">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="新增模型">
            <div class="modal-head">
              <span class="modal-title">新增模型</span>
              <button class="modal-close" title="关闭" :disabled="creating" @click="closeCreate()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label class="field-label" for="cProvider">厂商</label>
                <div class="type-select-wrap">
                  <button
                    v-for="p in PROVIDERS"
                    :key="p.value"
                    type="button"
                    class="type-option"
                    :class="{ active: createForm.provider === p.value }"
                    :disabled="creating"
                    @click="createForm.provider = p.value"
                  >
                    {{ p.label }}
                  </button>
                </div>
                <small class="hint">均通过 OpenAI 兼容端点接入，Key 加密存储</small>
              </div>

              <div class="form-field">
                <label class="field-label" for="cName">显示名称</label>
                <input id="cName" v-model="createForm.name" type="text" maxlength="60" placeholder="如：GLM-4.6" :disabled="creating" />
              </div>

              <div class="form-field">
                <label class="field-label" for="cModelId">模型 ID</label>
                <input id="cModelId" v-model="createForm.modelId" class="input-mono" type="text" list="create-model-presets" maxlength="120" placeholder="如：glm-4.6" :disabled="creating" />
                <datalist id="create-model-presets">
                  <option v-for="p in createPresets" :key="p" :value="p"></option>
                </datalist>
                <small class="hint">{{ createPresets.length ? '有本厂商常用模型建议，也可直接输入其他模型 ID' : '直接输入模型 ID' }}</small>
              </div>

              <div class="form-field">
                <label class="field-label">模型类型</label>
                <div class="type-select-wrap">
                  <button
                    v-for="t in MODEL_TYPES.filter(t => t.value !== 'all')"
                    :key="t.value"
                    type="button"
                    class="type-option"
                    :class="{ active: createForm.modelType === t.value }"
                    :disabled="creating"
                    @click="createForm.modelType = t.value"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <small class="hint">
                  <template v-if="createForm.modelType === 'embedding'">嵌入模型用于训练与检索（建议选择 1024 维向量模型）</template>
                  <template v-else>通用模型用于数字生命对话，可按顺序自动切换</template>
                </small>
              </div>

              <div class="form-field">
                <label class="field-label" for="cKey">API Key（可选）</label>
                <input
                  id="cKey"
                  v-model="createForm.apiKey"
                  class="input-mono"
                  type="password"
                  autocomplete="new-password"
                  spellcheck="false"
                  maxlength="300"
                  placeholder="可稍后在「配置」中填写"
                  :disabled="creating"
                />
                <small class="hint">以 AES-256-GCM 加密存入数据库，页面仅显示脱敏形式</small>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn btn--ghost" :disabled="creating" @click="closeCreate()">取消</button>
              <button class="btn btn--primary" :disabled="creating" @click="createModel()">
                {{ creating ? '创建中…' : '创建模型' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除模型"
      confirm-label="删除"
      :loading="deleting"
      warn="删除后该模型及其配置的 API Key 将一并移除，此操作不可撤销。"
      @cancel="cancelDelete"
      @confirm="confirmDelete"
    >
      确定要删除 <strong>「{{ pendingItem?.name }}」</strong> 吗？
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.model-manage { position: relative; }

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

/* ===== Loading / Empty ===== */
.empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.empty svg { width: 22px; height: 22px; flex-shrink: 0; }
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== 类型分类 tabs ===== */
.type-tabs {
  display: flex; align-items: center; gap: 6px;
  padding: 14px 28px 0; flex-wrap: wrap;
}
.type-tab {
  padding: 5px 16px; border-radius: 100px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-secondary); font-size: 12.5px; font-weight: 500;
  cursor: pointer; transition: all var(--transition); white-space: nowrap;
}
.type-tab:hover:not(.active) { border-color: var(--accent); color: var(--accent); }
.type-tab.active {
  background-color: var(--accent); border-color: var(--accent); color: #fff;
}
:global([data-theme='dark']) .type-tab.active { color: #0f0f0f; }

/* ===== 类型标签 ===== */
.type-tag {
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  padding: 2px 10px; border-radius: 100px; width: fit-content;
}
.type-tag.general { color: #2f6fce; background-color: #eaf1fc; }
.type-tag.embedding { color: #8a5cd6; background-color: #f1ebfb; }
:global([data-theme='dark']) .type-tag.general { color: #7fb0ef; background-color: #1d2b40; }
:global([data-theme='dark']) .type-tag.embedding { color: #b08ceb; background-color: #2c2140; }

/* ===== 类型选择（弹窗） ===== */
.type-select-wrap {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.type-option {
  flex: 1; min-width: 100px;
  padding: 9px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--bg-soft);
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all var(--transition);
}
.type-option:hover:not(:disabled):not(.active) { border-color: var(--accent); color: var(--accent); }
.type-option.active {
  background-color: var(--accent); border-color: var(--accent); color: #fff;
}
:global([data-theme='dark']) .type-option.active { color: #0f0f0f; }
.type-option:disabled { opacity: 0.55; cursor: not-allowed; }

/* ===== Models list ===== */
.models-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
  margin: 22px 0 8px;
}
.model-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px 22px;
  transition: all var(--transition);
}
.model-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.model-card.disabled { opacity: 0.72; }
.model-card.disabled:hover { opacity: 1; }
.model-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.model-name-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.provider-tag {
  font-family: var(--font-mono); font-size: 11px; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--accent); background-color: var(--accent-light);
  padding: 2px 10px; border-radius: 100px;
  width: fit-content;
}
.model-name {
  font-family: var(--font-serif); font-size: 17px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
  margin: 0; word-break: break-all;
}
.status-dot {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 600;
  padding: 3px 12px; border-radius: 100px;
  white-space: nowrap;
}
.status-dot::before {
  content: '';
  width: 6px; height: 6px; border-radius: 50%;
}
.status-dot.on { color: var(--accent); background-color: var(--accent-light); }
.status-dot.on::before { background-color: var(--accent); }
.status-dot.off { color: var(--text-tertiary); background-color: var(--bg-soft); }
.status-dot.off::before { background-color: var(--text-tertiary); }
.model-id {
  font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary);
  margin: 0; word-break: break-all;
  padding: 8px 12px;
  background-color: var(--bg-soft);
  border-radius: var(--radius-sm);
}
.test-result {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; line-height: 1.5;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
}
.test-result svg { width: 15px; height: 15px; flex-shrink: 0; }
.test-result.ok {
  color: var(--accent); background-color: var(--accent-light);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.test-result.fail {
  color: #e0533d; background-color: #fdf1ef;
  border: 1px solid #f3c9c2;
}
:global([data-theme='dark']) .test-result.fail { background-color: #2a1a17; border-color: #4a2a24; }
.model-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  margin-top: auto;
  padding-top: 12px; border-top: 1px solid var(--border-light);
}

/* ===== mini-btn ===== */
.mini-btn {
  padding: 5px 14px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 12.5px;
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

/* ===== Key 状态行 ===== */
.key-row {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 12px;
  padding: 8px 12px; border-radius: var(--radius-sm);
}
.key-row svg { width: 14px; height: 14px; flex-shrink: 0; }
.key-row.set {
  color: var(--accent); background-color: var(--accent-light);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
}
.key-row.missing { color: #a97b2f; background-color: #fbf6ec; border: 1px solid #ecd9b4; }
::global([data-theme='dark']) .key-row.missing { color: #d9a95c; background-color: #2a2317; border-color: #4a3d22; }
.key-value { word-break: break-all; letter-spacing: 0.02em; }

/* ===== Modal ===== */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-card {
  width: 480px; max-width: calc(100vw - 32px);
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
  overflow: hidden; display: flex; flex-direction: column;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light);
}
.modal-title {
  font-family: var(--font-serif); font-size: 16px; font-weight: 600;
  letter-spacing: 0.02em; color: var(--text-primary);
  padding-left: 14px; position: relative;
}
.modal-title::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 16px; border-radius: 4px; background-color: var(--accent);
}
.modal-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border: 1px solid var(--border); border-radius: 50%;
  background: transparent; color: var(--text-tertiary); cursor: pointer;
  transition: all var(--transition);
}
.modal-close:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); background-color: var(--accent-light); }
.modal-close:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.modal-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid var(--border-light); background: var(--bg-soft);
}
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .modal-card { transition: transform 0.2s ease; }
.modal-fade-enter-from .modal-card { transform: translateY(-12px) scale(0.98); }

/* ===== 弹窗表单 ===== */
.provider-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.provider-note { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-tertiary); }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-field input {
  width: 100%; box-sizing: border-box;
  padding: 11px 13px; border: 1px solid transparent;
  border-radius: var(--radius-sm); background: var(--bg-soft);
  color: var(--text-primary); font-size: 14px; font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.form-field input::placeholder { color: var(--text-tertiary); }
.form-field input:hover:not(:disabled) { background-color: color-mix(in srgb, var(--bg-soft) 70%, var(--accent-light) 30%); }
.form-field input:focus:not(:disabled) {
  background-color: var(--bg-card); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.form-field input:disabled { opacity: 0.55; cursor: not-allowed; }
.hint { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }
.input-mono { font-family: var(--font-mono); font-size: 13px; }

.key-input-wrap { position: relative; }
.key-input-wrap input { padding-right: 44px; }
.key-eye {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: transparent;
  color: var(--text-tertiary); cursor: pointer; border-radius: var(--radius-sm);
  transition: color var(--transition), background-color var(--transition);
}
.key-eye svg { width: 16px; height: 16px; }
.key-eye:hover:not(:disabled) { color: var(--accent); background-color: var(--accent-light); }
.key-eye:disabled { opacity: 0.4; cursor: not-allowed; }

.clear-key {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-secondary);
  cursor: pointer; user-select: none;
}
.clear-key input { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.clear-key:hover span, .clear-key.checked span { color: #e0533d; }

/* ===== 按钮 ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; transition: all var(--transition); white-space: nowrap;
}
.btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.btn--primary {
  background-color: var(--accent); color: #fff;
  border-color: var(--accent); box-shadow: 0 1px 0 color-mix(in srgb, var(--accent) 30%, transparent);
}
.btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover); border-color: var(--accent-hover);
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
::global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }

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
  .models-wrap { grid-template-columns: 1fr; }
}
</style>
