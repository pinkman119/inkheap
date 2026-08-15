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

const login = await req('/admin/auth/login', {
  method: 'POST',
  body: { username: 'admin', password: 'admin123' },
})
const h = { Authorization: `Bearer ${login.data.accessToken}` }
if (!login.data.accessToken) {
  console.log('LOGIN FAILED', login)
  process.exit(1)
}

const content = {
  profile: { avatarText: '测', name: 'TestV2', handle: 't', tagline: 't', heroInfo: 'x' },
  info: [],
  education: { school: '', period: '', major: '' },
  certificates: [],
  about: { leads: [], callout: '' },
  techCategories: [],
  projects: [],
  experiences: [],
}

const created = await req('/admin/resume', { method: 'POST', headers: h, body: { name: 'V2', content } })
console.log('CREATE id=%s active=%s', created.data.id, created.data.isActive)

const act = await req(`/admin/resume/${created.data.id}/activate`, { method: 'PUT', headers: h })
console.log('ACTIVATE active=%s', act.data.isActive)

const pub = await req('/public/resume')
console.log('PUBLIC name=%s', pub.data.content?.profile?.name)

const list = await req('/admin/resume', { headers: h })
const v1 = list.data.find((v) => v.id !== created.data.id)
const act2 = await req(`/admin/resume/${v1.id}/activate`, { method: 'PUT', headers: h })
console.log('REVERT active=%s', act2.data.isActive)

const pub2 = await req('/public/resume')
console.log('PUBLIC2 name=%s', pub2.data.content?.profile?.name)

const del = await req(`/admin/resume/${created.data.id}`, { method: 'DELETE', headers: h })
console.log('DELETE success=%s', del.data.success)

const delActive = await req(`/admin/resume/${v1.id}`, { method: 'DELETE', headers: h })
console.log('DELETE_ACTIVE status=%s msg=%s', delActive.status, delActive.data.message || delActive.data.error)

const unauth = await req('/admin/resume')
console.log('UNAUTH status=%s', unauth.status)
