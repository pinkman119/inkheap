<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useApi } from '@/composables/useApi'

const { post } = useApi()

const form = reactive({
  name: '', // 署名
  contact: '', // 回信方式
  message: '', // 信件正文（body）
})
const MAX = 2000
const counter = computed(() => form.message.length)

const canSend = computed(
  () => form.message.trim() && !submitting.value,
)
const submitting = ref(false)
const toast = reactive({ show: false, message: '信已寄出，谢谢你', type: 'success' })

function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`
}
const letterDate = ref('')
onMounted(() => (letterDate.value = today()))

function showToast(message = '信已寄出，谢谢你', type = 'success') {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => (toast.show = false), 2600)
}

async function handleSubmit() {
  if (!canSend.value) return
  submitting.value = true
  try {
    await post('/contact', {
      name: form.name.trim(),
      contact: form.contact.trim(),
      message: form.message.trim(),
    })
    form.name = ''
    form.contact = ''
    form.message = ''
    showToast()
  } catch (e) {
    showToast('投递失败，请稍后再试', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppHeader active-key="" />

  <main class="page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-glow"></div>
      <div class="page-hero-inner">
        <span class="kicker">Contact · 来信</span>
        <h1>联系我</h1>
        <p class="lede">
          想说点什么，就把它写成一封信吧。无论是建议、合作，还是只想打个招呼——我都会认真读完，并在后台看到它。
        </p>
      </div>
    </section>

    <div class="container">
      <div class="contact-wrap">
        <form class="letter-card" novalidate @submit.prevent="handleSubmit">
          <div class="letter-head">
            <span class="kicker">一封手写的信</span>
            <span class="letter-date">{{ letterDate }}</span>
          </div>

          <div class="letter-paper">
            <p class="letter-to">亲爱的<b>慕士塔格猫</b>：</p>
            <div class="letter-field">
              <textarea
                v-model="form.message"
                class="letter-textarea"
                name="body"
                :maxlength="MAX"
                aria-label="信件正文"
                placeholder="把你想说的话写在这里——不必正式，就像写给一个老朋友……"
              ></textarea>
              <div class="letter-counter"><span>{{ counter }}</span> / {{ MAX }}</div>
            </div>
          </div>

          <!-- 落款：署名 + 回信方式 -->
          <div class="letter-sign">
            <div class="sign-row">
              <label class="sign-label" for="signName">署名</label>
              <input
                id="signName"
                v-model="form.name"
                class="sign-input"
                type="text"
                maxlength="40"
                placeholder="你的称呼 / 昵称"
                autocomplete="name"
              />
            </div>
            <div class="sign-row">
              <label class="sign-label" for="signContact">回信方式</label>
              <input
                id="signContact"
                v-model="form.contact"
                class="sign-input"
                type="text"
                maxlength="120"
                placeholder="邮箱 / 微信 / 手机，方便我回信"
              />
            </div>
          </div>

          <div class="letter-actions">
            <button type="submit" class="btn-send" :disabled="!canSend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              投递这封信
            </button>
            <span class="letter-hint">稍后我会立刻联系您</span>
          </div>
        </form>
      </div>
    </div>
  </main>

  <AppFooter />

  <!-- Toast -->
  <transition name="toast">
    <div v-if="toast.show" class="letter-toast" :class="toast.type">
      <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ toast.message }}</span>
    </div>
  </transition>
</template>

<style scoped>
.page { flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
.container { max-width: 1120px; margin: 0 auto; padding: 0 24px; width: 100%; }

.kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px;
  background-color: var(--accent-light);
}
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 56px 24px 28px;
  border-bottom: 1px solid var(--border-light);
}
.hero-glow {
  position: absolute;
  top: -80px;
  right: -60px;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px);
  pointer-events: none;
}
.page-hero-inner { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; }
.page-hero h1 {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin: 16px 0 12px;
}
.page-hero .lede { font-size: 16px; color: var(--text-secondary); max-width: 620px; line-height: 1.8; }

/* ===== Letter form ===== */
.contact-wrap { max-width: 840px; margin: 0 auto; padding: 40px 0 72px; }
.letter-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg, 16px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.06));
  overflow: hidden;
  animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.letter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 28px 48px 0;
}
.letter-head .kicker { margin-bottom: 0; }

.letter-paper { padding: 18px 48px 8px; }
.letter-to {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.letter-to b { color: var(--accent); }

.letter-field { position: relative; }
.letter-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: vertical;
  min-height: 288px;
  background-color: transparent;
  background-image: repeating-linear-gradient(
    to bottom, transparent 0, transparent 31px, var(--rule, rgba(45, 130, 100, 0.2)) 31px, var(--rule, rgba(45, 130, 100, 0.2)) 32px
  );
  background-attachment: local;
  font-family: var(--font-serif);
  font-size: 17px;
  line-height: 32px;
  color: var(--text-primary);
  padding: 0 2px;
  display: block;
}
.letter-textarea::placeholder { color: var(--text-tertiary); font-style: italic; }
.letter-textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 4px; }
.letter-counter {
  text-align: right;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* 落款 */
.letter-sign {
  margin-top: 14px;
  padding: 16px 48px 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
  border-top: 1px dashed var(--border);
}
.sign-row { display: flex; align-items: center; gap: 12px; width: 100%; justify-content: flex-end; }
.sign-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.sign-label .req { color: var(--accent); font-weight: 700; }
.sign-input {
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--text-primary);
  padding: 5px 2px;
  min-width: 220px;
  max-width: 320px;
  transition: border-color var(--transition, 0.2s);
}
.sign-input::placeholder { color: var(--text-tertiary); }
.sign-input:focus { outline: none; border-bottom-color: var(--accent); }
.sign-input:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 3px; }
.letter-date { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-tertiary); }

.letter-actions { padding: 14px 48px 28px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.btn-send {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--accent);
  color: #ffffff;
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 100px;
  padding: 12px 28px;
  cursor: pointer;
  transition: all var(--transition, 0.2s);
}
.btn-send:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.06));
}
.btn-send:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-send svg { width: 17px; height: 17px; }
.letter-hint { font-size: 13px; color: var(--text-tertiary); }
.letter-hint a { color: var(--accent); text-decoration: none; }
.letter-hint a:hover { text-decoration: underline; }

/* Toast */
.letter-toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  background-color: var(--accent);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 100px;
  font-size: 14px;
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.1));
  z-index: 200;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.letter-toast svg { width: 17px; height: 17px; }
.letter-toast.error { background-color: #e0533d; }
.toast-enter-active, .toast-leave-active { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

@media (max-width: 768px) {
  .page-hero { padding: 40px 16px 24px; }
  .page-hero h1 { font-size: 32px; }
  .contact-wrap { padding: 28px 0 56px; }
  .letter-head, .letter-paper, .letter-sign, .letter-actions { padding-left: 22px; padding-right: 22px; }
  .sign-input { min-width: 0; max-width: none; width: 100%; }
  .sign-row { justify-content: space-between; }
}
</style>
