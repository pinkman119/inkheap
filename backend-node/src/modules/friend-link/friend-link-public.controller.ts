import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { FriendLinkService } from './friend-link.service';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';

/** 公开接口（前台「邻居」页使用，无需 admin 鉴权） */
@Controller('public/friend-links')
export class PublicFriendLinkController {
  constructor(private readonly friendLinkService: FriendLinkService) {}

  /**
   * 前台友链列表：只返回已通过审核的条目。
   * ?mode=work|life 按工作 / 生活模式过滤（mode=0 的条目两种模式都出现）。
   */
  @Get()
  findAll(@Query('mode') mode?: string) {
    return this.friendLinkService.findPublic(mode);
  }
}

/** 前台「申请加入」：提交后在后台生成一条待审核申请 */
@Controller('public/friend-applications')
export class PublicFriendApplicationController {
  constructor(private readonly friendLinkService: FriendLinkService) {}

  /**
   * 前台「邻居留言」：所有申请（待审核 / 已通过 / 已拒绝）都展示，
   * 但只有已通过的才会进入上面的友链索引。
   */
  @Get()
  findAll() {
    return this.friendLinkService.findPublicApplications();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFriendApplicationDto) {
    const created = await this.friendLinkService.apply(dto);
    return { id: created.id, message: '收到了，通过审核后会把它编进邻居索引。' };
  }
}
