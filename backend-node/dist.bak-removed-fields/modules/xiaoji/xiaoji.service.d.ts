import { PrismaService } from '../prisma/prisma.service';
import { CreateXiaojiDto } from './dto/create-xiaoji.dto';
import { UpdateXiaojiDto } from './dto/update-xiaoji.dto';
import { QueryXiaojiDto } from './dto/query-xiaoji.dto';
export declare class XiaojiService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findPublished(tag?: string): Promise<any[]>;
    findBySlug(slug: string): Promise<any>;
    getStats(): Promise<{
        total: number;
        albums: number;
        photos: number;
    }>;
    getCategories(): Promise<{
        key: string;
        name: string;
        count: number;
    }[]>;
    findAll(query: QueryXiaojiDto): Promise<{
        list: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateXiaojiDto): Promise<any>;
    update(id: string, dto: UpdateXiaojiDto): Promise<any>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    private saveTags;
    private buildUniqueSlug;
    private serialize;
    private toCard;
}
