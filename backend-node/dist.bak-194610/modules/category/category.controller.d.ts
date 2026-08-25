import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoryController {
    private categoryService;
    constructor(categoryService: CategoryService);
    findAll(): Promise<{
        articleCount: number;
        articleCountWithChildren: number;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }[]>;
    findTree(): Promise<any[]>;
    findOne(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
