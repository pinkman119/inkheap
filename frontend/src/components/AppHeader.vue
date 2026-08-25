<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { useMode } from '@/composables/useMode'
import logoUrl from '@/assets/logo.png'

const props = defineProps({
  /** 当前高亮的导航项 key：home / kb / resume / digital / notes / about（空字符串表示不激活任何项） */
  activeKey: { type: String, default: '' },
  /** 顶栏内容区最大宽度（简历页原型为 1120px，其余为 1320px） */
  maxWidth: { type: String, default: '1320px' },
  /** 简历页原型的顶栏响应式断点为 720px，其余页面为 768px */
  narrow: { type: Boolean, default: false },
})

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { isWork, toggleMode, toast } = useMode()

/** 工作 / 生活两套导航（与原型 navData 一致），href 换成真实路由 */
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

const items = computed(() => (isWork.value ? navData.work : navData.life))
// 未匹配任何导航项时不强制高亮首页，避免跳转后错误停留在「首页」
const currentKey = computed(() =>
  items.value.some((i) => i.key === props.activeKey) ? props.activeKey : '',
)

const navLinksEl = ref(null)
const indicator = ref({ width: 0, left: 0 })
const preview = ref(false)
const spin = ref(false)
const modeSpin = ref(false)

function measure(el) {
  if (!el) {
    indicator.value = { width: 0, left: 0 }
    return
  }
  indicator.value = { width: el.offsetWidth, left: el.offsetLeft }
}

function activeEl() {
  const root = navLinksEl.value
  if (!root) return null
  return root.querySelector('a.active')
}

function syncIndicator() {
  measure(activeEl())
}

function onEnter(event, key) {
  if (key === currentKey.value) return
  preview.value = true
  measure(event.currentTarget)
}

function onLeave() {
  preview.value = false
  syncIndicator()
}

const onResize = () => syncIndicator()

onMounted(async () => {
  await nextTick()
  syncIndicator()
  window.addEventListener('resize', onResize)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncIndicator)
  }
})

onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// 主题切换会整组替换导航项，需要重新量一次下划线
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

function onToggleMode() {
  toggleMode()
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
  modeSpin.value = false
  requestAnimationFrame(() => {
    modeSpin.value = true
  })
}
</script>

<template>
  <header class="header" :class="{ 'header--narrow': narrow }">
    <div class="header-inner" :style="{ '--header-max': maxWidth }">
      <RouterLink to="/" class="brand" aria-label="墨堆">
        <span class="brand-mark" aria-hidden="true">
          <img :src="logoUrl" alt="" />
        </span>
        <span class="brand-name">墨堆</span>
      </RouterLink>

      <nav class="nav">
        <div ref="navLinksEl" class="nav-links" @mouseleave="onLeave">
          <RouterLink
            v-for="item in items"
            :key="item.key"
            :to="item.to"
            :class="{ active: item.key === currentKey }"
            :aria-current="item.key === currentKey ? 'page' : undefined"
            @mouseenter="onEnter($event, item.key)"
          >
            {{ item.label }}
          </RouterLink>
          <span
            class="nav-underline"
            :class="{ preview }"
            :style="{ width: indicator.width + 'px', transform: `translateX(${indicator.left}px)` }"
          />
        </div>

        <div class="theme-toggle-wrap">
          <!-- 工作 / 生活模式切换按钮 -->
          <button
            class="mode-toggle"
            type="button"
            :aria-label="isWork ? '切换到生活模式' : '切换到工作模式'"
            :aria-pressed="!isWork"
            @click="onToggleMode"
          >
            <!-- 公文包图标（工作模式显示） -->
            <svg
              v-if="isWork"
              :class="{ spin: modeSpin }"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <!-- 咖啡杯图标（生活模式显示） -->
            <svg
              v-else
              :class="{ spin: modeSpin }"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
            <span>{{ isWork ? '工作模式' : '生活模式' }}</span>
          </button>

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
        </div>
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
/* Header — 逐条搬自原型 HTML，数值未做任何调整 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: color-mix(in srgb, var(--bg-body) 92%, transparent);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
}

.header-inner {
  max-width: var(--header-max, 1320px);
  margin: 0 auto;
  padding: 0 24px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-serif);
  text-decoration: none;
  color: var(--text-primary);
}

.brand-mark {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.brand-mark svg,
.brand-mark img {
  width: 100%;
  height: 100%;
  display: block;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  color: var(--accent);
}

.nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-links {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
}

/* 滑动下划线 */
.nav-underline {
  position: absolute;
  left: 0;
  bottom: 4px;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), #3fae86);
  border-radius: 100px;
  transition:
    transform .5s cubic-bezier(.22, 1, .36, 1),
    width .5s cubic-bezier(.22, 1, .36, 1),
    opacity .35s ease;
  z-index: 0;
  pointer-events: none;
}

.nav-underline.preview {
  opacity: 0.4;
}

.nav-links a {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  text-decoration: none;
  letter-spacing: 0.04em;
  border-radius: 10px;
  transition:
    color var(--transition),
    background-color var(--transition);
}

.nav-links a:hover {
  color: var(--text-primary);
}

.nav-links a.active {
  color: var(--text-primary);
}

.nav-links a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.theme-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--accent);
  background-color: var(--accent-light);
  border: 1px solid transparent;
  padding: 7px 12px;
  border-radius: 100px;
  white-space: nowrap;
  user-select: none;
  cursor: pointer;
  transition: all var(--transition);
}

.mode-toggle svg {
  flex-shrink: 0;
  transition: transform .55s cubic-bezier(.22, 1, .36, 1);
}

.mode-toggle svg.spin {
  transform: rotate(360deg);
}

.mode-toggle:hover {
  border-color: var(--accent);
}

.mode-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

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
  transition: transform .55s cubic-bezier(.22, 1, .36, 1);
}

.theme-toggle svg.spin {
  transform: rotate(360deg);
}

/* 常规断点 768px（首页 / 知识库 / 详情 / 数字生命 / 关于我 / 小记） */
@media (max-width: 768px) {
  .header:not(.header--narrow) .header-inner {
    height: 60px;
    padding: 0 16px;
  }

  .header:not(.header--narrow) .nav-links {
    gap: 2px;
  }

  .header:not(.header--narrow) .nav-links a {
    font-size: 13px;
    padding: 0 13px;
  }

  .header:not(.header--narrow) .brand-name {
    font-size: 19px;
  }

  .header:not(.header--narrow) .brand-mark {
    width: 26px;
    height: 26px;
  }
}

/* 简历页原型的顶栏断点是 720px，单独还原 */
@media (max-width: 720px) {
  .header--narrow .header-inner {
    height: 60px;
    padding: 0 16px;
  }

  .header--narrow .nav-links a {
    font-size: 13px;
    padding: 0 13px;
  }

  .header--narrow .brand-name {
    font-size: 19px;
  }

  .header--narrow .brand-mark {
    width: 26px;
    height: 26px;
  }
}

@media (max-width: 480px) {
  .nav-links {
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
  animation: toast-icon-bounce .6s cubic-bezier(.34, 1.56, .64, 1) .12s both;
}

.mode-toast .toast-icon svg {
  width: 15px;
  height: 15px;
  transform-origin: center;
  animation: toast-icon-spin .5s cubic-bezier(.34, 1.56, .64, 1) .18s both;
}

.mode-toast .toast-text {
  line-height: 1;
  animation: toast-text-in .4s cubic-bezier(.22, 1, .36, 1) .2s both;
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
  animation: toast-shine 1.4s cubic-bezier(.4, 0, .2, 1) .25s both;
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
    transform: scale(.92) rotate(-4deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes toast-icon-spin {
  from {
    transform: rotate(-120deg) scale(.4);
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
  animation: toast-pop-in .55s cubic-bezier(.22, 1, .36, 1) both;
}

.toast-pop-leave-active {
  transition:
    opacity .35s ease,
    transform .35s ease,
    filter .35s ease;
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-26px) scale(.8);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px) scale(.9);
  filter: blur(4px);
}

@keyframes toast-pop-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-26px) scale(.8);
  }
  40% {
    opacity: 1;
    transform: translateX(-50%) translateY(3px) scale(1.06);
  }
  65% {
    transform: translateX(-50%) translateY(-2px) scale(.98);
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
