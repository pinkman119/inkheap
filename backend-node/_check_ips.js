/* 临时脚本：查看 visit_logs 实际数据（用后即删） */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.visitLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { ip: true, region: true, path: true, createdAt: true },
  });
  console.log(JSON.stringify(rows, null, 1));
  console.log('total:', await p.visitLog.count());
})().finally(() => p.$disconnect());
