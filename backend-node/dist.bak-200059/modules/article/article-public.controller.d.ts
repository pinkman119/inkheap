import { ArticleService } from './article.service';
import { QueryArticleDto } from './dto/query-article.dto';
export declare class PublicArticleController {
    private readonly articleService;
    constructor(articleService: ArticleService);
    list(query: QueryArticleDto): Promise<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    detailBySlug(slug: string): Promise<any>;
    feed(query: QueryArticleDto): Promise<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
}
