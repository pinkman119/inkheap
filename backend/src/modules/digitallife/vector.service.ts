import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelConfigService } from './model-config.service';
import { describeEmbeddingError } from './embedding-error.util';

export interface RetrievedChunk {
  content: string;
  refType: string;
  refId: string;
  chunkIndex: number;
  distance: number;
}

/**
 * pgvector 向量存储服务：dl_vectors 表由 prisma/pgvector-init.ts 原生 SQL 管理
 * （Prisma 不支持 vector 列），本服务通过 $executeRaw / $queryRaw 操作。
 * 启动时幂等自检建表（onModuleInit），避免本地开发未跑 pgvector-init 时训练 500。
 */
@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    private prisma: PrismaService,
    private modelConfig: ModelConfigService,
  ) {}

  /** 启动时幂等创建 vector 扩展 / dl_vectors 表 / HNSW 索引（与 pgvector-init.ts 一致） */
  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
      await this.prisma.$executeRawUnsafe(`
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
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS dl_vectors_embedding_idx
        ON dl_vectors USING hnsw (embedding vector_cosine_ops)
      `);
      this.logger.log('pgvector dl_vectors 表就绪');
    } catch (e: any) {
      // 权限不足或已有环境异常时不阻断启动（entrypoint 的 pgvector-init 可能已建表）
      this.logger.warn(`dl_vectors 自检建表跳过: ${e?.message ?? e}`);
    }
  }

  /** 余弦相似度检索 top-K（按 distance 升序 = 相似度降序） */
  async search(queryText: string, topK = 5): Promise<RetrievedChunk[]> {
    const embeddings = await this.modelConfig.getEmbeddings();
    let queryVec: number[];
    try {
      queryVec = await embeddings.embedQuery(queryText);
    } catch (e: any) {
      // 检索失败不阻断聊天：降级为无 RAG 上下文继续对话
      this.logger.warn(`检索 embedding 失败，降级无上下文: ${describeEmbeddingError(e)}`);
      return [];
    }
    const vecStr = this.toVectorLiteral(queryVec);

    const rows = await this.prisma.$queryRaw<RetrievedChunk[]>`
      SELECT content, ref_type AS "refType", ref_id AS "refId",
             chunk_index AS "chunkIndex",
             (embedding <=> ${vecStr}::vector) AS distance
      FROM dl_vectors
      ORDER BY embedding <=> ${vecStr}::vector
      LIMIT ${topK}
    `;
    return rows.map((r) => ({ ...r, distance: Number(r.distance) }));
  }

  /** 替换写入：事务内先删旧向量再插入新 chunks（幂等） */
  async replaceChunks(refType: string, refId: string, chunks: string[], vectors: number[][]) {
    if (chunks.length !== vectors.length) {
      throw new Error('chunks 与 vectors 数量不一致');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM dl_vectors WHERE ref_type = ${refType} AND ref_id = ${refId}`;
      for (let i = 0; i < chunks.length; i++) {
        const vecStr = this.toVectorLiteral(vectors[i]);
        await tx.$executeRaw`
          INSERT INTO dl_vectors (ref_type, ref_id, chunk_index, content, embedding)
          VALUES (${refType}, ${refId}, ${i}, ${chunks[i]}, ${vecStr}::vector)
        `;
      }
    });
    this.logger.log(`向量替换完成: ${refType}/${refId}，共 ${chunks.length} 个 chunk`);
  }

  /** 删除指定源数据的全部向量 */
  async deleteByRef(refType: string, refId: string) {
    await this.prisma
      .$executeRaw`DELETE FROM dl_vectors WHERE ref_type = ${refType} AND ref_id = ${refId}`;
  }

  /** 统计某源数据的向量数（训练校验用） */
  async countByRef(refType: string, refId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM dl_vectors WHERE ref_type = ${refType} AND ref_id = ${refId}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /** number[] → pgvector 字面量 '[1,2,3]' */
  private toVectorLiteral(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }
}
