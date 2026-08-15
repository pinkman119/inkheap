import { Module } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { ResumePublicController, ResumeAdminController } from './resume.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResumePublicController, ResumeAdminController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
