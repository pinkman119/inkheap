<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useMode } from '@/composables/useMode'
import logoUrl from '@/assets/logo.png'

const props = defineProps({
  /** 显式指定高亮的导航项 key：home / kb / resume / digital / notes / about；留空时自动按路由 meta.navKey 匹配 */
  activeKey: { type: String, default: '' },
  /** 顶栏内容区最大宽度（简历页原型为 1120px，其余为 1320px） */
  maxWidth: { type: String, default: '1320px' },
  /** 简历页原型的顶栏响应式断点为 720px，其余页面为 768px */
  narrow: { type: Boolean, default: false },
})

const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()
const { isWork, setMode, toggleMode, toast } = useMode()

/** 工作 / 生活两套导航（与原型 modeData 一致），href 换成真实路由 */
const navData = {
  work: [
    { key: 'home', label: '首页', to: '/' },
    { key: 'kb', label: '知识库', to: '/articles' },
    { key: 'resume', label: '简历', to: '/resume' },
    { key: 'digital', label: '数字生命', to: '/digital-life' },
  ],
  life: [
    { key: 'home', label: '首页', to: '/' },
    { key: 'notes', label: '小记', to: '/xiaoji' },
    { key: 'about', label: '关于我', to: '/about' },
    { key: 'digital', label: '数字生命', to: '/digital-life' },
  ],
}

/** 模式切换动画期间冻结旧列表（与原型 200ms 退场节奏一致） */
const pendingItems = ref(null)
const items = computed(() => pendingItems.value ?? (isWork.value ? navData.work : navData.life))

// 激活项来源：显式传入的 prop 优先，否则按当前路由 meta.navKey 自动匹配
const activeKey = computed(() => props.activeKey || route.meta?.navKey || '')

/** 页面访问后自动对齐到正确的模式（让导航与页面内容一致，体验更自然） */
function syncModeForKey(key) {
  if (!key || key === 'home') return
  const inWork = navData.work.some((i) => i.key === key)
  const inLife = navData.life.some((i) => i.key === key)
  if (inWork && !inLife && !isWork.value) setMode('work')
  else if (inLife && !inWork && isWork.value) setMode('life')
}

// 原型行为：当前 key 不在本模式导航中时回落到第一项（首页）
const currentKey = computed(() =>
  items.value.some((i) => i.key === activeKey.value) ? activeKey.value : items.value[0].key,
)

const navLinksEl = ref(null)
/** 滑动描边框位置：跟随激活 / 悬停项移动（原型 nav-outline） */
const indicator = ref({ width: 0, left: 0, visible: false })
/** 模式切换时导航项的退场 / 入场状态（原型 leaving / entering） */
const navLeaving = ref(false)
const navEntering = ref(false)
const spin = ref(false)

function measure(el) {
  if (!el) {
    indicator.value = { width: 0, left: 0, visible: false }
    return
  }
  indicator.value = { width: el.offsetWidth, left: el.offsetLeft, visible: true }
}

function activeEl() {
  const root = navLinksEl.value
  if (!root) return null
  return root.querySelector('a.active')
}

function syncIndicator() {
  // 退场动画期间保持描边框隐藏（原型 switchMode 会先将 outline 置为透明）
  if (navLeaving.value) return
  measure(activeEl())
}

function onEnter(event) {
  measure(event.currentTarget)
}

function onLeave() {
  syncIndicator()
}

const onResize = () => syncIndicator()

onMounted(async () => {
  await nextTick()
  syncModeForKey(activeKey.value)
  syncIndicator()
  window.addEventListener('resize', onResize)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncIndicator)
  }
})

// 路由变化时同步模式（确保直接刷新 / 链接打开到生活/工作专属页面时导航列表对齐）
watch(() => route.fullPath, () => {
  syncModeForKey(activeKey.value)
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// 模式 / 激活项变化整组替换导航项，需要重新量一次描边框
watch([items, currentKey], async () => {
  await nextTick()
  syncIndicator()
})

function onToggleTheme() {
  toggleTheme()
  spin.value = false
  requestAnimationFrame(() => {
    spin.value = true
  })
}

/**
 * 模式切换（原型节奏）：
 * 1. 冻结旧导航列表并整体退场（opacity 0 + 下移 6px）
 * 2. 200ms 后渲染新模式列表，先处于隐藏态，强制 reflow 后移除入场类触发过渡
 */
function onToggleMode(mode) {
  if (navLeaving.value || mode === (isWork.value ? 'work' : 'life')) return
  pendingItems.value = items.value
  toggleMode()
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
  navLeaving.value = true
  indicator.value = { width: 0, left: 0, visible: false }
  setTimeout(() => {
    pendingItems.value = null
    navLeaving.value = false
    nextTick().then(() => {
      navEntering.value = true
      // 强制 reflow，确保入场过渡能触发（原型 void offsetWidth）
      void navLinksEl.value?.offsetWidth
      requestAnimationFrame(() => {
        navEntering.value = false
      })
      syncIndicator()
    })
  }, 200)
}
</script>

<template>
  <header class="header" :class="{ 'header--narrow': narrow }">
    <div class="header-inner" :style="{ '--header-max': maxWidth }">
      <RouterLink to="/" class="brand" aria-label="墨堆">
        <span class="brand-mark" aria-hidden="true">
          <img :src="logoUrl" alt="" />
        </span>
        <span class="brand-text">
          <span class="brand-name">墨堆</span>
          <span class="brand-divider" aria-hidden="true"></span>
          <span class="brand-tag">光阴易逝，数字永生</span>
        </span>
      </RouterLink>

      <nav class="nav">
        <div class="nav-wrap">
          <div ref="navLinksEl" class="nav-links" @mouseleave="onLeave">
            <RouterLink
              v-for="item in items"
              :key="item.key"
              :to="item.to"
              :class="{
                active: item.key === currentKey,
                leaving: navLeaving,
                entering: navEntering,
              }"
              :aria-current="item.key === currentKey ? 'page' : undefined"
              @mouseenter="onEnter"
            >
              {{ item.label }}
            </RouterLink>
          </div>
          <span
            class="nav-outline"
            aria-hidden="true"
            :style="{
              width: `${indicator.width}px`,
              transform: `translateX(${indicator.left}px)`,
              opacity: indicator.visible ? 1 : 0,
            }"
          />
        </div>

        <!-- 工作 / 生活模式 — 滑块式切换（原型 mode-toggle） -->
        <div
          class="mode-toggle"
          :data-mode="isWork ? 'work' : 'life'"
          role="group"
          aria-label="工作/生活模式切换"
        >
          <span class="mode-toggle__thumb" aria-hidden="true"></span>
          <button
            type="button"
            class="mode-toggle__opt"
            :class="{ active: isWork }"
            :aria-pressed="isWork"
            @click="onToggleMode('work')"
          >
            工作
          </button>
          <button
            type="button"
            class="mode-toggle__opt"
            :class="{ active: !isWork }"
            :aria-pressed="!isWork"
            @click="onToggleMode('life')"
          >
            生活
          </button>
        </div>

        <button
          class="theme-toggle"
          type="button"
          :aria-label="isDark ? '切换到白天模式' : '切换到黑夜模式'"
          :aria-pressed="isDark"
          @click="onToggleTheme"
        >
          <!-- 太阳图标（黑夜模式显示） -->
          <svg
            v-if="isDark"
            :class="{ spin }"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <!-- 月亮图标（白天模式显示） -->
          <svg
            v-else
            :class="{ spin }"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </nav>
    </div>
  </header>

  <!-- 模式切换提示（灵动弹入 / 渐变消失） -->
  <Transition name="toast-pop">
    <div v-if="toast.visible" class="mode-toast" role="status">
      <span class="toast-icon">
        <!-- 公文包图标（工作模式显示） -->
        <svg
          v-if="toast.icon === 'work'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <!-- 咖啡杯图标（生活模式显示） -->
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      </span>
      <span class="toast-text">{{ toast.message }}</span>
      <span class="toast-shine"></span>
    </div>
  </Transition>
</template>

<style scoped>
/* ===== Header — 严格按原型 index.html 逐条还原 ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: color-mix(in srgb, var(--bg-body) 90%, transparent);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

/* 底部品牌色渐变装饰线 */
.header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent) 50%, transparent);
  opacity: 0.55;
}

.header-inner {
  max-width: var(--header-max, 1320px);
  margin: 0 auto;
  padding: 0 28px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Brand — 渐变印章式 logo + 衬线站名 + 编辑感标语 */
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-serif);
  text-decoration: none;
  color: var(--text-primary);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  transition: transform var(--transition);
}

.brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.brand:hover .brand-mark {
  transform: translateY(-1px) rotate(-2deg);
}

.brand-text {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1;
  color: var(--accent);
}

.brand-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
}

.brand-tag {
  font-family: var(--font-sans);
  font-size: 12.5px;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  white-space: nowrap;
}

/* Nav — 文字链接 + 滑动描边框 */
.nav {
  display: flex;
  align-items: center;
  gap: 18px;
}

.nav-wrap {
  position: relative;
}

.nav-links {
  position: relative;
  display: flex;
  align-items: center;
  gap: 22px;
  height: 36px;
}

.nav-links a {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 13px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  letter-spacing: 0.04em;
  white-space: nowrap;
  border-radius: 999px;
  transition:
    color var(--transition),
    opacity 0.22s ease,
    transform 0.22s ease;
}

.nav-links a:hover {
  color: var(--accent);
}

.nav-links a.active {
  color: var(--accent);
  font-weight: 600;
}

/* 模式切换的退场 / 入场（原型 leaving / entering） */
.nav-links a.leaving,
.nav-links a.entering {
  opacity: 0;
  transform: translateY(6px);
}

.nav-links a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 滑动描边框：包裹激活 / 悬停项 */
.nav-outline {
  position: absolute;
  top: 0;
  height: 36px;
  width: 0;
  border: 1.5px solid var(--accent);
  border-radius: 999px;
  opacity: 0;
  transition:
    transform var(--transition),
    width var(--transition),
    opacity 0.2s ease;
  pointer-events: none;
}

/* 工作 / 生活模式 — 滑块式切换 */
.mode-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  gap: 0;
  background: var(--bg-soft);
  border: 1px solid var(--border-light);
  border-radius: 999px;
}

.mode-toggle__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(45, 130, 100, 0.28);
  transition: transform var(--transition);
  pointer-events: none;
}

.mode-toggle[data-mode='life'] .mode-toggle__thumb {
  transform: translateX(100%);
}

[data-theme='dark'] .mode-toggle__thumb {
  box-shadow: 0 2px 6px rgba(95, 197, 154, 0.22);
}

.mode-toggle__opt {
  position: relative;
  z-index: 1;
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 6px 13px;
  border-radius: 999px;
  letter-spacing: 0.06em;
  min-width: 54px;
  transition: color var(--transition);
}

.mode-toggle__opt:hover {
  color: var(--accent);
}

.mode-toggle__opt.active {
  color: #fff;
}

.mode-toggle__opt:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 主题切换按钮 */
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition);
}

.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.theme-toggle svg {
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-toggle svg.spin {
  transform: rotate(360deg);
}

/* 常规断点 768px（首页 / 知识库 / 详情 / 数字生命 / 关于我 / 小记，数值来自原型） */
@media (max-width: 768px) {
  .header:not(.header--narrow) .header-inner {
    height: 62px;
    padding: 0 16px;
  }

  .header:not(.header--narrow) .nav-links a {
    font-size: 13.5px;
  }

  .header:not(.header--narrow) .brand-name {
    font-size: 19px;
  }

  .header:not(.header--narrow) .brand-mark {
    width: 30px;
    height: 30px;
  }

  .header:not(.header--narrow) .brand-tag,
  .header:not(.header--narrow) .brand-divider {
    display: none;
  }
}

/* 简历页原型的顶栏断点是 720px，单独还原 */
@media (max-width: 720px) {
  .header--narrow .header-inner {
    height: 62px;
    padding: 0 16px;
  }

  .header--narrow .nav-links a {
    font-size: 13.5px;
  }

  .header--narrow .brand-name {
    font-size: 19px;
  }

  .header--narrow .brand-mark {
    width: 30px;
    height: 30px;
  }

  .header--narrow .brand-tag,
  .header--narrow .brand-divider {
    display: none;
  }
}

@media (max-width: 480px) {
  .nav-wrap {
    display: none;
  }
}

/* 模式切换提示弹窗（毛玻璃卡片 + 图标 + 光带） */
.mode-toast {
  position: fixed;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 22px 8px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 28px rgba(45, 130, 100, 0.16),
    var(--shadow-md);
  backdrop-filter: blur(14px);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.03em;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
}

/* 图标：弹跳入场 */
.mode-toast .toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #3fae86);
  color: #fff;
  box-shadow: 0 2px 8px rgba(45, 130, 100, 0.35);
  flex-shrink: 0;
  animation: toast-icon-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s both;
}

.mode-toast .toast-icon svg {
  width: 15px;
  height: 15px;
  transform-origin: center;
  animation: toast-icon-spin 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.18s both;
}

.mode-toast .toast-text {
  line-height: 1;
  animation: toast-text-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
}

/* 光带扫过 */
.mode-toast .toast-shine {
  position: absolute;
  top: -40%;
  bottom: -40%;
  left: -60%;
  width: 45%;
  transform: skewX(-20deg);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.45),
    transparent
  );
  animation: toast-shine 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.25s both;
}

@keyframes toast-icon-bounce {
  0% {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  55% {
    transform: scale(1.25) rotate(10deg);
    opacity: 1;
  }
  75% {
    transform: scale(0.92) rotate(-4deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes toast-icon-spin {
  from {
    transform: rotate(-120deg) scale(0.4);
  }
  to {
    transform: rotate(0) scale(1);
  }
}

@keyframes toast-text-in {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toast-shine {
  0% {
    left: -60%;
  }
  60% {
    left: 110%;
  }
  100% {
    left: 110%;
    opacity: 0;
  }
}

[data-theme='dark'] .mode-toast {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 8px 28px rgba(95, 197, 154, 0.16),
    var(--shadow-md);
}

[data-theme='dark'] .mode-toast .toast-icon {
  box-shadow: 0 2px 8px rgba(95, 197, 154, 0.35);
}

/* 入场：带 overshoot 的多段弹跳下落；离场：淡出 + 缩小 + 上飘 */
.toast-pop-enter-active {
  animation: toast-pop-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.toast-pop-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease,
    filter 0.35s ease;
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-26px) scale(0.8);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px) scale(0.9);
  filter: blur(4px);
}

@keyframes toast-pop-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-26px) scale(0.8);
  }
  40% {
    opacity: 1;
    transform: translateX(-50%) translateY(3px) scale(1.06);
  }
  65% {
    transform: translateX(-50%) translateY(-2px) scale(0.98);
  }
  82% {
    transform: translateX(-50%) translateY(1px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

/* 简历页打印时隐藏顶栏 */
@media print {
  .header {
    display: none !important;
  }
}
</style>
