export declare class CreateArticleDto {
    title: string;
    slug?: string;
    summary?: string;
    content: string;
    coverImage?: string;
    categoryKey: string;
    tags?: string[];
    author: string;
    published?: boolean;
    featured?: boolean;
}
