import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { SiteConfigModule } from '../site-config/site-config.module';

@Module({
  imports: [SiteConfigModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
