import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  // 修改头像时需要清理被替换的旧上传文件，复用 UploadService
  imports: [UploadModule],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService],
})
export class AdminUserModule {}
