import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FriendLinkService } from './friend-link.service';
import type { FriendLinkQuery } from './friend-link.service';
import { CreateFriendLinkDto } from './dto/create-friend-link.dto';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** 后台：友链（邻居）增删改查 */
@Controller('admin/friend-links')
@UseGuards(JwtAuthGuard)
export class FriendLinkController {
  constructor(private readonly friendLinkService: FriendLinkService) {}

  @Get()
  findAll(@Query() query: FriendLinkQuery) {
    return this.friendLinkService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.friendLinkService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFriendLinkDto) {
    return this.friendLinkService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFriendLinkDto) {
    return this.friendLinkService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.friendLinkService.remove(id);
  }

  @Post(':id/move')
  move(@Param('id') id: string, @Body() body: { direction?: 'up' | 'down' }) {
    return this.friendLinkService.move(id, body.direction === 'up' ? 'up' : 'down');
  }
}
