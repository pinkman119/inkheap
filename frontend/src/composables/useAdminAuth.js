import { ref } from 'vue'

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

const token = ref(localStorage.getItem(TOKEN_KEY) || '')
const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null'))

export function useAdminAuth() {
  const isLoggedIn = () => !!token.value

  function setAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isLoggedIn, setAuth, clearAuth }
}
