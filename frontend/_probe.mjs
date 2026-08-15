import http from 'http'
const url = 'https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp'
const u = new URL(url)
const r = http.request({ host: u.host, path: u.pathname + u.search, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/webp,image/*,*/*' } }, (resp) => {
  console.log('STATUS', resp.statusCode)
  console.log('CONTENT-TYPE', resp.headers['content-type'])
  console.log('X-CONTENT-TYPE-OPTIONS', resp.headers['x-content-type-options'])
  console.log('CACHE-CONTROL', resp.headers['cache-control'])
  console.log('ACCESS-CONTROL-ALLOW-ORIGIN', resp.headers['access-control-allow-origin'])
  resp.destroy()
})
r.on('error', e => console.log('ERR', e.message))
r.end()
