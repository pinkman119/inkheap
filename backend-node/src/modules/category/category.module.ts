import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { PublicCategoryController } from './category-public.controller';

@Module({
  controllers: [CategoryController, PublicCategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
