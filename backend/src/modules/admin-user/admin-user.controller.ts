import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminUserService } from './admin-user.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateRemarkDto } from './dto/update-remark.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  /** 管理员列表 */
  @Get()
  findAll() {
    return this.adminUserService.findAll();
  }

  /** 新增管理员 */
  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUserService.create(dto);
  }

  /** 修改密码（支持改自己 / 改他人） */
  @Patch(':id/password')
  updatePassword(
    @Param('id') id: string,
    @Body() dto: UpdatePasswordDto,
    @Req() req: any,
  ) {
    return this.adminUserService.updatePassword(id, dto, req.user.id);
  }

  /** 修改备注 */
  @Patch(':id/remark')
  updateRemark(@Param('id') id: string, @Body() dto: UpdateRemarkDto) {
    return this.adminUserService.updateRemark(id, dto);
  }

  /** 修改头像（传空字符串表示移除） */
  @Patch(':id/avatar')
  updateAvatar(@Param('id') id: string, @Body() dto: UpdateAvatarDto) {
    return this.adminUserService.updateAvatar(id, dto);
  }

  /** 失效 / 启用 */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: any,
  ) {
    return this.adminUserService.updateStatus(id, dto, req.user.id);
  }
}
