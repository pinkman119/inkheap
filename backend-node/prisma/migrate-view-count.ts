/**
 * 一次性数据迁移：把旧的 viewCount 平移到虚拟阅读量，真实阅读量清零。
 *
 * 背景：旧的 viewCount 在 GET 详情接口里无条件自增，刷新一次就 +1，
 * 是刷出来的脏数据，不能直接当成真实阅读量继续累加。
 *
 * 为什么要单独跑脚本而不是放进启动流程：
 * 部署用 `prisma db push` 建表，它只同步表结构、不做数据迁移；
 * 而「迁移已完成」必须有个持久标记，否则每次重启都会把新积累的真实阅读量
 * 再次清零（新内容的 virtualViewCount 同样是 NULL，无法区分是否已迁移）。
 * 这里用 schema_migrations 表 + 主键冲突来原子地「抢占」执行权，
 * 因此重复执行是安全的，多实例并发也只会有一个实例真正执行。
 *
 * 执行：npm run prisma:migrate-view-count
 */
import { PrismaClient } from '@prisma/client';

const MIGRATION_NAME = 'view_count_backfill_v1';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // 抢占执行权：已执行过则不返回任何行
    const claimed = await prisma.$queryRaw<{ name: string }[]>`
      INSERT INTO schema_migrations (name) VALUES (${MIGRATION_NAME})
      ON CONFLICT (name) DO NOTHING
      RETURNING name
    `;

    if (!claimed.length) {
      console.log('[skip] 阅读量回填迁移已执行过，跳过');
      return;
    }

    const articles = await prisma.$executeRaw`
      UPDATE articles SET virtual_view_count = view_count, view_count = 0 WHERE view_count > 0
    `;
    const blogs = await prisma.$executeRaw`
      UPDATE blogs SET virtual_view_count = view_count, view_count = 0 WHERE view_count > 0
    `;

    console.log(
      `[done] 文章回填 ${articles} 篇 / 小记回填 ${blogs} 篇；真实阅读量已清零，后续按 IP 每天去重统计`,
    );
    console.log('[hint] 虚拟阅读量可在后台文章管理 / 小记管理中随时修改，留空则恢复展示真实值');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[error] 阅读量回填迁移失败：', e);
  process.exit(1);
});
