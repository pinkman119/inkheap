import { useAdminAuth } from './useAdminAuth'

const BASE = 'http://localhost:3000/api'

async function request(path, options = {}) {
  const { token } = useAdminAuth()
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  if (token.value) {
    headers['Authorization'] = `Bearer ${token.value}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    window.location.hash = '#/admin/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed')
  }

  return data
}

export function useApi() {
  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  }
}
