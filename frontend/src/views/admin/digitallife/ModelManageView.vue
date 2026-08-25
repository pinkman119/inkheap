<script setup>
import { onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const loading = ref(true)
const actionLoading = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

const models = ref([])
const testingId = ref(null)
const testResult = ref({}) // id -> { ok, message }

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

async function testModel(m) {
  testingId.value = m.id
  testResult.value = { ...testResult.value, [m.id]: null }
  try {
    const res = await api.post(`/admin/digital-life/models/${m.id}/test`, {})
    testResult.value = { ...testResult.value, [m.id]: { ok: true, message: res.message || '连接成功' } }
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

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
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
        </div>
        <p class="lede">管理数字人生的 LLM 接入：启用 / 停用模型、测试连通性。</p>
        <p class="hero-note">{{ models.length }} 个模型 · 启用 {{ models.filter(m => m.enabled).length }} 个 · 对话按顺序自动切换</p>
      </div>
    </section>

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
        v-for="m in models"
        :key="m.id"
        class="model-card"
        :class="{ disabled: !m.enabled }"
      >
        <div class="model-head">
          <div class="model-name-group">
            <span class="provider-tag">{{ providerName(m.provider) }}</span>
            <h3 class="model-name">{{ m.name }}</h3>
          </div>
          <span class="status-dot" :class="m.enabled ? 'on' : 'off'">
            {{ m.enabled ? '启用中' : '已停用' }}
          </span>
        </div>
        <p class="model-id">{{ m.modelId }}</p>
        <div v-if="testResult[m.id]" class="test-result" :class="testResult[m.id].ok ? 'ok' : 'fail'">
          <svg v-if="testResult[m.id].ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          <span>{{ testResult[m.id].message }}</span>
        </div>
        <div class="model-actions">
          <button class="mini-btn" :disabled="testingId === m.id" @click="testModel(m)">
            {{ testingId === m.id ? '测试中…' : '测试连接' }}
          </button>
          <button class="mini-btn" :class="{ danger: m.enabled }" :disabled="actionLoading" @click="toggleModel(m)">
            {{ m.enabled ? '停用' : '启用' }}
          </button>
        </div>
      </div>
    </div>
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
