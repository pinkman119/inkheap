import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { RecentCategoryService } from './recent-category.service';
import { PublicCategoryController } from './category-public.controller';

@Module({
  controllers: [CategoryController, PublicCategoryController],
  providers: [CategoryService, RecentCategoryService],
  exports: [CategoryService, RecentCategoryService],
})
export class CategoryModule {}
