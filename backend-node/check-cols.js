const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const tables = await p.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map(t => t.name));

    for (const t of tables) {
      const cols = await p.$queryRawUnsafe(`PRAGMA table_info(${t.name})`);
      console.log(`\n${t.name} columns:`, cols.map(c => `${c.name}:${c.type}`).join(', '));
    }
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
