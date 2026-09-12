import { Module } from '@nestjs/common';
import { FriendLinkService } from './friend-link.service';
import { FriendLinkController } from './friend-link.controller';
import { FriendApplicationController } from './friend-application.controller';
import { PublicFriendLinkController, PublicFriendApplicationController } from './friend-link-public.controller';

@Module({
  controllers: [
    FriendLinkController,
    FriendApplicationController,
    PublicFriendLinkController,
    PublicFriendApplicationController,
  ],
  providers: [FriendLinkService],
  exports: [FriendLinkService],
})
export class FriendLinkModule {}
