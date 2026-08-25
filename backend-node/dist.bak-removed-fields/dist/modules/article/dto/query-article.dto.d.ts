export declare class QueryArticleDto {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryKey?: string;
    status?: 'published' | 'draft' | 'all';
}
