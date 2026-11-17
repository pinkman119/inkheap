import { Module } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { ResumePublicController, ResumeAdminController } from './resume.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DigitalLifeModule } from '../digitallife/digital-life.module';

@Module({
  imports: [PrismaModule, DigitalLifeModule],
  controllers: [ResumePublicController, ResumeAdminController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
