const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.$queryRawUnsafe(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'about_footprints' AND column_name = 'elevation'
  `);
  console.log('elevation column:', JSON.stringify(rows));
  await p.$disconnect();
})().catch((e) => { console.error('DIAG_ERR', e.message); process.exit(1); });
