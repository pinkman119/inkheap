import { Module } from '@nestjs/common';
import { HomePageService } from './homepage.service';
import { HomePagePublicController, HomePageAdminController } from './homepage.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HomePagePublicController, HomePageAdminController],
  providers: [HomePageService],
  exports: [HomePageService],
})
export class HomePageModule {}
