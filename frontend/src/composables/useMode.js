import { computed, ref, readonly } from 'vue'

const STORAGE_KEY = 'inkheap-mode'

function detectInitialMode() {
  if (typeof window === 'undefined') return 'work'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'work' || saved === 'life') return saved
  return 'work'
}

/** 全站唯一的工作 / 生活模式状态（模块级单例，跨组件共享），默认工作模式 */
const mode = ref(detectInitialMode())
const isWork = computed(() => mode.value === 'work')
const isLife = computed(() => mode.value === 'life')

/** 模式切换提示弹窗（模块级单例，路由跳转后组件重挂载仍可继续显示） */
const toast = ref({ visible: false, message: '', icon: 'life' })
let toastTimer = null

function showToast(message, icon) {
  toast.value = { visible: true, message, icon }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = { visible: false, message: '' }
  }, 2600)
}

/**
 * 工作 / 生活模式切换：
 * 工作模式 → 首页 / 知识库 / 简历 / 数字生命
 * 生活模式 → 首页 / 小记 / 关于我 / 数字生命
 * 仅影响导航跳转，与黑夜 / 白天主题完全独立。
 */
export function useMode() {
  function setMode(value) {
    mode.value = value === 'life' ? 'life' : 'work'
    try {
      localStorage.setItem(STORAGE_KEY, mode.value)
    } catch (e) {
      /* 隐私模式下忽略 */
    }
  }

  function toggleMode() {
    const next = mode.value === 'work' ? 'life' : 'work'
    setMode(next)
    showToast(next === 'life' ? '已切换到生活模式' : '已切换到工作模式', next)
  }

  return {
    mode: readonly(mode),
    isWork,
    isLife,
    toast,
    setMode,
    toggleMode,
  }
}

export { mode, isWork, isLife, toast }
