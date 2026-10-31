<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { quickQuestions, welcomeDesc } from '@/data/digitalLife'
import { useUserAuth } from '@/composables/useUserAuth'
import { useAuthModal } from '@/composables/useAuthModal'
import { useSiteIdentity } from '@/composables/useSiteIdentity'
import { renderMarkdown } from '@/utils/markdown'
import { renderDiagrams } from '@/utils/diagram'
import { isDark } from '@/composables/useTheme'

/* =========================================================
   数字生命 · 对话逻辑（已接入后端）
   - 登录：邮箱账号（全局 AuthModal 弹窗，httpOnly cookie 维持登录态），发送时弹出
   - 回复：POST /user/digital-life/chat，SSE 流式渲染（delta/done/error）
  - 分泡：AI 长答复按换行段落拆成多条气泡逐条冒出（短段自动并入相邻气泡），像真人微信聊天
   - 历史：GET /user/digital-life/messages，按 sessionId 隔离会话
   - 会话：「新会话」与「清空」都会生成新 sessionId，隔离上下文；历史记录仍保留在数据库
   - 限流：429 时按钮倒计时禁用
   ========================================================= */

const { user, isLoggedIn, refresh, clearAuth, logout } = useUserAuth()
const { open: openAuthModal } = useAuthModal()

// 会话隔离：sessionId 本地持久化（localStorage）
const SESSION_STORAGE_KEY = 'dl_chat_session_id'

function genSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getSessionId() {
  const saved = localStorage.getItem(SESSION_STORAGE_KEY)
  if (saved) return saved
  const id = genSessionId()
  localStorage.setItem(SESSION_STORAGE_KEY, id)
  return id
}

const sessionId = ref(getSessionId())

const messages = reactive([])
const isTyping = ref(false)
const draft = ref('')
const jumpVisible = ref(false)

// 站点身份（作者名 + 头像）：与首页名片同源（后台「首页管理」配置），多页面共享
const { siteAvatar, siteName, loadSiteIdentity, onAvatarError } = useSiteIdentity()

// 用户头像加载失败标记（回退昵称首字）；切换用户后重置
const userAvatarFailed = ref(false)
watch(
  () => user.value?.id,
  () => {
    userAvatarFailed.value = false
  },
)

// 登录拦截：被登录弹窗拦截的消息，登录后自动发送
let pendingMessage = ''

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

/* ---- AI 回答按 Markdown 渲染 + 按段落拆成多条气泡 ----
   用户提问是纯文本，保持原样插值；AI 回答经 marked 编译 + DOMPurify 净化后 v-html 呈现。
   为了让回答更像真人微信聊天，一段长答复会拆成多条气泡：以换行段落为单位，
   过短的段落先攒着、与后面的段落合并，避免一两个词就单独占用一条气泡。
   编译结果用 WeakMap 按气泡序号缓存（刻意不做响应式：渲染期写响应式状态会触发递归更新）。 */
const BUBBLE_MIN_LEN = 20

/** 全量拆分：历史消息、done 事件覆盖时使用 */
function splitAnswerBubbles(text) {
  const bubbles = []
  let cur = ''
  for (const raw of String(text).split('\n')) {
    const line = raw.trim()
    if (!line) continue
    cur = cur ? `${cur}\n${line}` : line
    if (cur.length >= BUBBLE_MIN_LEN) {
      bubbles.push(cur)
      cur = ''
    }
  }
  if (cur) bubbles.push(cur)
  return bubbles
}

/** 流式分泡器：边收边拆，随时给出当前的气泡快照 */
function createBubbleStreamer() {
  const sealed = [] // 已封板的气泡
  let pending = '' // 已完整、但还太短，等待与后续段落合并
  let tail = '' // 尚未收到换行的当前行

  return {
    feed(chunk) {
      let buf = tail + chunk
      tail = ''
      let nl
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue // 空行只作分隔，不单独成气泡
        pending = pending ? `${pending}\n${line}` : line
        if (pending.length >= BUBBLE_MIN_LEN) {
          sealed.push(pending)
          pending = ''
        }
      }
      tail = buf
    },
    snapshot() {
      const list = sealed.slice()
      const live = pending && tail ? `${pending}\n${tail}` : pending || tail
      if (live) list.push(live)
      return list
    },
  }
}

const htmlCache = new WeakMap()

function bubbleHtml(message, text, index) {
  let cache = htmlCache.get(message)
  if (!cache) {
    cache = { srcs: [], htmls: [] }
    htmlCache.set(message, cache)
  }
  if (cache.srcs[index] === text) return cache.htmls[index]
  // breaks: true —— 单个换行也保留为换行，符合对话阅读习惯
  const html = renderMarkdown(text, { breaks: true })
  cache.srcs[index] = text
  cache.htmls[index] = html
  return html
}

/* ---- 正文里的文本绘图（mermaid）：v-html 写入 DOM 后异步渲染 ---- */
function renderMessageDiagrams() {
  if (chatMessagesEl.value) renderDiagrams(chatMessagesEl.value)
}

/* ---- 代码块一键复制（事件委托，挂在消息容器上） ---- */
function onMessagesClick(e) {
  const btn = e.target.closest('.code-copy')
  if (!btn) return
  const wrap = btn.closest('.code-block-wrap')
  const codeEl = wrap && wrap.querySelector('pre.code-block code')
  if (!codeEl) return
  const text = codeEl.textContent || ''
  const done = () => {
    const old = btn.textContent
    btn.textContent = '已复制'
    btn.classList.add('copied')
    setTimeout(() => {
      btn.textContent = old
      btn.classList.remove('copied')
    }, 1500)
  }
  const fallbackCopy = () => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      done()
    } catch (_) {
      /* 忽略：不支持剪贴板时静默失败 */
    }
    document.body.removeChild(ta)
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallbackCopy)
  } else {
    fallbackCopy()
  }
}

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

/* ---- 初始化：拉站点身份 + 登录态探测 + 历史 ---- */
onMounted(async () => {
  document.addEventListener('click', onDocClick)
  await loadSiteIdentity()
  await refresh()
  if (isLoggedIn()) {
    await Promise.all([loadHistory(), loadGeneralModels()])
  }
})

// 深浅色切换后 mermaid 的配色需要重绘
watch(isDark, () => {
  if (chatMessagesEl.value) renderDiagrams(chatMessagesEl.value, { force: true })
})

/** 加载可选「通用」模型列表，并恢复上次选择 */
async function loadGeneralModels() {
  try {
    const res = await fetch(`${BASE}/user/digital-life/models`, {
      credentials: 'include',
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

/* ---- 模型下拉菜单（自定义弹层，替代原生 select） ---- */
const PROVIDER_LABELS = {
  zhipu: '智谱 AI',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  qwen: '通义千问',
  anthropic: 'Anthropic',
}
const modelMenuOpen = ref(false)
const modelPickerEl = ref(null)

function providerLabel(p) {
  return PROVIDER_LABELS[p] || p
}

function toggleModelMenu() {
  modelMenuOpen.value = !modelMenuOpen.value
}

function pickModel(id) {
  selectModel(id)
  modelMenuOpen.value = false
}

function onDocClick(e) {
  if (modelMenuOpen.value && modelPickerEl.value && !modelPickerEl.value.contains(e.target)) {
    modelMenuOpen.value = false
  }
}

async function loadHistory() {
  try {
    const res = await fetch(
      `${BASE}/user/digital-life/messages?sessionId=${encodeURIComponent(sessionId.value)}`,
      {
        credentials: 'include',
      },
    )
    if (!res.ok) {
      if (res.status === 401) clearAuth() // 登录态过期，回到未登录态
      return
    }
    const data = await res.json()
    messages.length = 0
    for (const m of data.items || []) {
      if (m.role === 'assistant') {
        // 历史回答同样拆成多条气泡，和流式期间保持一致
        messages.push({ id: m.id, role: 'ai', bubbles: splitAnswerBubbles(m.content) })
      } else {
        messages.push({ id: m.id, role: 'user', display: m.content })
      }
    }
    await nextTick()
    if (messages.length) stickBottom()
    renderMessageDiagrams()
  } catch {
    // 历史加载失败不阻断页面
  }
}

/* ---- 会话管理：新会话 / 清空当前会话（均不删除数据库，仅影响前端显示） ----
   两者都切换到全新的 sessionId：后端按 sessionId 读取上下文，
   若不换 sessionId，清空后 LLM 仍会读到旧会话历史。 */
function startNewSession() {
  if (isTyping.value) return
  sessionId.value = genSessionId()
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId.value)
  messages.length = 0
  jumpVisible.value = false
}

const clearConfirmVisible = ref(false)

function askClearSession() {
  if (isTyping.value || !messages.length) return
  clearConfirmVisible.value = true
}

function confirmClearSession() {
  // 切换到全新 sessionId，确保清空后是全新会话（旧记录仍保留在数据库中）
  sessionId.value = genSessionId()
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId.value)
  messages.length = 0
  jumpVisible.value = false
  clearConfirmVisible.value = false
}

function cancelClearSession() {
  clearConfirmVisible.value = false
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

  // 未登录：拦截并弹全局登录弹窗
  if (!isLoggedIn()) {
    pendingMessage = text
    draft.value = ''
    openAuthModal({ onSuccess: onAuthSuccess })
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: text,
        modelId: selectedModelId.value || undefined,
        sessionId: sessionId.value,
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
        openAuthModal({ onSuccess: onAuthSuccess })
      } else {
        pushSystemError(data.message || '服务暂时不可用，请稍后再试')
      }
      isTyping.value = false
      return
    }

    // 进入 SSE 流：创建 AI 气泡并逐段填充
    // 注意：isTyping 先不清，等第一个 delta 落地再收起三点指示器，
    // 否则首个字到达前页面上既没有气泡也没有指示器，会像是没反应
    messages.push({ id: nextId(), role: 'ai', bubbles: [] })
    message = messages[messages.length - 1]
    const streamer = createBubbleStreamer()
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
        handleEventBlock(block, message, streamer)
      }
    }
    // 处理尾部残余
    if (buffer.trim()) handleEventBlock(buffer, message, streamer)
  } catch (e) {
    isTyping.value = false
    if (message && message.bubbles.length) {
      // 已有部分内容：保留
    } else {
      pushSystemError('网络异常，请稍后再试')
    }
  } finally {
    isTyping.value = false
    // 流式结束后再渲染绘图：流式期间内容频繁变化，逐次编译 mermaid 没有意义
    await nextTick()
    renderMessageDiagrams()
  }
}

function handleEventBlock(block, message, streamer) {
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
    isTyping.value = false // 有内容落地，收起三点指示器
    // 增量喂入分泡器：满一段就多冒一条气泡，未写完的尾巴实时更新
    streamer.feed(payload.text)
    message.bubbles = streamer.snapshot()
    followStream()
  } else if (event === 'done') {
    // 用完整内容重建，确保与流式过程中的拆分结果一致
    if (payload.content) message.bubbles = splitAnswerBubbles(payload.content)
    followStream()
  } else if (event === 'error') {
    if (!message.bubbles.length && payload.message) {
      message.bubbles = [payload.message]
    }
  }
}

/* ---- 系统错误气泡（以 AI 身份展示可读错误） ---- */
function pushSystemError(text) {
  messages.push({ id: nextId(), role: 'ai', bubbles: [`（${text}）`] })
  scrollNew()
}

/* ---- 登录成功（全局 AuthModal 回调）：加载历史并续发被拦截的消息 ---- */
async function onAuthSuccess() {
  await Promise.all([loadHistory(), loadGeneralModels()])
  // 自动继续被拦截的发送
  if (pendingMessage) {
    const text = pendingMessage
    pendingMessage = ''
    await sendMessage(text)
  }
}

/* ---- 退出登录 ---- */
async function onLogout() {
  await logout()
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
  document.removeEventListener('click', onDocClick)
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
          @click="onMessagesClick"
        >
          <div class="messages-inner">
            <!-- 欢迎态 -->
            <div v-if="!messages.length" class="welcome">
              <div class="welcome-avatar" aria-hidden="true">
                <img v-if="siteAvatar" :src="siteAvatar" alt="" @error="onAvatarError" />
                <svg v-else viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
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

            <!-- 消息流：AI 的每段回答各自成行、各带头像，贴近微信聊天 -->
            <template v-for="message in messages" :key="message.id">
              <div v-if="message.role === 'user'" class="msg user">
                <!-- 用户头像：注册时填写的头像 URL，为空或加载失败回退昵称首字 -->
                <div class="msg-avatar user-avatar" aria-hidden="true">
                  <img
                    v-if="user?.avatarUrl && !userAvatarFailed"
                    :src="user.avatarUrl"
                    alt=""
                    @error="userAvatarFailed = true"
                  />
                  <span v-else class="avatar-letter">{{ (user?.nickname || '?').slice(0, 1) }}</span>
                </div>
                <div class="bubble">{{ message.display }}</div>
              </div>
              <template v-else>
                <div v-for="(bubble, index) in message.bubbles" :key="index" class="msg ai">
                  <div class="msg-avatar" aria-hidden="true">
                    <img v-if="siteAvatar" :src="siteAvatar" alt="" @error="onAvatarError" />
                    <svg v-else viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
                      <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                      <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                    </svg>
                  </div>
                  <!-- eslint-disable-next-line vue/no-v-html —— AI 回答经 marked 编译 + DOMPurify 净化 -->
                  <div
                    class="bubble markdown-body"
                    v-html="bubbleHtml(message, bubble, index)"
                  ></div>
                </div>
              </template>
            </template>

            <!-- 打字中指示器 -->
            <div v-if="isTyping" class="msg ai">
              <div class="msg-avatar" aria-hidden="true">
                <img v-if="siteAvatar" :src="siteAvatar" alt="" @error="onAvatarError" />
                <svg v-else viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
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

        <!-- 登录弹窗已改为全局组件（App.vue 中的 AuthModal），此处不再渲染局部登录卡片 -->

        <!-- 清空当前会话确认弹窗（开启全新会话，不删除数据库） -->
        <div v-if="clearConfirmVisible" class="login-overlay" @mousedown.self="cancelClearSession" @click.self="cancelClearSession">
          <div class="login-card">
            <h3>清空当前会话？</h3>
            <p>将清空当前对话并开启一个全新的会话，AI 不会再记得之前的聊天内容；历史记录仍完整保留在数据库中。</p>
            <div class="confirm-actions">
              <button class="confirm-btn" type="button" @click="cancelClearSession">取消</button>
              <button class="confirm-btn danger" type="button" @click="confirmClearSession">确认清空</button>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <!-- 已登录：会话操作 + 模型选择 + 昵称 + 退出 -->
          <div v-if="isLoggedIn() && user" class="user-bar">
            <div class="session-actions">
              <button
                class="session-btn"
                type="button"
                title="开启新会话（上下文重置）"
                aria-label="开启新会话"
                :disabled="isTyping"
                @click="startNewSession"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                <span>新会话</span>
              </button>
              <button
                class="session-btn"
                type="button"
                title="清空当前会话并开启全新会话（上下文重置）"
                aria-label="清空当前会话"
                :disabled="isTyping || !messages.length"
                @click="askClearSession"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                <span>清空</span>
              </button>
            </div>
            <div v-if="generalModels.length" ref="modelPickerEl" class="model-picker" :class="{ open: modelMenuOpen }">
              <button
                type="button"
                class="model-picker-trigger"
                aria-label="选择对话模型"
                aria-haspopup="listbox"
                :aria-expanded="modelMenuOpen"
                @click="toggleModelMenu"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 10 10 0 0 0-10-10z"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span class="model-picker-label">{{ currentModelLabel }}</span>
                <span class="model-picker-caret">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </button>

              <transition name="model-menu-pop">
                <ul v-if="modelMenuOpen" class="model-menu" role="listbox" aria-label="可选模型">
                  <li>
                    <button
                      type="button"
                      class="model-menu-item"
                      role="option"
                      :aria-selected="!selectedModelId"
                      :class="{ active: !selectedModelId }"
                      @click="pickModel('')"
                    >
                      <span class="model-menu-main">
                        <span class="model-menu-name">自动</span>
                        <span class="model-menu-desc">按顺序自动切换可用模型</span>
                      </span>
                      <svg class="model-menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                  </li>
                  <li v-for="m in generalModels" :key="m.id">
                    <button
                      type="button"
                      class="model-menu-item"
                      role="option"
                      :aria-selected="selectedModelId === m.id"
                      :class="{ active: selectedModelId === m.id }"
                      @click="pickModel(m.id)"
                    >
                      <span class="model-menu-main">
                        <span class="model-menu-name">{{ m.name }}</span>
                        <span class="model-menu-desc">
                          <span class="model-menu-provider">{{ providerLabel(m.provider) }}</span>
                          <span class="model-menu-id">{{ m.modelId }}</span>
                        </span>
                      </span>
                      <svg v-if="selectedModelId === m.id" class="model-menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                  </li>
                </ul>
              </transition>
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

.msg-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* 用户消息头像（头像 URL 回退昵称首字） */
.user-avatar .avatar-letter {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
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

/* 同一回答拆出的多条气泡相邻排列：收紧行距，与「不同消息」拉开层次 */
.msg.ai + .msg.ai {
  margin-top: -10px;
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

/* ===== AI 气泡内的 Markdown 排版 =====
   v-html 注入的节点不会带 scoped 的 data-v 属性，故统一用 :deep() 穿透；
   .bubble 上的 white-space: pre-wrap 是为纯文本准备的，Markdown 已生成块级结构，
   这里改回 normal，避免源码换行被渲染成多余空行。 */
.bubble.markdown-body {
  white-space: normal;
  overflow-wrap: anywhere;
}

.bubble.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.bubble.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble.markdown-body :deep(h1),
.bubble.markdown-body :deep(h2),
.bubble.markdown-body :deep(h3),
.bubble.markdown-body :deep(h4),
.bubble.markdown-body :deep(h5),
.bubble.markdown-body :deep(h6) {
  margin: 18px 0 10px;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-brand);
}

.bubble.markdown-body :deep(h1) {
  font-size: 19px;
}

.bubble.markdown-body :deep(h2) {
  font-size: 17px;
}

.bubble.markdown-body :deep(h1:first-child),
.bubble.markdown-body :deep(h2:first-child),
.bubble.markdown-body :deep(h3:first-child) {
  margin-top: 0;
}

.bubble.markdown-body :deep(ul),
.bubble.markdown-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}

.bubble.markdown-body :deep(ul) {
  list-style: disc;
}

.bubble.markdown-body :deep(ol) {
  list-style: decimal;
}

.bubble.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.bubble.markdown-body :deep(li:last-child) {
  margin-bottom: 0;
}

.bubble.markdown-body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.bubble.markdown-body :deep(a:hover) {
  color: var(--accent-hover);
}

.bubble.markdown-body :deep(blockquote) {
  margin: 0 0 10px;
  padding: 6px 12px;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  background-color: var(--bg-soft);
  color: var(--text-secondary);
}

.bubble.markdown-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.bubble.markdown-body :deep(hr) {
  margin: 14px 0;
  border: none;
  border-top: 1px solid var(--border);
}

/* 行内代码 */
.bubble.markdown-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: 5px;
  background-color: var(--bg-soft);
  color: var(--text-brand);
}

/* 代码块（utils/markdown.js 产出的 .code-block-wrap 结构） */
.bubble.markdown-body :deep(.code-block-wrap) {
  margin: 0 0 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.bubble.markdown-body :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background-color: #232624;
  color: #a8b3ad;
}

.bubble.markdown-body :deep(.code-lang) {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
}

.bubble.markdown-body :deep(.code-copy) {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  padding: 3px 9px;
  border: 1px solid #3a3f3c;
  border-radius: 100px;
  background: transparent;
  color: #a8b3ad;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bubble.markdown-body :deep(.code-copy:hover) {
  color: #ffffff;
  border-color: #5fc59a;
}

.bubble.markdown-body :deep(.code-copy.copied) {
  color: #5fc59a;
  border-color: #5fc59a;
}

.bubble.markdown-body :deep(pre.code-block) {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  white-space: pre;
  background-color: #1b1e1c;
}

.bubble.markdown-body :deep(pre.code-block code) {
  padding: 0;
  background: transparent;
  color: #dfe6e2;
  font-size: 12.5px;
  line-height: 1.7;
}

/* 表格 */
.bubble.markdown-body :deep(table) {
  display: block;
  width: 100%;
  margin: 0 0 10px;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 14px;
}

.bubble.markdown-body :deep(th),
.bubble.markdown-body :deep(td) {
  padding: 6px 12px;
  border: 1px solid var(--border);
  text-align: left;
}

.bubble.markdown-body :deep(th) {
  background-color: var(--bg-soft);
  font-weight: 600;
}

.bubble.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

/* :::callout 提示框 */
.bubble.markdown-body :deep(.md-callout) {
  margin: 0 0 10px;
  padding: 10px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  background-color: var(--bg-soft);
  font-size: 14px;
}

.bubble.markdown-body :deep(.md-callout[data-type='warning']) {
  border-left-color: #c39a4e;
}

.bubble.markdown-body :deep(.md-callout[data-type='info']) {
  border-left-color: #4a9d8e;
}

.bubble.markdown-body :deep(.md-callout .c-title) {
  margin-bottom: 4px;
  font-weight: 600;
}

.bubble.markdown-body :deep(.md-callout p:last-child) {
  margin-bottom: 0;
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

.welcome .welcome-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
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

/* 对话模型选择（自定义下拉） */
.model-picker {
  position: relative;
}
.model-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 100px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 12.5px;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.model-picker-trigger svg {
  flex-shrink: 0;
  color: var(--accent);
}
.model-picker-trigger:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--text-primary);
}
.model-picker.open .model-picker-trigger {
  border-color: var(--accent);
  background-color: var(--accent-light);
  color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}
::global([data-theme='dark']) .model-picker.open .model-picker-trigger { color: var(--accent); }
.model-picker-label {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.model-picker-caret {
  display: inline-flex;
  color: var(--text-tertiary);
  transition: transform var(--transition);
}
.model-picker.open .model-picker-caret {
  transform: rotate(180deg);
  color: var(--accent);
}

/* 下拉菜单面板 */
.model-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  min-width: 260px;
  max-width: min(340px, calc(100vw - 48px));
  margin: 0;
  padding: 6px;
  list-style: none;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
}
.model-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
}
.model-menu-item:hover {
  background-color: color-mix(in srgb, var(--accent-light) 55%, transparent);
  color: var(--text-primary);
}
.model-menu-item.active {
  color: var(--accent);
  background-color: var(--accent-light);
}
.model-menu-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.model-menu-name {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.model-menu-desc {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.model-menu-item.active .model-menu-desc { color: color-mix(in srgb, var(--accent) 75%, var(--text-tertiary)); }
.model-menu-provider {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  padding: 1px 8px;
  border-radius: 100px;
  background: var(--bg-soft);
  border: 1px solid var(--border-light);
  color: var(--text-tertiary);
}
.model-menu-item.active .model-menu-provider {
  background: transparent;
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  color: inherit;
}
.model-menu-id {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
}
.model-menu-check {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  color: var(--accent);
}

/* 下拉展开/收起动画 */
.model-menu-pop-enter-active,
.model-menu-pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.model-menu-pop-enter-from,
.model-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
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

/* 会话操作按钮（新会话 / 清空） */
.session-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
}

.session-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: var(--font-sans);
  padding: 5px 11px;
  border-radius: 100px;
  cursor: pointer;
  transition: all var(--transition);
}

.session-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}

.session-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.session-btn svg {
  width: 13px;
  height: 13px;
}

/* 清空确认弹窗操作按钮 */
.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.confirm-btn {
  flex: 1;
  max-width: 130px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 14px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition);
}

.confirm-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.confirm-btn.danger {
  background-color: #e5484d;
  border-color: #e5484d;
  color: #ffffff;
}

.confirm-btn.danger:hover {
  background-color: #d93a3f;
  border-color: #d93a3f;
  color: #ffffff;
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

  /* 小屏：会话按钮仅保留图标 */
  .session-btn span {
    display: none;
  }

  .session-btn {
    padding: 6px 9px;
  }
}
</style>
