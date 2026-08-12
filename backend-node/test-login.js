const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: '/api' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const r = await post('/admin/auth/login', { username: 'admin', password: 'admin123' });
  console.log('STATUS:', r.status);
  console.log('BODY:', JSON.stringify(r.body, null, 2));
}

main().catch(e => console.log('ERR:', e.message));
