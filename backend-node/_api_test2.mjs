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

// 1. 修改当前生效版本：改 tagline + 增加一个项目
const list = await req('/admin/resume', { headers: h })
const active = list.data.find((v) => v.isActive)
const detail = await req(`/admin/resume/${active.id}`, { headers: h })
const content = detail.data.content
content.profile.tagline = '【E2E修改】新的 tagline'
content.projects = content.projects || []
content.projects.push({ title: 'E2E 新项目', year: '2026', desc: '端到端验证新增项目', tags: [{ label: 'E2E', accent: true }] })

const upd = await req(`/admin/resume/${active.id}`, { method: 'PUT', headers: h, body: { content } })
console.log('UPDATE status=%s tagline=%s projects=%s', upd.status, upd.data.content.profile.tagline, upd.data.content.projects.length)

// 2. 前台应读到修改
const pub = await req('/public/resume')
console.log('PUBLIC tagline=%s projects=%s', pub.data.content.profile.tagline, pub.data.content.projects.length)
console.log('MATCH=%s', pub.data.content.profile.tagline === '【E2E修改】新的 tagline')

// 3. 恢复原 tagline（保持数据干净）
content.profile.tagline = detail.data.content.profile.tagline
content.projects.pop()
const restore = await req(`/admin/resume/${active.id}`, { method: 'PUT', headers: h, body: { content } })
console.log('RESTORE status=%s tagline=%s projects=%s', restore.status, restore.data.content.profile.tagline, restore.data.content.projects.length)
