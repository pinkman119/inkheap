import { useAdminAuth } from './useAdminAuth'

const BASE = 'http://localhost:3000/api'

// 静态资源（如 /files/...）的基础地址：取 API 地址的 origin
// 开发环境前端跑在 Vite(5173)，资源在后端(3000)，需补全为绝对地址才能加载
const ASSET_BASE = BASE.replace(/\/api\/?$/, '')

async function request(path, options = {}) {
  const { token } = useAdminAuth()
  const headers = { ...options.headers }

  // 仅对非 FormData 的请求默认使用 JSON；FormData 让浏览器自动设置 multipart boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

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
    // 文件上传：以 multipart/form-data 发送 FormData，浏览器自动设置 Content-Type
    upload: (path, formData) =>
      request(path, { method: 'POST', body: formData }),
    // 把后端返回的相对资源路径（如 /files/...）补全为可访问的绝对 URL
    assetUrl: (path) => {
      if (!path) return path
      if (/^https?:\/\//.test(path)) return path
      return `${ASSET_BASE}${path.startsWith('/') ? '' : '/'}${path}`
    },
  }
}
