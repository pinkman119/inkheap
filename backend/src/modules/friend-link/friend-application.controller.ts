import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FriendLinkService } from './friend-link.service';
import type { FriendApplicationQuery } from './friend-link.service';
import { ApproveFriendApplicationDto, RejectFriendApplicationDto } from './dto/review-friend-application.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** 后台：友链加入申请审核（通过后才会在前台展示） */
@Controller('admin/friend-applications')
@UseGuards(JwtAuthGuard)
export class FriendApplicationController {
  constructor(private readonly friendLinkService: FriendLinkService) {}

  @Get('stats')
  stats() {
    return this.friendLinkService.applicationStats();
  }

  @Get()
  findAll(@Query() query: FriendApplicationQuery) {
    return this.friendLinkService.findApplications(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.friendLinkService.findApplication(id);
  }

  /** 通过：生成 / 更新对应友链 */
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveFriendApplicationDto) {
    return this.friendLinkService.approve(id, dto ?? {});
  }

  /** 拒绝：保留记录并写明原因 */
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectFriendApplicationDto) {
    return this.friendLinkService.reject(id, dto?.remark);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.friendLinkService.removeApplication(id);
  }
}
