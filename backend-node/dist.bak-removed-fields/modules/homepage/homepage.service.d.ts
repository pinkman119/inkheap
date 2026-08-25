import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
export declare class HomePageService {
    private readonly prisma;
    private readonly uploadService;
    constructor(prisma: PrismaService, uploadService: UploadService);
    findOne(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        siteName: string;
        personTitle: string;
        codeContent: string;
        avatar: string | null;
    } | {
        id: string;
        siteName: string;
        personTitle: string;
        codeContent: string;
        createdAt: null;
        updatedAt: null;
    }>;
    update(dto: UpdateHomePageDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        siteName: string;
        personTitle: string;
        codeContent: string;
        avatar: string | null;
    }>;
}
