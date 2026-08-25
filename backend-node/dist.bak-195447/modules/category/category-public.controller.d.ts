import { CategoryService } from './category.service';
export declare class PublicCategoryController {
    private readonly categoryService;
    constructor(categoryService: CategoryService);
    findTree(): Promise<any[]>;
    findAll(): Promise<{
        articleCount: number;
        articleCountWithChildren: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }[]>;
}
