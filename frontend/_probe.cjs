const http = require('http')
const u = 'https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp'
const enc = encodeURIComponent(u)
const req = http.request({ host: 'localhost', port: 3000, path: '/api/proxy/image?url=' + enc, method: 'GET' }, (r) => {
  console.log('STATUS', r.statusCode)
  console.log('CONTENT-TYPE', r.headers['content-type'])
  console.log('ACCESS-CONTROL-ALLOW-ORIGIN', r.headers['access-control-allow-origin'])
  let len = 0
  r.on('data', c => len += c.length)
  r.on('end', () => { console.log('BYTES', len); process.exit(0) })
})
req.on('error', e => { console.log('ERR', e.message); process.exit(1) })
req.end()
