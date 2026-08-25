import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
export declare class HomePageService {
    private readonly prisma;
    private readonly uploadService;
    constructor(prisma: PrismaService, uploadService: UploadService);
    findOne(): Promise<any>;
    update(dto: UpdateHomePageDto): Promise<any>;
}
