import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { PublicArticleController } from './article-public.controller';

@Module({
  controllers: [ArticleController, PublicArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
