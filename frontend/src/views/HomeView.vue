<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useTheme } from '@/composables/useTheme'
import { useApi } from '@/composables/useApi'

const api = useApi()

const props = defineProps({
  /** 后台「首页管理」实时预览数据：{ siteName, personTitle, codeContent, avatar }。
   * 传入时跳过接口加载，直接用该数据渲染，供管理端抽屉内复用本页渲染逻辑。 */
  previewData: { type: Object, default: null },
})

const DEFAULT_AVATAR = 'https://picsum.photos/seed/cat/400/400'

const profile = ref({
  avatar: DEFAULT_AVATAR,
  name: 'INKHEAP', // 首页名称（后台配置）
  role: '', // 人物 title（后台配置）
})

const socialLinks = [
  { label: 'yuque', href: 'https://www.yuque.com', icon: 'doc' },
  { label: 'github', href: 'https://github.com', icon: 'github' },
]

/* ===== 模式感知 ===== */
const { isDark } = useTheme()

/* ===== 首页配置（来自后台） ===== */
const codeContent = ref('Hello, World. Welcome to My Page!\nme show you about me!\n这里只能定义一部分的我，\n这里不能定义我的全部！')

function applyConfig(data) {
  if (data.siteName) profile.value.name = data.siteName
  if (data.personTitle) profile.value.role = data.personTitle
  if (data.codeContent) codeContent.value = data.codeContent
  // 优先使用后台配置的头像，缺失时回退默认占位图
  profile.value.avatar = api.assetUrl(data.avatar) || DEFAULT_AVATAR
}

async function loadHomeConfig() {
  // 管理端实时预览：直接使用传入的预览数据，跳过接口加载
  if (props.previewData) {
    applyConfig(props.previewData)
    runTypewriter()
    return
  }
  try {
    const data = await api.get('/public/home-page')
    applyConfig(data)
    runTypewriter()
  } catch (e) {
    // 拉取失败时使用默认值，保证页面可用
    runTypewriter()
  }
}

/* 管理端实时预览：表单数据变化时重新应用配置并（防抖后）重跑打字机 */
let previewTimer = null
watch(
  () => props.previewData,
  (data) => {
    if (!data) return
    applyConfig(data)
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(() => runTypewriter(), 300)
  },
  { deep: true },
)

/* ===== 终端打字机 ===== */
const terminalLines = computed(() =>
  codeContent.value
    .split('\n')
    .filter((l) => l.length > 0)
    .map((text) => ({ prompt: '', text })),
)

const typeSpeed = 11
const lineDelay = 80

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
  await loadHomeConfig()
  // 预览模式已在 loadHomeConfig 中启动打字机，无需再次延迟启动
  if (!props.previewData) {
    await wait(400)
    if (!cancelled) runTypewriter()
  }
})

onBeforeUnmount(() => {
  cancelTypewriter()
  if (previewTimer) clearTimeout(previewTimer)
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
          <img
            :src="profile.avatar"
            :alt="`${profile.name}的头像`"
            width="176"
            height="176"
            @error="profile.avatar = DEFAULT_AVATAR"
          />
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

  <AppFooter />
</template>

<style scoped>
/* Hero */
.hero {
  flex: 1 1 auto;
  /* 占满首屏（视口 - 顶栏），不预留页脚空间，使页脚落在首屏之外 */
  min-height: calc(100vh - 68px);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 80px;
  overflow: auto;
}

/* 移动端顶栏降为 60px，重新核算首屏高度 */
@media (max-width: 768px) {
  .hero {
    min-height: calc(100dvh - 60px);
  }
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
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid rgba(45, 130, 100, 0.35);
  box-shadow:
    0 0 0 1px rgba(45, 130, 100, 0.12),
    0 18px 48px rgba(45, 130, 100, 0.13),
    var(--shadow-lg);
}

.terminal-header {
  background-color: #1a1a1a;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(45, 130, 100, 0.25);
}

.terminal-dots {
  display: flex;
  align-items: center;
  gap: 6px;
}

.term-dot {
  width: 10px;
  height: 10px;
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
  height: 420px;
  overflow-y: auto;
  padding: 14px 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-brand);
}

.terminal-line {
  white-space: pre-wrap;
  margin-bottom: 2px;
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
    height: 400px;
    padding: 12px 14px;
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
    height: 360px;
    padding: 10px 12px;
    font-size: 12px;
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
