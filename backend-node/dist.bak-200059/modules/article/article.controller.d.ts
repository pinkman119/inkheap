import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
export declare class ArticleController {
    private articleService;
    constructor(articleService: ArticleService);
    findAll(query: QueryArticleDto): Promise<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateArticleDto): Promise<any>;
    update(id: string, dto: UpdateArticleDto): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
