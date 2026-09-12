import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getConfig } from './config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArticleModule } from './modules/article/article.module';
import { CategoryModule } from './modules/category/category.module';
import { HomePageModule } from './modules/homepage/homepage.module';
import { ResumeModule } from './modules/resume/resume.module';
import { UploadModule } from './modules/upload/upload.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { XiaojiModule } from './modules/xiaoji/xiaoji.module';
import { AboutModule } from './modules/about/about.module';
import { DigitalLifeModule } from './modules/digitallife/digital-life.module';
import { ContactModule } from './modules/contact/contact.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { VisitModule } from './modules/visit/visit.module';
import { ViewModule } from './modules/view/view.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { FooterLinkModule } from './modules/footer-link/footer-link.module';
import { FriendLinkModule } from './modules/friend-link/friend-link.module';

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
    ResumeModule,
    UploadModule,
    ProxyModule,
    XiaojiModule,
    AboutModule,
    DigitalLifeModule,
    ContactModule,
    DashboardModule,
    VisitModule,
    ViewModule,
    AdminUserModule,
    FooterLinkModule,
    FriendLinkModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
