import { XiaojiService } from './xiaoji.service';
export declare class XiaojiController {
    private readonly xiaojiService;
    constructor(xiaojiService: XiaojiService);
    findPublished(tag?: string): Promise<any[]>;
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
    findBySlug(slug: string): Promise<any>;
}
