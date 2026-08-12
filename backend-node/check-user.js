const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const users = await p.adminUser.findMany();
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log('  - username:', u.username, '| role:', u.role, '| active:', u.isActive);
    });
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
