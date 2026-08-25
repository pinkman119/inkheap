import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoryService {
    private prisma;
    constructor(prisma: PrismaService);
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
    findTree(): Promise<any[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        key: string;
        parentKey: string | null;
        sortOrder: number;
        icon: string | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    private buildTree;
}
