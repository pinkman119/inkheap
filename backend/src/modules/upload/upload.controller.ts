import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService } from './upload.service';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('admin/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_SIZE },
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('仅支持图片文件（png/jpeg/gif/webp）'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未接收到文件');
    }

    const dateDir = this.uploadService.buildDateDir();
    const storedName = this.uploadService.buildStoredName(file.originalname);
    this.uploadService.ensureDateDir(dateDir);

    // 实际落盘交由 diskStorage 完成，这里直接基于拦截器已写入的文件进行登记。
    // 由于拦截器使用内存存储（无 destination），改为手动写入磁盘。
    const result = await this.uploadService.persistWithWrite(file, dateDir, storedName);
    return result;
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.uploadService.remove(id);
    return { success: true };
  }
}
