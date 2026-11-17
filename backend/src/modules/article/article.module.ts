import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { PublicArticleController } from './article-public.controller';
import { DigitalLifeModule } from '../digitallife/digital-life.module';
import { ViewModule } from '../view/view.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [DigitalLifeModule, ViewModule, CategoryModule],
  controllers: [ArticleController, PublicArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
