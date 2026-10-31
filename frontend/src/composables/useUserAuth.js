import { ref } from 'vue'

/**
 * 前台访客登录态（邮箱账号，独立于 admin token）。
 * - 登录态由后端 httpOnly cookie（user_token，14 天）维持，前端不持有 token
 * - 初始通过 GET /user/auth/me 探测；401 时自动回到未登录态
 * - 所有请求带 credentials: 'include'（生产同源自动携带，dev 跨端口依赖 CORS）
 */

const user = ref(null)
// 初始探测是否完成（避免页面闪烁「未登录」状态）
const authReady = ref(false)
// 探测防重入
let probing = null

// 清理旧版（微信 mock 登录）遗留的 localStorage 键，避免幽灵登录态
;['dl_user_token', 'dl_user', 'dl_openid'].forEach((k) => localStorage.removeItem(k))

function apiBase() {
  const isDev =
    typeof window !== 'undefined' &&
    (window.location.port === '5173' || window.location.port === '4173')
  return isDev ? 'http://localhost:3000/api' : '/api'
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || '请求失败，请稍后再试')
    err.status = res.status
    throw err
  }
  return data
}

export function useUserAuth() {
  const isLoggedIn = () => !!user.value

  /** 探测登录态（幂等，多处调用只发一次请求） */
  async function refresh() {
    if (!probing) {
      probing = request('/user/auth/me')
        .then((u) => {
          user.value = u
        })
        .catch(() => {
          user.value = null
        })
        .finally(() => {
          authReady.value = true
          probing = null
        })
    }
    return probing
  }

  function applyUser(u) {
    user.value = u || null
  }

  function clearAuth() {
    user.value = null
  }

  /** 邮箱 + 密码登录；成功后写入用户态 */
  async function login(payload) {
    const data = await request('/public/auth/login', { method: 'POST', body: payload })
    applyUser(data.user)
    return data.user
  }

  /** 注册（含验证码）；成功后自动登录 */
  async function register(payload) {
    const data = await request('/public/auth/register', { method: 'POST', body: payload })
    applyUser(data.user)
    return data.user
  }

  /** 登出（清除 cookie + 本地态） */
  async function logout() {
    try {
      await request('/user/auth/logout', { method: 'POST' })
    } catch {
      /* 后端失败也清空本地态 */
    }
    clearAuth()
  }

  /** 发送注册验证码 */
  async function sendCode(email) {
    return request('/public/auth/send-code', { method: 'POST', body: { email } })
  }

  /** 忘记密码：已注册则明文密码发送到邮箱 */
  async function forgotPassword(email) {
    return request('/public/auth/forgot-password', { method: 'POST', body: { email } })
  }

  return {
    user,
    authReady,
    isLoggedIn,
    refresh,
    applyUser,
    clearAuth,
    login,
    register,
    logout,
    sendCode,
    forgotPassword,
  }
}
