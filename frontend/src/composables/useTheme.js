import { computed, ref, readonly } from 'vue'

const STORAGE_KEY = 'theme'

function detectInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'dark' || attr === 'light') return attr
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  return 'dark'
}

/** 全站唯一的主题状态（模块级单例，跨组件共享） */
const theme = ref(detectInitialTheme())
const isDark = computed(() => theme.value === 'dark')

function applyTheme(value) {
  if (typeof document === 'undefined') return
  if (value === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

applyTheme(theme.value)

/**
 * 主题切换：「默认深色 + localStorage 记忆」策略。
 * 深色时给 <html> 加 data-theme="dark"，浅色时移除该属性。
 */
export function useTheme() {
  function setTheme(value) {
    theme.value = value === 'dark' ? 'dark' : 'light'
    applyTheme(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch (e) {
      /* 隐私模式下忽略 */
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(theme),
    isDark,
    setTheme,
    toggleTheme,
  }
}

export { theme, isDark }
