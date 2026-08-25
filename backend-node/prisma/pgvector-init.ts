/**
 * pgvector 初始化脚本：幂等创建 vector 扩展与数字生命向量表 dl_vectors。
 *
 * 背景：项目使用 `prisma db push`（无 migrations 目录），且 Prisma 不支持
 * `vector` 列类型，因此 dl_vectors 表由本脚本以原生 SQL 管理。
 *
 * 由 entrypoint.sh 在 `prisma db push` 之后、seed 之前执行；可重复执行（全部 IF NOT EXISTS）。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 启用 pgvector 扩展（镜像需为 pgvector/pgvector:pg16）
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

  // 2. 数字生命向量表（ref_type + ref_id 定位源数据行，chunk 区分切片）
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS dl_vectors (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ref_type    TEXT NOT NULL,
      ref_id      TEXT NOT NULL,
      chunk_index INT  NOT NULL,
      content     TEXT NOT NULL,
      embedding   VECTOR(1024) NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (ref_type, ref_id, chunk_index)
    )
  `);

  // 3. HNSW 余弦相似度索引（检索使用 ORDER BY embedding <=> $1）
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS dl_vectors_embedding_idx
    ON dl_vectors USING hnsw (embedding vector_cosine_ops)
  `);

  console.log('[pgvector-init] extension & dl_vectors table ready');
}

main()
  .catch((e) => {
    console.error('[pgvector-init] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
