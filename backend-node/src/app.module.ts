import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getConfig } from './config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticleModule } from './modules/article/article.module';
import { CategoryModule } from './modules/category/category.module';
import { HomePageModule } from './modules/homepage/homepage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      load: [getConfig],
    }),
    PrismaModule,
    AuthModule,
    ArticleModule,
    CategoryModule,
    HomePageModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
