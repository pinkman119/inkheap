import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaService } from '../prisma/prisma.service';
import { ModelConfigService } from './model-config.service';
import { VectorService } from './vector.service';

export type RefType =
  | 'article'
  | 'blog'
  | 'resume'
  | 'about_profile'
  | 'about_ring'
  | 'about_footprint'
  | 'about_travel'
  | 'about_event';

export const REF_TYPES: RefType[] = [
  'article',
  'blog',
  'resume',
  'about_profile',
  'about_ring',
  'about_footprint',
  'about_travel',
  'about_event',
];

/** 训练状态：0 未训练 / 1 已训练 / 2 已移除训练 */
export type TrainType = 0 | 1 | 2;

/** 各 refType 的中文标签（训练页 tab 与日志用） */
export const REF_TYPE_LABELS: Record<RefType, string> = {
  article: '知识库文章',
  blog: '小记',
  resume: '简历',
  about_profile: '关于我·个人简介',
  about_ring: '关于我·年轮',
  about_footprint: '关于我·足迹',
  about_travel: '关于我·旅行',
  about_event: '关于我·事件',
};

export interface TrainingItem {
  id: string;
  title: string;
  summary: string;
  trainType: number;
  published?: boolean;
  isActive?: boolean;
  updatedAt: Date;
}

/**
 * RAG 训练服务：
 * 源表行 → 文本拼装（含来源标签）→ 切分（800/100）→ embedding-3 嵌入 → dl_vectors 替换写入。
 * 训练/列表不做 published 过滤（草稿同样可训练）；Resume 仅 isActive 版本参与。
 */
@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);
  private readonly splitter: RecursiveCharacterTextSplitter;

  constructor(
    private prisma: PrismaService,
    private modelConfig: ModelConfigService,
    private vectorService: VectorService,
  ) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '。', '；', '，', ' ', ''],
    });
  }

  // ==================== 训练 / 移除 ====================

  /** 训练单条：拼装 → 切分 → 嵌入 → 替换写入 → trainType=1 */
  async trainOne(refType: RefType, refId: string) {
    const row = await this.findRow(refType, refId);
    if (!row) throw new NotFoundException(`${REF_TYPE_LABELS[refType]}记录不存在`);

    // Resume 仅 isActive 版本可训练
    if (refType === 'resume' && !(row as any).isActive) {
      throw new BadRequestException('仅当前生效的简历版本可训练');
    }

    const text = this.buildText(refType, row as any);
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('该条数据内容为空，无法训练');
    }

    const chunks = await this.splitter.splitText(trimmed);
    if (!chunks.length) {
      throw new BadRequestException('切分后无有效文本，无法训练');
    }

    const embeddings = await this.modelConfig.getEmbeddings();
    const vectors = await embeddings.embedDocuments(chunks);

    await this.vectorService.replaceChunks(refType, refId, chunks, vectors);
    await this.updateTrainType(refType, refId, 1);

    return {
      refType,
      refId,
      trainType: 1,
      chunkCount: chunks.length,
    };
  }

  /** 移除训练：删向量 + trainType=2 */
  async removeOne(refType: RefType, refId: string) {
    const row = await this.findRow(refType, refId);
    if (!row) throw new NotFoundException(`${REF_TYPE_LABELS[refType]}记录不存在`);

    await this.vectorService.deleteByRef(refType, refId);
    await this.updateTrainType(refType, refId, 2);
    return { refType, refId, trainType: 2 };
  }

  /**
   * 数据编辑/删除后的失效处理（由内容模块钩子调用）：
   * 若 trainType=1 → 删向量 + 置 0（需重新训练）；其他状态不动。
   */
  async invalidateIfTrained(refType: RefType, refId: string) {
    const row = await this.findRow(refType, refId);
    if (!row) return; // 行已删除（remove 场景由 invalidateByRef 兜底）
    const trainType = (row as any).trainType ?? 0;
    if (trainType !== 1) return;
    await this.vectorService.deleteByRef(refType, refId);
    await this.updateTrainType(refType, refId, 0);
    this.logger.log(`训练失效（数据已编辑）: ${refType}/${refId}`);
  }

  /** 数据行被删除时的兜底清理（无论 trainType 状态，删干净向量） */
  async invalidateByRef(refType: RefType, refId: string) {
    await this.vectorService.deleteByRef(refType, refId);
  }

  // ==================== 列表 ====================

  /** 分页列表：无 published 过滤（草稿也可训练）；Resume 仅 isActive 版本 */
  async list(refType: RefType, query: { page?: number; pageSize?: number; trainType?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.trainType !== undefined && query.trainType !== null) {
      where.trainType = query.trainType;
    }

    const [items, total] = await Promise.all([
      this.findRows(refType, { where, skip, take: pageSize }),
      this.countRows(refType, where),
    ]);

    const list: TrainingItem[] = items.map((row: any) => this.toListItem(refType, row));

    return {
      items: list,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      refType,
      refTypeLabel: REF_TYPE_LABELS[refType],
    };
  }

  // ==================== 文本拼装（design §5 规则） ====================

  buildText(refType: RefType, row: any): string {
    switch (refType) {
      case 'article':
        return `【知识库文章】${row.title}\n${row.summary ?? ''}\n\n${row.content ?? ''}`;
      case 'blog':
        return [
          `【小记】${row.title}`,
          row.summary ?? '',
          row.quote ? `「${row.quote}」` : '',
          [row.location, row.date].filter(Boolean).join(' '),
          '',
          row.content ?? '',
        ]
          .filter((s) => s !== undefined)
          .join('\n');
      case 'resume':
        return this.serializeResume(row);
      case 'about_profile':
        return [
          '【关于我·个人简介】',
          row.lede ?? '',
          row.evaluationQuote ? `「${row.evaluationQuote}」—— ${row.evaluationBy ?? ''}` : '',
        ].join('\n');
      case 'about_ring':
        return `【关于我·年轮】${row.year} ${row.title}：${row.desc}`;
      case 'about_footprint':
        return `【关于我·足迹】${row.province}·${row.place}（${row.time}，${row.location}，海拔${row.elevation}）：${row.note}`;
      case 'about_travel':
        return `【关于我·旅行】${row.place}（${row.meta}）：${row.note}`;
      case 'about_event': {
        const d = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date ?? '');
        return `【关于我·事件】${d} ${row.title}：${row.desc}`;
      }
      default:
        return '';
    }
  }

  /** Resume content JSON → 「区块：值」逐行序列化 */
  private serializeResume(row: any): string {
    const lines: string[] = ['【简历】'];
    let content: any = {};
    try {
      content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content || {};
    } catch {
      content = {};
    }
    const walk = (obj: any, prefix: string) => {
      if (obj === null || obj === undefined) return;
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => walk(item, `${prefix}[${i + 1}]`));
        return;
      }
      if (typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          walk(v, prefix ? `${prefix}·${k}` : k);
        }
        return;
      }
      const text = String(obj).replace(/<[^>]+>/g, '').trim();
      if (text) lines.push(`${prefix}：${text}`);
    };
    walk(content, '');
    if (row.name) lines.unshift(`【简历】版本「${row.name}」`);
    return lines.join('\n');
  }

  // ==================== Prisma 通用访问 ====================

  private delegate(refType: RefType): any {
    const map: Record<RefType, string> = {
      article: 'article',
      blog: 'blog',
      resume: 'resume',
      about_profile: 'aboutProfile',
      about_ring: 'aboutRing',
      about_footprint: 'aboutFootprint',
      about_travel: 'aboutTravel',
      about_event: 'aboutEvent',
    };
    return (this.prisma as any)[map[refType]];
  }

  private findRow(refType: RefType, refId: string) {
    return this.delegate(refType).findUnique({ where: { id: refId } });
  }

  private findRows(refType: RefType, args: { where: any; skip: number; take: number }) {
    const delegate = this.delegate(refType);
    const orderBy: any =
      refType === 'resume'
        ? [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        : refType === 'about_event'
          ? [{ sortOrder: 'asc' }, { updatedAt: 'desc' }]
          : [{ updatedAt: 'desc' }];
    const where = { ...args.where };
    if (refType === 'resume') where.isActive = true; // 仅 isActive 版本参与
    return delegate.findMany({
      where,
      skip: args.skip,
      take: args.take,
      orderBy,
    });
  }

  private countRows(refType: RefType, where: any) {
    const w = { ...where };
    if (refType === 'resume') w.isActive = true;
    return this.delegate(refType).count({ where: w });
  }

  private updateTrainType(refType: RefType, refId: string, trainType: number) {
    return this.delegate(refType).update({
      where: { id: refId },
      data: { trainType },
    });
  }

  private toListItem(refType: RefType, row: any): TrainingItem {
    const base = {
      id: row.id,
      trainType: row.trainType ?? 0,
      updatedAt: row.updatedAt,
    } as Omit<TrainingItem, 'title' | 'summary'>;
    switch (refType) {
      case 'article':
        return { ...base, title: row.title, summary: row.summary ?? '', published: row.published };
      case 'blog':
        return { ...base, title: row.title, summary: row.summary ?? row.quote ?? '', published: row.published };
      case 'resume':
        return { ...base, title: `简历版本「${row.name}」`, summary: '当前生效版本', isActive: row.isActive };
      case 'about_profile':
        return { ...base, title: '个人简介', summary: (row.lede ?? '').slice(0, 80) };
      case 'about_ring':
        return { ...base, title: `${row.year} · ${row.title}`, summary: (row.desc ?? '').slice(0, 80) };
      case 'about_footprint':
        return { ...base, title: `${row.place}`, summary: `${row.province} · ${row.time}`, };
      case 'about_travel':
        return { ...base, title: row.place, summary: (row.meta ?? '').slice(0, 80) };
      case 'about_event': {
        const d = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date ?? '');
        return { ...base, title: `${d} · ${row.title}`, summary: (row.desc ?? '').slice(0, 80) };
      }
      default:
        return { ...base, title: row.id, summary: '' };
    }
  }
}
