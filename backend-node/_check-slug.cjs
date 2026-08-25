const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.blog.findMany({ select: { id: true, slug: true, title: true, published: true } });
  for (const x of r) {
    console.log(JSON.stringify({ id: x.id, slug: x.slug, title: x.title, p: x.published, codes: [...x.slug].map(c => c.charCodeAt(0)) }));
  }
  // 尝试用 findFirst 模拟接口查询
  const testSlug = '雨崩神瀑下的七天2';
  const found = await p.blog.findFirst({ where: { slug: testSlug, published: true } });
  console.log('FIND_BY_RAW_SLUG:', found ? found.title : 'NOT FOUND');
  await p.$disconnect();
})();
