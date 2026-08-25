const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

(async () => {
  // 用 encodeURIComponent 构造百分号编码
  const slug = '雨崩神瀑下的七天2';
  const enc = encodeURIComponent(slug);
  console.log('original:', slug);
  console.log('encoded :', enc);

  // 1) 浏览器同款：encodeURIComponent 后的百分号路径
  console.log('\n[A] percent-encoded path');
  console.log(await get('/api/xiaoji/slug/' + enc));

  // 2) 原始中文路径（http 模块会原样发送 UTF-8 字节）
  console.log('\n[B] raw utf8 path');
  console.log(await get('/api/xiaoji/slug/' + slug));
})();
