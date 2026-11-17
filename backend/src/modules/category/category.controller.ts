import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { RecentCategoryService } from './recent-category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private categoryService: CategoryService,
    private recentCategoryService: RecentCategoryService,
  ) {}

  // 最近使用的分类（需声明在 @Get(':id') 之前，避免 "recent" 被动态路由当作 id 匹配）
  @Get('recent')
  findRecent() {
    return this.recentCategoryService.list();
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('tree')
  findTree() {
    return this.categoryService.findTree();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
