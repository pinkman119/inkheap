import { ref } from 'vue'

/**
 * 全局登录弹窗状态：数字生命页 / 文章评论 / 小记评论共用。
 * - open(options)   打开弹窗（可指定初始视图与成功回调）
 * - close()         关闭
 * - onSuccess       登录/注册成功后触发（弹窗内部负责关闭）
 */

const visible = ref(false)
// login | register | forgot
const view = ref('login')
// 登录成功回调（一次性，触发后清除）
let successCallback = null

export function useAuthModal() {
  function open(options = {}) {
    view.value = options.view || 'login'
    successCallback = options.onSuccess || null
    visible.value = true
  }

  function close() {
    visible.value = false
    successCallback = null
  }

  /** 弹窗内部调用：登录成功后通知等待方 */
  function notifySuccess() {
    const cb = successCallback
    successCallback = null
    visible.value = false
    if (cb) cb()
  }

  return { visible, view, open, close, notifySuccess }
}
