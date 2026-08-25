import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File): Promise<{
        id: string;
        url: string;
        filename: string;
        size: number;
    }>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
