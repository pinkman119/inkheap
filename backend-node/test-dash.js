const http = require('http');

function req(path, method = 'GET', token = null, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request({
      host: 'localhost', port: 3000, path: '/api' + path, method, headers,
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  // 1. login
  const login = await req('/admin/auth/login', 'POST', null, { username: 'admin', password: 'admin123' });
  console.log('LOGIN status:', login.status);
  const token = login.body.accessToken;

  // 2. me
  const me = await req('/admin/auth/me', 'GET', token);
  console.log('ME status:', me.status, JSON.stringify(me.body));

  // 3. articles
  const arts = await req('/admin/articles', 'GET', token);
  console.log('ARTICLES status:', arts.status);

  // 4. categories
  const cats = await req('/admin/categories', 'GET', token);
  console.log('CATEGORIES status:', cats.status);

  // 5. categories tree
  const tree = await req('/admin/categories/tree', 'GET', token);
  console.log('TREE status:', tree.status, JSON.stringify(tree.body).substring(0, 200));
}

main().catch(e => console.log('ERR:', e.message));
