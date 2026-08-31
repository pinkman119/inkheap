<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { quickQuestions, welcomeDesc, loginCard } from '@/data/digitalLife'
import { useUserAuth } from '@/composables/useUserAuth'

/* =========================================================
   数字生命 · 对话逻辑（已接入后端）
   - 登录：mock 微信登录（WECHAT_MOCK 开关），发送时弹登录卡片
   - 回复：POST /user/digital-life/chat，SSE 流式渲染（delta/done/error）
   - 历史：GET /user/digital-life/messages，单一持续会话
   - 限流：429 时按钮倒计时禁用
   ========================================================= */

const { token, user, isLoggedIn, clearAuth, mockLogin } = useUserAuth()

// 单一持续会话：不暴露会话管理，用户始终在一个对话里与「数字生命」交流
const messages = reactive([])
const isTyping = ref(false)
const draft = ref('')
const jumpVisible = ref(false)

// 站点称呼（HomePage.siteName，与关于我署名同源）
const siteName = ref('慕士塔格猫')

// 登录卡片
const loginCardVisible = ref(false)
const loginLoading = ref(false)
const loginError = ref('')
let pendingMessage = '' // 被登录拦截的消息，登录后自动发送

// 限流倒计时（秒）
const rateLimitWait = ref(0)
let countdownTimer = null

// 可选「通用」模型（登录后从后端加载，用于切换对话模型）
const generalModels = ref([])
const selectedModelId = ref('')
const MODEL_STORAGE_KEY = 'dl_chat_model_id'

const currentModelLabel = computed(() => {
  const hit = generalModels.value.find((m) => m.id === selectedModelId.value)
  return hit ? hit.name : '自动'
})

const chatMessagesEl = ref(null)
const textareaEl = ref(null)

const canSend = computed(
  () => draft.value.trim().length > 0 && !isTyping.value && rateLimitWait.value <= 0,
)

let seed = 0
const nextId = () => (seed += 1)

/* ---- API 基址（与 useApi 一致：dev 绝对地址 / 生产同源） ---- */
const isDev =
  typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.port === '4173')
const BASE = isDev ? 'http://localhost:3000/api' : '/api'

/* ---- 滚动策略：头部与输入栏固定，仅消息区滚动；滚动条隐藏，新内容平滑定位底部 ---- */
function isNearBottom() {
  const el = chatMessagesEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 96
}
function stickBottom() {
  const el = chatMessagesEl.value
  if (el) el.scrollTop = el.scrollHeight
}
function smoothBottom() {
  const el = chatMessagesEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}
function showJump() {
  jumpVisible.value = true
}
function hideJump() {
  jumpVisible.value = false
}
// 流式输出时即时跟随（贴近底部时直接贴底）
function followStream() {
  if (isNearBottom()) stickBottom()
  else showJump()
}
// 离散事件（新消息到达 / 用户主动点击）平滑滚动
function scrollNew() {
  if (isNearBottom()) smoothBottom()
  else showJump()
}
function onScroll() {
  if (isNearBottom()) hideJump()
}
function onJumpClick() {
  hideJump()
  smoothBottom()
}

/* ---- 初始化：拉称呼 + 历史 ---- */
onMounted(async () => {
  try {
    const res = await fetch(`${BASE}/public/home-page`)
    if (res.ok) {
      const data = await res.json()
      if (data.siteName) siteName.value = data.siteName
    }
  } catch {
    // 称呼拉取失败时使用默认
  }
  if (isLoggedIn()) {
    await Promise.all([loadHistory(), loadGeneralModels()])
  }
})

/** 加载可选「通用」模型列表，并恢复上次选择 */
async function loadGeneralModels() {
  try {
    const res = await fetch(`${BASE}/user/digital-life/models`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (!res.ok) {
      if (res.status === 401) clearAuth()
      return
    }
    const data = await res.json()
    generalModels.value = (data.items || []).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
    }))
    const saved = localStorage.getItem(MODEL_STORAGE_KEY)
    if (saved && generalModels.value.some((m) => m.id === saved)) {
      selectedModelId.value = saved
    }
  } catch {
    // 模型列表加载失败不阻断页面
  }
}

function selectModel(id) {
  selectedModelId.value = id
  if (id) localStorage.setItem(MODEL_STORAGE_KEY, id)
  else localStorage.removeItem(MODEL_STORAGE_KEY)
}

async function loadHistory() {
  try {
    const res = await fetch(`${BASE}/user/digital-life/messages`, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    if (!res.ok) {
      if (res.status === 401) clearAuth() // token 过期，回到未登录态
      return
    }
    const data = await res.json()
    messages.length = 0
    for (const m of data.items || []) {
      messages.push({
        id: m.id,
        role: m.role === 'assistant' ? 'ai' : 'user',
        display: m.content,
      })
    }
    if (messages.length) {
      await nextTick()
      stickBottom()
    }
  } catch {
    // 历史加载失败不阻断页面
  }
}

/* ---- 限流倒计时 ---- */
function startCountdown(seconds) {
  rateLimitWait.value = seconds
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    rateLimitWait.value -= 1
    if (rateLimitWait.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

/* ---- 发送（含登录拦截） ---- */
async function sendMessage(raw) {
  const text = (raw || '').trim()
  if (!text || isTyping.value || rateLimitWait.value > 0) return

  // 未登录：拦截并弹登录卡片
  if (!isLoggedIn()) {
    pendingMessage = text
    draft.value = ''
    loginError.value = ''
    loginCardVisible.value = true
    return
  }

  // 记录用户消息
  messages.push({ id: nextId(), role: 'user', display: text })
  draft.value = ''
  await nextTick()
  autoGrow()
  scrollNew()

  // AI 气泡（流式填充）
  isTyping.value = true
  await nextTick()
  scrollNew()
  await streamChat(text)
}

/* ---- SSE 流式聊天 ---- */
async function streamChat(text) {
  let message = null
  try {
    const res = await fetch(`${BASE}/user/digital-life/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        content: text,
        modelId: selectedModelId.value || undefined,
      }),
    })

    // 非 SSE 的错误响应（409 未配 Key / 429 限流 / 401 过期）
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        startCountdown(data.retryAfterSeconds || 60)
        pushSystemError(`提问过于频繁，请等待 ${data.retryAfterSeconds || 60} 秒后再试`)
      } else if (res.status === 401) {
        clearAuth()
        pendingMessage = text
        loginCardVisible.value = true
      } else {
        pushSystemError(data.message || '服务暂时不可用，请稍后再试')
      }
      isTyping.value = false
      return
    }

    // 进入 SSE 流：创建 AI 气泡并逐段填充
    isTyping.value = false
    messages.push({ id: nextId(), role: 'ai', display: '' })
    message = messages[messages.length - 1]
    await nextTick()
    followStream()

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE 事件以空行分隔：event: xxx\ndata: {...}\n\n
      let sep
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        handleEventBlock(block, message)
      }
    }
    // 处理尾部残余
    if (buffer.trim()) handleEventBlock(buffer, message)
  } catch (e) {
    isTyping.value = false
    if (message && message.display) {
      // 已有部分内容：保留
    } else {
      pushSystemError('网络异常，请稍后再试')
    }
  } finally {
    isTyping.value = false
  }
}

function handleEventBlock(block, message) {
  let event = 'message'
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5).trim()
  }
  if (!data) return
  let payload
  try {
    payload = JSON.parse(data)
  } catch {
    return
  }

  if (event === 'delta' && payload.text) {
    message.display += payload.text
    followStream()
  } else if (event === 'done') {
    message.display = payload.content || message.display
    followStream()
  } else if (event === 'error') {
    if (!message.display && payload.message) {
      message.display = payload.message
    }
  }
}

/* ---- 系统错误气泡（以 AI 身份展示可读错误） ---- */
function pushSystemError(text) {
  messages.push({ id: nextId(), role: 'ai', display: `（${text}）` })
  scrollNew()
}

/* ---- 登录卡片 ---- */
async function onMockLogin() {
  loginLoading.value = true
  loginError.value = ''
  try {
    await mockLogin()
    loginCardVisible.value = false
    await loadHistory()
    // 自动继续被拦截的发送
    if (pendingMessage) {
      const text = pendingMessage
      pendingMessage = ''
      await sendMessage(text)
    }
  } catch (e) {
    loginError.value = e.message || '登录失败，请稍后再试'
  } finally {
    loginLoading.value = false
  }
}

function closeLoginCard() {
  loginCardVisible.value = false
  pendingMessage = ''
}

/* ---- 退出登录 ---- */
function onLogout() {
  clearAuth()
  messages.length = 0
  pendingMessage = ''
}

/* ---- 输入框自动增高 ---- */
function autoGrow() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 140) + 'px'
}

function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage(draft.value)
  }
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <AppHeader active-key="digital" />

  <div class="chat-app page-digital-life">
    <div class="chat-layout">
      <!-- Chat main -->
      <main class="chat-main">
        <div
          ref="chatMessagesEl"
          class="chat-messages"
          aria-live="polite"
          @scroll.passive="onScroll"
        >
          <div class="messages-inner">
            <!-- 欢迎态 -->
            <div v-if="!messages.length" class="welcome">
              <div class="welcome-avatar" aria-hidden="true">
                <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
                  <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                  <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                </svg>
              </div>
              <h2>你好，我是{{ siteName }}</h2>
              <p>{{ welcomeDesc.replace('{name}', siteName) }}</p>
              <div class="chips">
                <button
                  v-for="question in quickQuestions"
                  :key="question"
                  type="button"
                  class="chip"
                  @click="sendMessage(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>

            <!-- 消息流 -->
            <div v-for="message in messages" :key="message.id" class="msg" :class="message.role">
              <div v-if="message.role === 'ai'" class="msg-avatar" aria-hidden="true">
                <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
                  <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                  <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                </svg>
              </div>
              <div class="bubble">{{ message.display }}</div>
            </div>

            <!-- 打字中指示器 -->
            <div v-if="isTyping" class="msg ai">
              <div class="msg-avatar" aria-hidden="true">
                <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
                  <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                  <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                </svg>
              </div>
              <div class="bubble">
                <span class="typing"><span /><span /><span /></span>
              </div>
            </div>
          </div>
        </div>

        <button
          class="jump-bottom"
          :class="{ show: jumpVisible }"
          type="button"
          aria-label="回到最新消息"
          @click="onJumpClick"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>新消息</span>
        </button>

        <!-- 登录卡片（未登录发送时弹出） -->
        <div v-if="loginCardVisible" class="login-overlay" @click.self="closeLoginCard">
          <div class="login-card">
            <button class="login-close" type="button" aria-label="关闭" @click="closeLoginCard">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3>{{ loginCard.title }}</h3>
            <p>{{ loginCard.desc }}</p>
            <button
              class="login-btn"
              type="button"
              :disabled="loginLoading"
              @click="onMockLogin"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {{ loginLoading ? loginCard.loading : loginCard.button }}
            </button>
            <p v-if="loginError" class="login-error">{{ loginError }}</p>
          </div>
        </div>

        <div class="chat-input">
          <!-- 已登录：模型选择 + 昵称 + 退出 -->
          <div v-if="isLoggedIn() && user" class="user-bar">
            <div v-if="generalModels.length" class="model-picker">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <select
                class="model-select"
                :value="selectedModelId"
                aria-label="选择对话模型"
                @change="selectModel($event.target.value)"
              >
                <option value="">自动</option>
                <option v-for="m in generalModels" :key="m.id" :value="m.id">
                  {{ m.name }}（{{ m.provider }}）
                </option>
              </select>
              <span class="model-picker-caret">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>
            <span class="user-chip">{{ user.nickname }}</span>
            <button class="logout-btn" type="button" @click="onLogout">退出</button>
          </div>
          <div class="input-inner">
            <textarea
              ref="textareaEl"
              v-model="draft"
              class="chat-textarea"
              rows="1"
              :placeholder="`和「${siteName}」聊聊…（回车发送）`"
              aria-label="发消息"
              @input="autoGrow"
              @keydown="onKeydown"
            />
            <button
              class="send-btn"
              type="button"
              aria-label="发送"
              :disabled="!canSend"
              @click="sendMessage(draft)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p v-if="rateLimitWait > 0" class="input-hint rate-limit">
            提问过于频繁，请等待 {{ rateLimitWait }} 秒后再试
          </p>
          <p v-else class="input-hint">回车发送 · Shift+回车换行 · 每分钟最多 5 次提问</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 本页原型的深色侧栏底色与全站不同（#161616 vs #242424），仅在本页局部覆盖 */
[data-theme='dark'] .page-digital-life {
  --bg-sidebar: #161616;
}

/* ===== Chat app layout ===== */
.chat-app {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* Chat main */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  position: relative;
}

/* Messages */
.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 24px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

.chat-messages::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.messages-inner {
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.msg {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.msg.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg-avatar svg {
  width: 18px;
  height: 18px;
}

.bubble {
  max-width: 72%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg.ai .bubble {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.msg.user .bubble {
  background-color: var(--accent);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

/* Typing indicator */
.typing {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 4px 2px;
}

.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  animation: typing 1.2s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: 0.18s;
}

.typing span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

/* Welcome state */
.welcome {
  margin: auto;
  text-align: center;
  max-width: 520px;
  padding: 88px 16px 24px;
}

.welcome .welcome-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 18px;
  background-color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 8px var(--accent-light);
}

.welcome .welcome-avatar svg {
  width: 38px;
  height: 38px;
}

.welcome h2 {
  font-family: var(--font-serif);
  font-size: 26px;
  color: var(--text-brand);
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

.welcome p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.85;
  margin-bottom: 24px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.chip {
  padding: 9px 16px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13.5px;
  cursor: pointer;
  transition: all var(--transition);
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
  transform: translateY(-1px);
}

/* ===== 登录卡片 ===== */
.login-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  padding: 20px;
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 30px 28px 26px;
  box-shadow: var(--shadow-lg, 0 18px 40px rgba(0, 0, 0, 0.2));
  text-align: center;
}

.login-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.login-close:hover {
  background-color: var(--bg-page, #f5f5f5);
  color: var(--text-secondary);
}

.login-close svg {
  width: 16px;
  height: 16px;
}

.login-card h3 {
  font-family: var(--font-serif);
  font-size: 19px;
  color: var(--text-brand);
  margin-bottom: 10px;
}

.login-card p {
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 12px;
  border: none;
  background-color: var(--accent);
  color: #ffffff;
  font-size: 14.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.login-btn:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn svg {
  width: 18px;
  height: 18px;
}

.login-error {
  margin: 14px 0 0 !important;
  color: #e5484d !important;
  font-size: 13px !important;
}

/* ===== 已登录用户栏 ===== */
.user-bar {
  max-width: 820px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

/* 对话模型选择 */
.model-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 100px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12.5px;
  transition: all var(--transition);
}
.model-picker svg {
  flex-shrink: 0;
  color: var(--accent);
}
.model-select {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  max-width: 150px;
  padding-right: 2px;
}
.model-picker-caret {
  display: inline-flex;
  pointer-events: none;
  color: var(--text-tertiary);
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  background-color: var(--accent-light);
  color: var(--accent);
  font-size: 12.5px;
  font-weight: 500;
}

.logout-btn {
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12.5px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all var(--transition);
}

.logout-btn:hover {
  color: var(--text-secondary);
  background-color: var(--bg-card);
}

/* Input bar */
.chat-input {
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
}

.input-inner {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px 8px 8px 16px;
  transition:
    border-color var(--transition),
    box-shadow var(--transition);
}

.input-inner:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.chat-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
  max-height: 140px;
  padding: 8px 0;
}

.chat-textarea::placeholder {
  color: var(--text-tertiary);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  background-color: var(--accent);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}

.send-btn:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.input-hint {
  max-width: 820px;
  margin: 8px auto 0;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}

.input-hint.rate-limit {
  color: #e5484d;
}

/* Jump to latest (appears only when user scrolls up during new content) */
.jump-bottom {
  position: absolute;
  right: 28px;
  bottom: 104px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  background-color: var(--accent);
  color: #ffffff;
  font-size: 13px;
  font-family: var(--font-sans);
  font-weight: 500;
  box-shadow: var(--shadow-md);
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition:
    opacity var(--transition),
    transform var(--transition),
    background-color var(--transition);
}

.jump-bottom.show {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.jump-bottom:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
}

.jump-bottom:focus-visible {
  outline: 2px solid var(--bg-card);
  outline-offset: 2px;
}

.jump-bottom svg {
  width: 16px;
  height: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .jump-bottom {
    right: 16px;
    bottom: 96px;
  }

  .bubble {
    max-width: 84%;
  }

  .chat-messages {
    padding: 20px 16px;
  }

  .chat-layout {
    flex-direction: column;
  }
}
</style>
