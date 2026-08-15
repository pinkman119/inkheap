const BASE = 'http://localhost:3000/api'

async function req(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

const login = await req('/admin/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } })
const h = { Authorization: `Bearer ${login.data.accessToken}` }

const list = await req('/admin/resume', { headers: h })
const active = list.data.find((v) => v.isActive)
const detail = await req(`/admin/resume/${active.id}`, { headers: h })
const content = detail.data.content
content.profile.tagline = '专注 AI Agent 开发、后端工程与全栈架构，相信好的工程源于深入理解底层原理与持续实践。'
const upd = await req(`/admin/resume/${active.id}`, { method: 'PUT', headers: h, body: { content } })
console.log('RESTORE status=%s tagline=%s', upd.status, upd.data.content.profile.tagline)
const pub = await req('/public/resume')
console.log('PUBLIC tagline=%s', pub.data.content.profile.tagline)
console.log('OK=%s', pub.data.content.profile.tagline === '专注 AI Agent 开发、后端工程与全栈架构，相信好的工程源于深入理解底层原理与持续实践。')
