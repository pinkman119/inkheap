<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useUserAuth } from '@/composables/useUserAuth'
import { useAuthModal } from '@/composables/useAuthModal'

/**
 * 全局登录弹窗：注册 / 登录 / 忘记密码 三视图。
 * 登录或注册成功后关闭并通知调用方（onSuccess 回调）。
 */
const { visible, view, close, notifySuccess } = useAuthModal()
const { login, register, sendCode, forgotPassword } = useUserAuth()

const error = ref('')
const info = ref('')
const submitting = ref(false)

const form = reactive({
  email: '',
  password: '',
  nickname: '',
  homepageUrl: '',
  avatarUrl: '',
  code: '',
})

// 验证码倒计时（秒）
const codeCountdown = ref(0)
let countdownTimer = null

// 头像预览加载状态（URL 变化后重置，加载失败回退首字）
const avatarPreviewOk = ref(false)
watch(
  () => form.avatarUrl,
  () => {
    avatarPreviewOk.value = !!form.avatarUrl.trim()
  },
)

const viewTitle = computed(
  () => ({ login: '登录墨堆', register: '注册墨堆账号', forgot: '找回密码' })[view.value] || '',
)

watch(visible, (v) => {
  if (v) {
    error.value = ''
    info.value = ''
  }
})

watch(view, () => {
  error.value = ''
  info.value = ''
})

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  codeCountdown.value = 0
}

async function onSendCode() {
  if (codeCountdown.value > 0 || submitting.value) return
  error.value = ''
  info.value = ''
  if (!form.email.trim()) {
    error.value = '请先填写邮箱'
    return
  }
  submitting.value = true
  try {
    await sendCode(form.email.trim())
    info.value = '验证码已发送，请查收邮件（5 分钟内有效）'
    codeCountdown.value = 60
    countdownTimer = setInterval(() => {
      codeCountdown.value -= 1
      if (codeCountdown.value <= 0) stopCountdown()
    }, 1000)
  } catch (e) {
    error.value = e.message || '验证码发送失败'
  } finally {
    submitting.value = false
  }
}

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  info.value = ''

  if (view.value === 'login') {
    if (!form.email.trim() || !form.password) {
      error.value = '请填写邮箱和密码'
      return
    }
    submitting.value = true
    try {
      await login({ email: form.email.trim(), password: form.password })
      notifySuccess()
    } catch (e) {
      error.value = e.message || '登录失败，请稍后再试'
    } finally {
      submitting.value = false
    }
    return
  }

  if (view.value === 'register') {
    if (!form.email.trim()) return (error.value = '请填写邮箱')
    if (!form.code.trim()) return (error.value = '请填写验证码')
    if (form.password.length < 6) return (error.value = '密码至少 6 位')
    if (!form.nickname.trim()) return (error.value = '请填写昵称')
    submitting.value = true
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
        homepageUrl: form.homepageUrl.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        code: form.code.trim(),
      })
      notifySuccess()
    } catch (e) {
      error.value = e.message || '注册失败，请稍后再试'
    } finally {
      submitting.value = false
    }
    return
  }

  // forgot
  if (!form.email.trim()) {
    error.value = '请填写邮箱'
    return
  }
  submitting.value = true
  try {
    const res = await forgotPassword(form.email.trim())
    info.value = res?.message || '密码已发送到您的邮箱，请注意查收'
  } catch (e) {
    error.value = e.message || '发送失败，请稍后再试'
  } finally {
    submitting.value = false
  }
}

function switchView(v) {
  stopCountdown()
  view.value = v
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="auth-overlay"
      @mousedown.self="close"
      @click.self="close"
    >
      <div class="auth-modal">
        <button class="auth-close" type="button" aria-label="关闭" @click="close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h3>{{ viewTitle }}</h3>

        <!-- ===== 登录 ===== -->
        <form v-if="view === 'login'" class="auth-form" @submit.prevent="onSubmit">
          <label class="field">
            <span>邮箱</span>
            <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" />
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" placeholder="输入密码" autocomplete="current-password" />
          </label>
          <button class="submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? '登录中…' : '登 录' }}
          </button>
          <div class="auth-links">
            <button type="button" @click="switchView('forgot')">忘记密码？</button>
            <button type="button" @click="switchView('register')">没有账号？去注册</button>
          </div>
        </form>

        <!-- ===== 注册 ===== -->
        <form v-else-if="view === 'register'" class="auth-form" @submit.prevent="onSubmit">
          <label class="field">
            <span>邮箱</span>
            <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" />
          </label>
          <label class="field">
            <span>验证码</span>
            <span class="field-row">
              <input v-model="form.code" type="text" maxlength="6" placeholder="6 位数字" />
              <button
                class="code-btn"
                type="button"
                :disabled="codeCountdown > 0 || submitting"
                @click="onSendCode"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : '获取验证码' }}
              </button>
            </span>
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" placeholder="至少 6 位" autocomplete="new-password" />
          </label>
          <label class="field">
            <span>昵称</span>
            <span class="field-row">
              <input v-model="form.nickname" type="text" maxlength="32" placeholder="评论时展示的昵称" />
              <!-- 头像实时预览：有 URL 显示图片，否则昵称首字 -->
              <span class="avatar-preview" aria-hidden="true">
                <img v-if="avatarPreviewOk" :src="form.avatarUrl.trim()" alt="" @error="avatarPreviewOk = false" />
                <span v-else class="avatar-letter">{{ (form.nickname.trim() || '?').slice(0, 1) }}</span>
              </span>
            </span>
          </label>
          <label class="field">
            <span>头像链接（可选）</span>
            <input v-model="form.avatarUrl" type="text" placeholder="https://example.com/avatar.png" @input="avatarPreviewOk = true" />
          </label>
          <label class="field">
            <span>主站（可选）</span>
            <input v-model="form.homepageUrl" type="text" placeholder="https://your-site.com" />
          </label>
          <button class="submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? '注册中…' : '注 册' }}
          </button>
          <div class="auth-links">
            <button type="button" @click="switchView('login')">已有账号？去登录</button>
          </div>
        </form>

        <!-- ===== 忘记密码 ===== -->
        <form v-else class="auth-form" @submit.prevent="onSubmit">
          <p class="forgot-desc">填写注册邮箱，密码将发送到该邮箱。</p>
          <label class="field">
            <span>邮箱</span>
            <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" />
          </label>
          <button class="submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? '发送中…' : '发送密码到邮箱' }}
          </button>
          <div class="auth-links">
            <button type="button" @click="switchView('login')">返回登录</button>
            <button type="button" @click="switchView('register')">没有账号？去注册</button>
          </div>
        </form>

        <p v-if="error" class="auth-error">{{ error }}</p>
        <p v-if="info" class="auth-info">{{ info }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-modal {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, #eee);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  padding: 28px 26px 22px;
}

.auth-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #888);
  cursor: pointer;
  transition: all 0.2s;
}

.auth-close:hover {
  background: var(--bg-soft, #f5f5f5);
}

.auth-close svg {
  width: 16px;
  height: 16px;
}

.auth-modal h3 {
  font-family: var(--font-serif, serif);
  font-size: 19px;
  color: var(--text-brand, #2d8264);
  margin: 0 0 18px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.field-row {
  display: flex;
  gap: 8px;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  border: 1px solid var(--border-light, #ddd);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary, #333);
  background: var(--bg-soft, #f7f9f7);
  transition: border-color 0.2s;
}

.field input::placeholder {
  color: var(--text-tertiary, #999);
}

.field input:focus {
  outline: none;
  border-color: var(--text-brand, #2d8264);
}

.code-btn {
  flex-shrink: 0;
  padding: 0 14px;
  border: 1px solid var(--text-brand, #2d8264);
  border-radius: 8px;
  background: transparent;
  color: var(--text-brand, #2d8264);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.code-btn:hover:not(:disabled) {
  background: var(--text-brand, #2d8264);
  color: #fff;
}

.code-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 头像实时预览（昵称输入框右侧圆形） */
.avatar-preview {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent, #2d8264);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-letter {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.submit-btn {
  margin-top: 4px;
  padding: 11px 0;
  border: none;
  border-radius: 9px;
  background: var(--text-brand, #2d8264);
  color: #fff;
  font-size: 15px;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-links {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.auth-links button {
  border: none;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.auth-links button:hover {
  color: var(--text-brand, #2d8264);
}

.forgot-desc {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary, #888);
}

.auth-error {
  margin: 12px 0 0;
  color: #e5484d;
  font-size: 13px;
  line-height: 1.6;
}

.auth-info {
  margin: 12px 0 0;
  color: var(--text-brand, #2d8264);
  font-size: 13px;
  line-height: 1.6;
}
</style>
