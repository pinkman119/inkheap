/**
 * Mock 数据脚本 —— 用于前台知识库页冒烟测试（列表筛选 + 动态列表两页预加载/触底翻页）。
 *
 * 目标：灌入足够多的已发布文章（默认 60 篇，>40 以验证动态栏分页），
 * 并补齐与前端 data/articles.js 的 categoryTree 对齐的分类树（含三层 parentKey），
 * 以便验证「选中父分类含子孙」的多值 categoryKey 筛选。
 *
 * 运行：npx ts-node prisma/mock-data.ts
 * 幂等：全部用 slug 做 upsert，重复运行可安全刷新。
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// 与前端 data/articles.js categoryTree 对齐的分类树（key / name / parentKey / sortOrder）
// 仅取用于挂载文章的祖先+子孙链路，也包含若干 leaf key 用于直接挂载文章。
const CATEGORIES: { key: string; name: string; parentKey?: string; sortOrder: number }[] = [
  { key: 'nodejs', name: 'NodeJS', sortOrder: 1 },
  { key: 'nodejs-db', name: '数据库', parentKey: 'nodejs', sortOrder: 1 },
  { key: 'nodejs-db-mysql', name: 'Mysql数据库', parentKey: 'nodejs-db', sortOrder: 1 },
  { key: 'nodejs-db-mongodb', name: 'MongoDB', parentKey: 'nodejs-db', sortOrder: 2 },
  { key: 'nodejs-framework', name: '框架', parentKey: 'nodejs', sortOrder: 2 },
  { key: 'nodejs-framework-express', name: 'Express', parentKey: 'nodejs-framework', sortOrder: 1 },
  { key: 'nodejs-framework-koa', name: 'Koa', parentKey: 'nodejs-framework', sortOrder: 2 },

  { key: 'ai', name: 'AI 工程化', sortOrder: 4 },
  { key: 'ai-spec', name: '规格化开发', parentKey: 'ai', sortOrder: 1 },
  { key: 'ai-spec-openspec', name: 'openSpec', parentKey: 'ai-spec', sortOrder: 1 },
  { key: 'ai-spec-doc', name: '规范文档', parentKey: 'ai-spec', sortOrder: 2 },
  { key: 'ai-deploy', name: '模型部署', parentKey: 'ai', sortOrder: 2 },
  { key: 'ai-deploy-infer', name: '推理优化', parentKey: 'ai-deploy', sortOrder: 1 },

  { key: 'frontend', name: '前端开发', sortOrder: 1 },
  { key: 'frontend-framework', name: '框架', parentKey: 'frontend', sortOrder: 1 },
  { key: 'frontend-framework-react', name: 'React', parentKey: 'frontend-framework', sortOrder: 1 },
  { key: 'frontend-framework-vue', name: 'Vue', parentKey: 'frontend-framework', sortOrder: 2 },

  { key: 'database', name: '数据库', sortOrder: 6 },
  { key: 'database-relational', name: '关系型', parentKey: 'database', sortOrder: 1 },
  { key: 'database-relational-postgres', name: 'PostgreSQL', parentKey: 'database-relational', sortOrder: 1 },
  { key: 'database-cache', name: '缓存', parentKey: 'database', sortOrder: 2 },
  { key: 'database-cache-redis', name: 'Redis', parentKey: 'database-cache', sortOrder: 1 },
];

// 文章实际挂载的 leaf 分类 key（与上面 CATEGORIES 的叶子对齐）
const LEAF_KEYS = [
  'nodejs-db-mysql',
  'nodejs-db-mongodb',
  'nodejs-framework-express',
  'nodejs-framework-koa',
  'ai-spec-openspec',
  'ai-spec-doc',
  'ai-deploy-infer',
  'frontend-framework-react',
  'frontend-framework-vue',
  'database-relational-postgres',
  'database-cache-redis',
];

const TAG_POOL = [
  ['Node.js', '后端', '数据库'],
  ['MySQL', '性能', '后端'],
  ['MongoDB', 'NoSQL'],
  ['Express', '框架', '前端'],
  ['Koa', '框架'],
  ['openSpec', 'AI', '规格化'],
  ['文档', '规范', 'AI'],
  ['推理', 'LLM', '优化'],
  ['React', '前端', 'Hooks'],
  ['Vue', '前端', '组件'],
  ['PostgreSQL', '数据库', '分区'],
  ['Redis', '缓存', '后端'],
];

const TITLE_PREFIX = [
  '深入解析',
  '实战复盘',
  '从零搭建',
  '性能优化',
  '原理剖析',
  '最佳实践',
  '踩坑记录',
  '架构演进',
];

const TITLE_SUFFIX = [
  '的核心机制',
  '在真实业务中的落地',
  '的那些坑与解法',
  '的吞吐优化之路',
  '的设计权衡',
  '快速上手指南',
  '线上问题排查',
  '与竞品对比',
];

const AUTHOR_POOL = ['墨堆', '张三', '李四', '王五', '赵六', '陈晨'];

const TOTAL = Number(process.env.MOCK_COUNT || 60);

function slugify(title: string): string {
  return (
    'mock-' +
    title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.floor(Math.random() * 1e6).toString(36)
  );
}

async function main() {
  // 1) 补齐分类树（upsert，不破坏已有数据）
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { key: c.key },
      update: {},
      create: { key: c.key, name: c.name, parentKey: c.parentKey, sortOrder: c.sortOrder },
    });
  }
  console.log(`[mock] categories upserted: ${CATEGORIES.length}`);

  // 2) 生成已发布文章（createdAt 由近及远递减，分布到 leaf 分类）
  let created = 0;
  let updated = 0;
  const now = Date.now();
  for (let i = 0; i < TOTAL; i++) {
    const leaf = LEAF_KEYS[i % LEAF_KEYS.length];
    const tagIdx = LEAF_KEYS.indexOf(leaf);
    const tags = TAG_POOL[tagIdx % TAG_POOL.length];
    const title = `${TITLE_PREFIX[i % TITLE_PREFIX.length]}${leaf}${TITLE_SUFFIX[(i >> 1) % TITLE_SUFFIX.length]}`;
    const slug = `mock-${i}-${leaf}`;
    // 每篇间隔约 6 小时，保证 createdAt 由近及远、彼此不同
    const createdAt = new Date(now - i * 6 * 60 * 60 * 1000);

    const res = await prisma.article.upsert({
      where: { slug },
      update: {
        published: true,
        categoryKey: leaf,
        createdAt,
        tags: JSON.stringify(tags),
      },
      create: {
        slug,
        title,
        summary: `${title} —— 这是一篇用于冒烟测试的 mock 文章，覆盖筛选与分页场景。`,
        content: `## ${title}\n\n这是 mock 文章内容占位。`,
        coverImage: `https://picsum.photos/seed/mock${i}/600/400`,
        categoryKey: leaf,
        tags: JSON.stringify(tags),
        author: AUTHOR_POOL[i % AUTHOR_POOL.length],
        published: true,
        featured: i % 7 === 0,
        viewCount: 200 + ((i * 137) % 1800),
        createdAt,
      },
    });
    if ((res as any)._count === undefined) {
      // upsert 不返回 _count，用 slug 稳定性视为成功
    }
    created++;
  }

  // 额外生成少量草稿，用于验证公开接口「忽略 draft、不越权读取草稿」
  for (let i = 0; i < 5; i++) {
    const leaf = LEAF_KEYS[i % LEAF_KEYS.length];
    const slug = `mock-draft-${i}`;
    await prisma.article.upsert({
      where: { slug },
      update: { published: false },
      create: {
        slug,
        title: `草稿文章-${i}（不应出现在公开列表）`,
        summary: '这是一篇草稿，用于验证公开接口越权防护。',
        content: 'draft',
        categoryKey: leaf,
        tags: JSON.stringify(['草稿']),
        author: '墨堆',
        published: false,
        viewCount: 0,
        createdAt: new Date(now - (1000 + i) * 6 * 60 * 60 * 1000),
      },
    });
  }

  const total = await prisma.article.count({ where: { published: true } });
  console.log(`[mock] articles processed: ${created} (target ${TOTAL}), published total now: ${total}`);
  if (total < 40) {
    console.warn('[mock] WARNING: published total < 40, 动态栏分页场景可能覆盖不足');
  }
}

main()
  .then(() => console.log('[mock] done.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
