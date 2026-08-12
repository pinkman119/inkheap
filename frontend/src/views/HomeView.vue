<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useTheme } from '@/composables/useTheme'

const profile = {
  avatar: 'https://picsum.photos/seed/cat/400/400',
  name: '慕士塔格猫',
  role: 'AI 全栈工程师 / 系统分析师 / 数据库系统工程师 / 党员 / 救护员 / 摄影师 / 登山者',
}

const socialLinks = [
  { label: 'yuque', href: 'https://www.yuque.com', icon: 'doc' },
  { label: 'github', href: 'https://github.com', icon: 'github' },
]

/* ===== 模式感知 ===== */
const { isDark } = useTheme()

/* ===== 终端打字机 ===== */
const terminalLinesWork = [
  { prompt: '', text: 'Hello, World. Welcome to My Page!' },
  { prompt: '$ ', text: 'me show you about me!' },
  { prompt: '', text: '这里只能定义一部分的我，' },
  { prompt: '', text: '这里不能定义我的全部！' },
]

const terminalLinesLife = [
  { prompt: '$ ', text: 'Do not go gentle into that good night!' },
  { prompt: '', text: '不要温和的踏入那良夜！' },
]

const terminalLines = computed(() => (isDark.value ? terminalLinesLife : terminalLinesWork))

const typeSpeed = 45
const lineDelay = 360

const rendered = reactive([])
const showCursor = ref(false)
let timers = []
let cancelled = false

const wait = (ms) =>
  new Promise((resolve) => {
    const id = setTimeout(resolve, ms)
    timers.push(id)
  })

function cancelTypewriter() {
  cancelled = true
  timers.forEach(clearTimeout)
  timers = []
}

async function runTypewriter() {
  cancelTypewriter()
  cancelled = false
  timers = []
  rendered.splice(0, rendered.length)
  showCursor.value = false
  const lines = terminalLines.value
  for (const line of lines) {
    if (cancelled) return
    const row = reactive({ prompt: line.prompt, text: '' })
    rendered.push(row)
    for (let i = 0; i < line.text.length; i += 1) {
      if (cancelled) return
      row.text += line.text[i]
      await wait(typeSpeed)
    }
    await wait(lineDelay)
  }
  if (!cancelled) showCursor.value = true
}

watch(isDark, () => {
  runTypewriter()
})

onMounted(async () => {
  await wait(400)
  if (!cancelled) runTypewriter()
})

onBeforeUnmount(() => {
  cancelTypewriter()
})
</script>

<template>
  <AppHeader active-key="home" />

  <main class="hero">
    <div class="hero-glow" />
    <div class="hero-grid">
      <!-- 左：个人名片 -->
      <section class="profile" aria-label="个人名片">
        <div class="avatar">
          <img :src="profile.avatar" :alt="`${profile.name}的头像`" width="176" height="176" />
        </div>
        <h1 class="name">{{ profile.name }}</h1>
        <p class="role">{{ profile.role }}</p>
        <div class="social-links">
          <a
            v-for="link in socialLinks"
            :key="link.label"
            class="social-link"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              v-if="link.icon === 'doc'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
              />
            </svg>
            {{ link.label }}
          </a>
        </div>
      </section>

      <!-- 右：终端 -->
      <section class="terminal-wrap" aria-label="终端自我介绍">
        <div class="terminal">
          <div class="terminal-header">
            <div class="terminal-dots">
              <span class="term-dot red" />
              <span class="term-dot yellow" />
              <span class="term-dot green" />
            </div>
            <span class="terminal-title">Terminal</span>
          </div>
          <div class="terminal-body" aria-live="polite">
            <div v-for="(line, index) in rendered" :key="index" class="terminal-line">
              <span v-if="line.prompt" class="prompt">{{ line.prompt }}</span>
              <span>{{ line.text }}</span>
              <span v-if="showCursor && index === rendered.length - 1" class="cursor" />
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <AppFooter padding-y="28px" />
</template>

<style scoped>
/* Hero */
.hero {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 80px;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: 50%;
  right: 15%;
  transform: translateY(-50%);
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px);
  pointer-events: none;
  z-index: 0;
}

[data-theme='dark'] .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.12), transparent 65%);
}

.hero-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1040px;
  display: grid;
  grid-template-columns: 1fr 1.8fr;
  gap: 64px;
  align-items: center;
}

/* 左：个人名片 */
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar {
  width: 176px;
  height: 176px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--accent);
  box-shadow:
    var(--shadow-md),
    0 0 0 8px var(--accent-light);
  background-color: var(--bg-card);
  margin-bottom: 28px;
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.avatar:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    var(--shadow-lg),
    0 0 0 10px var(--accent-light);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.name {
  position: relative;
  font-family: var(--font-serif);
  font-size: 38px;
  font-weight: 700;
  color: var(--text-brand);
  margin-bottom: 12px;
  padding-bottom: 14px;
  letter-spacing: 0.02em;
}

.name::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}

.role {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-brand);
  margin-bottom: 26px;
}

.social-links {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: all var(--transition);
}

.social-link:hover {
  border-color: var(--accent);
  color: #ffffff;
  background-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 130, 100, 0.22);
}

[data-theme='dark'] .social-link:hover {
  box-shadow: 0 4px 12px rgba(95, 197, 154, 0.18);
}

.social-link svg {
  width: 16px;
  height: 16px;
}

/* 右：终端 */
.terminal-wrap {
  width: 100%;
}

.terminal {
  background-color: #0f0f0f;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid rgba(45, 130, 100, 0.35);
  box-shadow:
    0 0 0 1px rgba(45, 130, 100, 0.12),
    0 18px 48px rgba(45, 130, 100, 0.13),
    var(--shadow-lg);
}

.terminal-header {
  background-color: #1a1a1a;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(45, 130, 100, 0.25);
}

.terminal-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.term-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.term-dot.red {
  background: #ff5f56;
}

.term-dot.yellow {
  background: #ffbd2e;
}

.term-dot.green {
  background: #27c93f;
}

.terminal-title {
  font-family: var(--font-mono);
  font-size: 12px;
  color: #888;
  letter-spacing: 0.04em;
}

.terminal-body {
  min-height: 320px;
  padding: 36px 38px;
  font-family: var(--font-mono);
  font-size: 15.5px;
  line-height: 1.95;
  color: var(--text-brand);
}

.terminal-line {
  white-space: pre-wrap;
  margin-bottom: 6px;
}

.terminal-line:last-child {
  margin-bottom: 0;
}

.terminal-body .prompt {
  color: #4ade80;
  font-weight: 600;
}

.cursor {
  display: inline-block;
  width: 8px;
  height: 1.1em;
  background-color: #4ade80;
  vertical-align: middle;
  margin-left: 3px;
  animation: blink 1.1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* 暗色模式下的终端微调 */
[data-theme='dark'] .terminal {
  border-color: rgba(95, 197, 154, 0.35);
  box-shadow:
    0 0 0 1px rgba(95, 197, 154, 0.12),
    0 18px 48px rgba(95, 197, 154, 0.14),
    var(--shadow-lg);
}

[data-theme='dark'] .terminal-header {
  border-bottom-color: rgba(95, 197, 154, 0.22);
}

[data-theme='dark'] .terminal-body {
  color: var(--text-brand);
}

[data-theme='dark'] .terminal-body .prompt {
  color: #86efac;
}

[data-theme='dark'] .cursor {
  background-color: #86efac;
}

/* 响应式 */
@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 42px;
    max-width: 640px;
  }

  .terminal-wrap {
    order: -1;
  }

  .terminal-body {
    min-height: 240px;
    padding: 26px 28px;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 32px 16px 56px;
  }

  .name {
    font-size: 30px;
  }

  .avatar {
    width: 160px;
    height: 160px;
    margin-bottom: 22px;
  }

  .terminal-body {
    min-height: 220px;
    padding: 22px 24px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .social-links {
    gap: 10px;
  }

  .social-link {
    padding: 7px 14px;
    font-size: 13px;
  }
}
</style>
