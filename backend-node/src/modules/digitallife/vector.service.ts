import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelConfigService } from './model-config.service';

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
 */
@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    private prisma: PrismaService,
    private modelConfig: ModelConfigService,
  ) {}

  /** 余弦相似度检索 top-K（按 distance 升序 = 相似度降序） */
  async search(queryText: string, topK = 5): Promise<RetrievedChunk[]> {
    const embeddings = await this.modelConfig.getEmbeddings();
    const queryVec = await embeddings.embedQuery(queryText);
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
