import { ref } from 'vue'

/**
 * 数字生命访客登录态（独立于 admin token，互不干扰）。
 * - token / user 存 localStorage（dl_user_token / dl_user / dl_openid）
 * - dl_openid 单独记录：mock 登录时携带以复用身份（续聊历史）
 */

const TOKEN_KEY = 'dl_user_token'
const USER_KEY = 'dl_user'
const OPENID_KEY = 'dl_openid'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const user = ref(safeParse(localStorage.getItem(USER_KEY)))

function safeParse(str) {
  try {
    return JSON.parse(str || 'null')
  } catch {
    return null
  }
}

export function useUserAuth() {
  const isLoggedIn = () => !!token.value

  function setAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    // 记录 openid 供 mock 登录复用身份
    if (u?.openid) localStorage.setItem(OPENID_KEY, u.openid)
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    // 保留 openid：下次登录仍可复用同一身份与聊天历史
  }

  /** mock 登录（携带本地 openid 复用身份）；返回 { accessToken, user } */
  async function mockLogin() {
    const base = apiBase()
    const body = {}
    const savedOpenid = localStorage.getItem(OPENID_KEY)
    if (savedOpenid) body.openid = savedOpenid

    const res = await fetch(`${base}/public/wechat/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || '登录失败，请稍后再试')
    }
    setAuth(data.accessToken, data.user)
    return data
  }

  return { token, user, isLoggedIn, setAuth, clearAuth, mockLogin }
}

/** API 基础路径：开发环境走绝对地址，生产走同源相对路径（与 useApi 一致） */
function apiBase() {
  const isDev =
    typeof window !== 'undefined' &&
    (window.location.port === '5173' || window.location.port === '4173')
  return isDev ? 'http://localhost:3000/api' : '/api'
}
