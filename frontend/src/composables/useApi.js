import { useAdminAuth } from './useAdminAuth'

// API 基础路径：
// - 生产构建后由 Nginx 反代 /api → 后端，使用相对路径即可，无跨域问题。
// - 开发环境前端跑在 Vite(5173)，后端在 3000，需用绝对地址 + Vite proxy。
// 通过判断当前 origin 是否为 dev 端口来切换。
const isDev =
  typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.port === '4173')

const BASE = isDev ? 'http://localhost:3000/api' : '/api'

// 静态资源（如 /files/...）的基础地址：
// - 开发环境：取 API 地址的 origin（http://localhost:3000）补全为绝对地址
// - 生产环境：同源相对路径，直接返回空串（让浏览器按当前 origin 解析）
const ASSET_BASE = isDev ? BASE.replace(/\/api\/?$/, '') : ''

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
