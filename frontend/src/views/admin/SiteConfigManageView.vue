<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

const emptyConfig = () => ({ siteUrl: '', siteTitle: '', siteDescription: '', author: '' })
const config = ref(emptyConfig())
const loading = ref(true)
const saving = ref(false)
const toastMsg = ref('')
const toastType = ref('success')

// feed 地址预览：siteUrl 已配置时展示最终提交给收录站的地址
const feedUrl = computed(() => {
  const base = (config.value.siteUrl || '').trim().replace(/\/+$/, '')
  return base ? `${base}/api/feed.xml` : ''
})

function applyData(data) {
  config.value = {
    siteUrl: data.siteUrl || '',
    siteTitle: data.siteTitle || '',
    siteDescription: data.siteDescription || '',
    author: data.author || '',
  }
}

async function load() {
  loading.value = true
  try {
    const data = await api.get('/admin/site-config')
    if (data) applyData(data)
  } catch (e) {
    showToast('站点设置加载失败: ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  const siteUrl = (config.value.siteUrl || '').trim().replace(/\/+$/, '')
  if (siteUrl && !/^https?:\/\//i.test(siteUrl)) {
    showToast('站点地址需以 http:// 或 https:// 开头', 'error')
    return
  }
  saving.value = true
  try {
    const data = await api.put('/admin/site-config', {
      siteUrl,
      siteTitle: (config.value.siteTitle || '').trim(),
      siteDescription: (config.value.siteDescription || '').trim(),
      author: (config.value.author || '').trim(),
    })
    if (data) applyData(data)
    showToast('站点设置已保存', 'success')
  } catch (e) {
    showToast('保存失败: ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

async function copyFeedUrl() {
  if (!feedUrl.value) return
  try {
    await navigator.clipboard.writeText(feedUrl.value)
    showToast('Feed 地址已复制', 'success')
  } catch {
    showToast('复制失败，请手动选择复制', 'error')
  }
}

function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(load)
</script>

<template>
  <div class="site-config">
    <transition name="toast-pop">
      <div v-if="toastMsg" class="toast" :class="toastType" role="status" aria-live="polite">
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <span class="kicker">Site · 站点</span>
        <h1>站点设置</h1>
        <p class="lede">站点对外的基础信息，用于 RSS 订阅（/api/feed.xml）输出——提交博客收录站前请先完善这里。</p>
        <p class="hero-note">站点地址留空时 feed 回退到请求域名拼链接，仅建议调试使用</p>
      </div>
    </section>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <template v-else>
      <!-- ===== 基础信息 ===== -->
      <section class="config-card">
        <div class="config-card__head">
          <span class="config-card__title">基础信息</span>
          <span class="config-card__desc">站点地址是 feed 条目链接的拼接基础</span>
        </div>
        <div class="config-card__body">
          <div class="form-field">
            <label class="field-label" for="siteUrl">站点地址</label>
            <input id="siteUrl" v-model="config.siteUrl" type="text" class="input-mono" placeholder="https://inkheap.com" />
            <small class="hint">RSS 链接与 feed 自身地址都基于它生成，保存时自动去除尾斜杠</small>
          </div>
          <div class="form-field">
            <label class="field-label" for="siteTitle">站点名称</label>
            <input id="siteTitle" v-model="config.siteTitle" type="text" placeholder="如：墨堆" />
            <small class="hint">留空时 feed 标题回退为「墨堆」</small>
          </div>
          <div class="form-field form-field--wide">
            <label class="field-label" for="siteDescription">站点描述</label>
            <textarea id="siteDescription" v-model="config.siteDescription" rows="3" placeholder="一句话介绍你的站点" />
            <small class="hint">展示在 RSS 阅读器与收录站的频道简介中</small>
          </div>
          <div class="form-field">
            <label class="field-label" for="author">作者</label>
            <input id="author" v-model="config.author" type="text" placeholder="如：yourname (you@example.com)" />
            <small class="hint">RSS managingEditor 字段，可留空</small>
          </div>
          <div class="config-card__foot">
            <button class="btn btn--primary" type="button" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存站点设置' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ===== Feed 地址 ===== -->
      <section class="config-card">
        <div class="config-card__head">
          <span class="config-card__title">RSS 订阅地址</span>
          <span class="config-card__desc">提交到博客收录网站的地址；收录范围：已发布文章 + 已发布小记（含图集），仅输出摘要</span>
        </div>
        <div class="config-card__body">
          <div class="form-field form-field--wide">
            <label class="field-label" for="feedUrl">Feed 地址</label>
            <input id="feedUrl" :value="feedUrl || '（先填写并保存站点地址）'" type="text" class="input-mono" readonly />
          </div>
          <div class="config-card__foot">
            <button class="btn btn--ghost" type="button" :disabled="!feedUrl" @click="copyFeedUrl">复制 Feed 地址</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
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
.page-hero h1 {
  font-family: var(--font-serif); font-size: 38px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.lede { font-size: 15px; color: var(--text-secondary); max-width: 680px; margin: 10px 0 0; }
.hero-note { font-size: 12.5px; color: var(--text-tertiary); margin: 8px 0 0; font-family: var(--font-mono); }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; transition: all var(--transition); white-space: nowrap;
}
.btn--primary { background-color: var(--accent); color: #fff; border-color: var(--accent); }
.btn--primary:hover:not(:disabled) { background-color: var(--accent-hover); border-color: var(--accent-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
:global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--ghost { background: transparent; color: var(--text-secondary); border-color: var(--border); }
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.config-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin: 22px 0 0;
}
.config-card__head {
  display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-soft);
}
.config-card__title {
  font-family: var(--font-serif); font-size: 15.5px; font-weight: 600;
  letter-spacing: 0.02em; color: var(--text-primary);
}
.config-card__desc { font-size: 12.5px; color: var(--text-tertiary); }
.config-card__body {
  padding: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 16px 18px;
  align-items: start;
}
.config-card__foot { grid-column: 1 / -1; display: flex; }

.empty {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 64px 24px;
  color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field--wide { grid-column: 1 / -1; }
.field-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.form-field input,
.form-field textarea {
  width: 100%; box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-soft);
  color: var(--text-primary);
  font-size: 14px; font-family: var(--font-sans);
  outline: none;
  transition: border-color var(--transition), background-color var(--transition), box-shadow var(--transition);
}
.form-field textarea { resize: vertical; line-height: 1.6; }
.form-field input::placeholder,
.form-field textarea::placeholder { color: var(--text-tertiary); }
.form-field input:focus:not(:disabled),
.form-field textarea:focus {
  background-color: var(--bg-card);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.form-field input[readonly] { color: var(--text-tertiary); }
.input-mono { font-family: var(--font-mono); font-size: 13px; }
.hint { font-size: 12px; color: var(--text-tertiary); font-family: var(--font-mono); }

.toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--accent); color: var(--accent);
  font-size: 14px; font-weight: 500;
  padding: 10px 22px; border-radius: 100px;
  box-shadow: var(--shadow-lg);
  z-index: 4000; max-width: min(480px, 90vw);
}
.toast.error { border-color: #e0533d; color: #e0533d; }
.toast-pop-enter-active, .toast-pop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-pop-enter-from, .toast-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

@media (max-width: 768px) {
  .page-hero { padding: 20px 18px; }
  .page-hero h1 { font-size: 30px; }
  .config-card__body { grid-template-columns: 1fr; }
}
</style>
