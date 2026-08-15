<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { fallbackReply, quickQuestions, replyRules, welcome } from '@/data/digitalLife'

/* =========================================================
   数字生命 · 对话逻辑（原型）
   - 当前回复为模拟数据（generateReply）
   - 后续接入点：用 RAG 检索「林深」知识库 + 提示词工程，
     替换 generateReply 为真实 LLM 调用即可，UI 无需改动。
   ========================================================= */

// 单一持续会话：不暴露会话管理，用户始终在一个对话里与「数字林深」交流
const messages = reactive([])
const isTyping = ref(false)
const draft = ref('')
const jumpVisible = ref(false)

const chatMessagesEl = ref(null)
const textareaEl = ref(null)

const canSend = computed(() => draft.value.trim().length > 0)

let seed = 0
const nextId = () => (seed += 1)

/* ---- 定时器统一登记，路由切走时清理 ---- */
let cancelled = false
const timers = new Set()
function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id)
    if (!cancelled) fn()
  }, ms)
  timers.add(id)
  return id
}

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
// 流式打字时即时跟随（贴近底部时直接贴底）
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

/* ---- 逐字打字（原型 appendMessage 的 animate 分支，16ms/字） ---- */
function typeOut(message, text) {
  let i = 0
  const step = () => {
    message.display = text.slice(0, i)
    i += 1
    if (i <= text.length) {
      nextTick(followStream)
      later(step, 16)
    }
  }
  step()
}

/* ---- 模拟回复生成（接入点：替换为 RAG + LLM） ---- */
function generateReply(text) {
  const hit = replyRules.find((rule) => rule.pattern.test(text))
  return hit ? hit.reply : fallbackReply
}

async function sendMessage(raw) {
  const text = (raw || '').trim()
  if (!text) return

  // 记录用户消息
  messages.push({ id: nextId(), role: 'user', display: text })
  draft.value = ''
  await nextTick()
  autoGrow()
  followStream()

  // AI 打字 + 回复
  isTyping.value = true
  await nextTick()
  scrollNew()

  const reply = generateReply(text)
  later(async () => {
    isTyping.value = false
    messages.push({ id: nextId(), role: 'ai', display: '' })
    const message = messages[messages.length - 1]
    await nextTick()
    if (cancelled) return
    typeOut(message, reply)
    followStream()
  }, 900 + Math.random() * 500)
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
  cancelled = true
  timers.forEach(clearTimeout)
  timers.clear()
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
              <h2>{{ welcome.title }}</h2>
              <p>{{ welcome.desc }}</p>
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

        <div class="chat-input">
          <div class="input-inner">
            <textarea
              ref="textareaEl"
              v-model="draft"
              class="chat-textarea"
              rows="1"
              placeholder="和「数字林深」聊聊…（回车发送）"
              aria-label="给「数字林深」发消息"
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
          <p class="input-hint">回车发送 · Shift+回车换行 · 当前为原型，回复为模拟数据，后续接入真实知识库</p>
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

/* 原型 @media (max-width: 480px) 内只有 .nav-links { display:none }，属顶栏样式，
   已在 AppHeader.vue 中还原，此处不再重复。
   同理 768px 断点内的 .header-inner / .nav-links a / .brand-name / .brand-mark 也在 AppHeader.vue。 */
</style>
