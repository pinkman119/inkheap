import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticleService } from './article.service';
import { QueryArticleDto } from './dto/query-article.dto';

// 公开接口（前台知识库页使用，无需 admin 鉴权）
// 仅返回已发布文章
@Controller('articles')
export class PublicArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  list(@Query() query: QueryArticleDto) {
    return this.articleService.findAll({
      ...query,
      status: 'published',
    });
  }

  // 按 slug 获取知识库文章详情（仅已发布且 type=article）
  @Get('slug/:slug')
  detailBySlug(@Param('slug') slug: string) {
    return this.articleService.findOneBySlug(slug);
  }

  // 按更新时间倒序返回文章列表，用于首页右侧"动态"栏目
  @Get('feed')
  feed(@Query() query: QueryArticleDto) {
    return this.articleService.findLatestUpdated(query);
  }
}
