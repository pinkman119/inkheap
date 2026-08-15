import http from 'http'
const url = 'https://cdn.nlark.com/yuque/0/2023/webp/23025892/1694003703734-08fb72b2-371c-4099-87f2-9d379f4618b2.webp'
function test(referer) {
  return new Promise((res) => {
    const u = new URL(url)
    const headers = { 'User-Agent': 'Mozilla/5.0' }
    if (referer) headers['Referer'] = referer
    const r = http.request({ host: u.host, path: u.pathname + u.search, method: 'HEAD', headers }, (resp) => {
      res(resp.statusCode)
      resp.destroy()
    })
    r.on('error', e => res('ERR ' + e.message))
    r.setTimeout(8000, () => { r.destroy(); res('TIMEOUT') })
    r.end()
  })
}
console.log('NO referer:', await test(null))
console.log('yuque referer:', await test('https://www.yuque.com/'))
