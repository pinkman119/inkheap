import { PrismaService } from '../prisma/prisma.service';
export declare class UploadService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    persistWithWrite(file: Express.Multer.File, dateDir: string, storedName: string): Promise<{
        id: string;
        url: string;
        filename: string;
        size: number;
    }>;
    remove(id: string): Promise<void>;
    removeByUrl(url: string): Promise<void>;
    ensureDateDir(dateDir: string): void;
    buildStoredName(originalName: string): string;
    buildDateDir(): string;
}
