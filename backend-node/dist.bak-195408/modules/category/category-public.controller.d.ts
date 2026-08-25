import { CategoryService } from './category.service';
export declare class PublicCategoryController {
    private readonly categoryService;
    constructor(categoryService: CategoryService);
    findTree(): Promise<any[]>;
    findAll(): Promise<any>;
}
