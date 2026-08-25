import { XiaojiService } from './xiaoji.service';
import { CreateXiaojiDto } from './dto/create-xiaoji.dto';
import { UpdateXiaojiDto } from './dto/update-xiaoji.dto';
import { QueryXiaojiDto } from './dto/query-xiaoji.dto';
export declare class AdminXiaojiController {
    private readonly xiaojiService;
    constructor(xiaojiService: XiaojiService);
    findAll(query: QueryXiaojiDto): Promise<{
        list: any;
        total: any;
        page: number;
        pageSize: number;
    }>;
    findOne(id: string): Promise<any>;
    create(dto: CreateXiaojiDto): Promise<any>;
    update(id: string, dto: UpdateXiaojiDto): Promise<any>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
