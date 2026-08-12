const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

async function main() {
  try {
    const u = await p.adminUser.findUnique({ where: { username: 'admin' } });
    if (!u) { console.log('No user found'); return; }
    console.log('username:', u.username);
    console.log('passwordHash:', u.passwordHash || u.password);
    console.log('hashField:', u.passwordHash ? 'passwordHash' : 'password');
    const hash = u.passwordHash || u.password;
    const ok = await bcrypt.compare('admin123', hash);
    console.log('bcrypt.compare(admin123):', ok);
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
