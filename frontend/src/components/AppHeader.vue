<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  /** 当前高亮的导航项 key：home / kb / resume / digital / notes / about */
  activeKey: { type: String, default: 'home' },
  /** 顶栏内容区最大宽度（简历页原型为 1120px，其余为 1320px） */
  maxWidth: { type: String, default: '1320px' },
  /** 简历页原型的顶栏响应式断点为 720px，其余页面为 768px */
  narrow: { type: Boolean, default: false },
})

const { isDark, toggleTheme } = useTheme()

/** 日间 / 夜间两套导航（与原型 navData 完全一致），href 换成真实路由 */
const navData = {
  day: [
    { key: 'home', label: '首页', to: '/' },
    { key: 'kb', label: '知识库', to: '/articles' },
    { key: 'resume', label: '简历', to: '/resume' },
    { key: 'digital', label: '数字生命', to: '/digital-life' },
  ],
  night: [
    { key: 'home', label: '首页', to: '/' },
    { key: 'notes', label: '小记', to: '/xiaoji' },
    { key: 'about', label: '关于我', to: '/about' },
    { key: 'digital', label: '数字生命', to: '/digital-life' },
  ],
}

const items = computed(() => (isDark.value ? navData.night : navData.day))
const currentKey = computed(() =>
  items.value.some((i) => i.key === props.activeKey) ? props.activeKey : items.value[0].key,
)

const navLinksEl = ref(null)
const indicator = ref({ width: 0, left: 0 })
const preview = ref(false)
const spin = ref(false)

function measure(el) {
  if (!el) return
  indicator.value = { width: el.offsetWidth, left: el.offsetLeft }
}

function activeEl() {
  const root = navLinksEl.value
  if (!root) return null
  return root.querySelector('a.active') || root.querySelector('a')
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
</script>

<template>
  <header class="header" :class="{ 'header--narrow': narrow }">
    <div class="header-inner" :style="{ '--header-max': maxWidth }">
      <RouterLink to="/" class="brand" aria-label="墨堆">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="#2d8264" />
            <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
            <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
            <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
          </svg>
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
          <button
            class="theme-toggle"
            type="button"
            :aria-label="isDark ? '切换到工作模式' : '切换到生活模式'"
            :aria-pressed="isDark"
            @click="onToggleTheme"
          >
            <!-- 太阳图标（夜间模式显示） -->
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
          <span class="theme-mode-label">{{ isDark ? '生活模式' : '工作模式' }}</span>
        </div>
      </nav>
    </div>
  </header>
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

.theme-mode-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
  background-color: var(--accent-light);
  padding: 5px 10px;
  border-radius: 100px;
  white-space: nowrap;
  user-select: none;
}

.theme-mode-label::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--accent);
  flex-shrink: 0;
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

/* 简历页打印时隐藏顶栏 */
@media print {
  .header {
    display: none !important;
  }
}
</style>
