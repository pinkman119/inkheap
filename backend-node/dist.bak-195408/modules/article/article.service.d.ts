import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
export declare class ArticleService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: QueryArticleDto): Promise<{
        items: any;
        total: any;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    private collectDescendantKeys;
    findOne(id: string): Promise<any>;
    findOneBySlug(slug: string): Promise<any>;
    create(dto: CreateArticleDto): Promise<any>;
    update(id: string, dto: UpdateArticleDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    findLatestUpdated(query: QueryArticleDto): Promise<{
        items: any;
        total: any;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    private transformArticle;
    private generateSlug;
}
