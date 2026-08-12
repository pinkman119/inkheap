import { Controller, Get } from '@nestjs/common';
import { CategoryService } from './category.service';

// 公开接口（前台知识库页使用，无需 admin 鉴权）
@Controller('categories')
export class PublicCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('tree')
  findTree() {
    return this.categoryService.findTree();
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }
}
