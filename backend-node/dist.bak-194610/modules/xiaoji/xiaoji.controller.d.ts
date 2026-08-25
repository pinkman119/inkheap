import { XiaojiService } from './xiaoji.service';
export declare class XiaojiController {
    private readonly xiaojiService;
    constructor(xiaojiService: XiaojiService);
    findPublished(tag?: string): Promise<any>;
    getStats(): Promise<{
        total: any;
        albums: any;
        photos: number;
    }>;
    getCategories(): Promise<any[]>;
    findBySlug(slug: string): Promise<any>;
}
