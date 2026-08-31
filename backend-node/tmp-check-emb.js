const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rs = await p.dlModel.findMany({
    where: { modelType: 'embedding' },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('=== embedding models ===');
  for (const m of rs) {
    console.log(
      `${m.name} | provider=${m.provider} | modelId=${m.modelId} | enabled=${m.enabled} | hasKey=${m.apiKeyEnc ? 'yes' : 'no'}`,
    );
  }
  const gen = await p.dlModel.findMany({
    where: { modelType: { not: 'embedding' } },
    orderBy: { sortOrder: 'asc' },
  });
  console.log('=== general models ===');
  for (const m of gen) {
    console.log(
      `${m.name} | provider=${m.provider} | modelId=${m.modelId} | enabled=${m.enabled} | hasKey=${m.apiKeyEnc ? 'yes' : 'no'}`,
    );
  }
  // 向量表维度
  const rows = await p.$queryRawUnsafe(
    `SELECT a.atttypmod, format_type(a.atttypid, a.atttypmod) AS t FROM pg_attribute a WHERE a.attrelid = 'dl_vectors'::regclass AND a.attname = 'embedding'`,
  );
  console.log('dl_vectors.embedding type:', JSON.stringify(rows));
  await p.$disconnect();
})();
