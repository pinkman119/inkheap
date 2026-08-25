import { CategoryService } from './category.service';
export declare class PublicCategoryController {
    private readonly categoryService;
    constructor(categoryService: CategoryService);
    findTree(): Promise<any[]>;
    findAll(): Promise<{
        articleCount: number;
        articleCountWithChildren: number;
        name: string;
        id: string;
        key: string;
        createdAt: Date;
        updatedAt: Date;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }[]>;
}
