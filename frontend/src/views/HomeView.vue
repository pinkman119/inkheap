<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import SocialIcon from '@/components/SocialIcon.vue'
import { useTheme } from '@/composables/useTheme'
import { useApi } from '@/composables/useApi'
import { useMode } from '@/composables/useMode'
import { preloadForMode } from '@/composables/usePreload'
import { DEFAULT_AVATAR } from '@/composables/useSiteIdentity'

const api = useApi()

const props = defineProps({
  /** 后台「首页管理」实时预览数据：{ siteName, personTitle, codeContent, avatar, socialLinks }。
   * 传入时跳过接口加载，直接用该数据渲染，供管理端抽屉内复用本页渲染逻辑。 */
  previewData: { type: Object, default: null },
})

const profile = ref({
  avatar: DEFAULT_AVATAR,
  name: 'INKHEAP', // 首页名称（后台配置）
  role: '', // 人物 title（后台配置）
})

/** 后台未配置（或接口拉取失败）时的兜底社交链接 */
const DEFAULT_SOCIAL_LINKS = [
  { label: 'yuque', url: 'https://www.yuque.com', icon: 'yuque', svg: '' },
  { label: 'github', url: 'https://github.com', icon: 'github', svg: '' },
]

// 后台「首页管理」驱动；空数组表示用户主动清空，此时不展示社交区
const socialLinks = ref([...DEFAULT_SOCIAL_LINKS])

function applySocialLinks(raw) {
  if (!Array.isArray(raw)) {
    socialLinks.value = DEFAULT_SOCIAL_LINKS.map((item) => ({ ...item }))
    return
  }
  socialLinks.value = raw
    .filter((item) => item && (item.url || item.label))
    .map((item) => ({
      label: item.label ?? '',
      url: item.url ?? '',
      icon: item.icon ?? '',
      svg: item.svg ?? '',
    }))
}

/* ===== 模式感知 ===== */
const { isDark } = useTheme()
const { mode, isWork } = useMode()

/* ===== 目标页面数据预加载 ===== */
// 首页渲染完成后，在浏览器空闲窗口并发拉取当前模式目标页面的首屏接口，
// 用户切页时直接命中缓存、跳过请求，减少卡顿。
function schedulePreload() {
  // 管理端实时预览不预加载
  if (props.previewData) return
  const idle =
    window.requestIdleCallback ||
    ((cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 250))
  idle(() => preloadForMode(mode.value), { timeout: 1500 })
}

// 停留在首页时切换模式：预加载新模式的目标页面（此时 HomeView 不会重新挂载），
// 并按新模式重新挑选人物 title 与代码框内容、重跑打字机
watch(mode, () => {
  schedulePreload()
  if (rawConfig) {
    applyConfig(rawConfig)
    runTypewriter()
  }
})

/* ===== 首页配置（来自后台） ===== */
/** 接口未配置代码框内容时的兜底文案 */
const DEFAULT_CODE =
  'Hello, World. Welcome to My Page!\nme show you about me!\n这里只能定义一部分的我，\n这里不能定义我的全部！'

const codeContent = ref(DEFAULT_CODE)

/** 后台原始配置：模式切换时据此重新挑选 title 与代码框内容 */
let rawConfig = null

/** 按当前模式挑选配置：模式专属内容为空时回退到通用配置 */
function pickByMode(data) {
  const work = isWork.value
  return {
    ...data,
    personTitle: (work ? data.workPersonTitle : data.lifePersonTitle) || data.personTitle || '',
    codeContent: (work ? data.workCodeContent : data.lifeCodeContent) || data.codeContent || '',
  }
}

function applyConfig(data) {
  rawConfig = data
  const picked = pickByMode(data)
  if (picked.siteName) profile.value.name = picked.siteName
  profile.value.role = picked.personTitle
  codeContent.value = picked.codeContent || DEFAULT_CODE
  // 优先使用后台配置的头像，缺失时回退默认占位图
  profile.value.avatar = api.assetUrl(picked.avatar) || DEFAULT_AVATAR
  applySocialLinks(data.socialLinks)
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
  // 首页渲染完成后再后台预加载当前模式目标页面数据
  schedulePreload()
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
        <div v-if="socialLinks.length" class="social-links">
          <a
            v-for="(link, index) in socialLinks"
            :key="index"
            class="social-link"
            :href="link.url || '#'"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="social-link__icon">
              <SocialIcon :name="link.icon" :svg="link.svg" />
            </span>
            <span class="social-link__label">{{ link.label }}</span>
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
  /* 首屏略高于视口（视口 - 顶栏 + 48px），将 footer 顶部悬浮的回到顶部按钮挤出首屏 */
  min-height: calc(100vh - 68px + 48px);
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
    min-height: calc(100dvh - 60px + 48px);
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

/* 图标容器：固定尺寸后由内部图标撑满，预设图标与自定义 SVG 表现一致 */
.social-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

.social-link__label {
  line-height: 1;
}

/* hover 时按钮底色转为主色，品牌色图标统一变成跟随文字的剪影，避免同色系糊在一起 */
.social-link:hover :deep(svg.brand-icon path) {
  fill: currentColor;
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
