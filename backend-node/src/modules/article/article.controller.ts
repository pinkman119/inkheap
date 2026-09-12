import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { ReorderArticleDto } from './dto/reorder-article.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/articles')
@UseGuards(JwtAuthGuard)
export class ArticleController {
  constructor(private articleService: ArticleService) {}

  @Get()
  findAll(@Query() query: QueryArticleDto) {
    return this.articleService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articleService.findOne(id);
  }

  // 自动生成摘要：读取正文内容，调用后台已启用的通用模型生成一段摘要。
  // 注意需声明在 @Post() 之前，避免被动态路由误匹配。
  @Post('generate-summary')
  generateSummary(@Body() dto: GenerateSummaryDto) {
    return this.articleService.generateSummary(dto.content, dto.title);
  }

  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.articleService.create(dto);
  }

  // 批量调整文章顺序：需声明在 @Put(':id') 之前，避免 "reorder" 被动态路由当作 id 匹配
  @Put('reorder')
  reorder(@Body() dto: ReorderArticleDto) {
    return this.articleService.reorder(dto.ids);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articleService.remove(id);
  }
}
