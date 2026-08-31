import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateRemarkDto } from './dto/update-remark.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

// 对外返回的字段（永远不包含 password）
const PUBLIC_SELECT = {
  id: true,
  username: true,
  role: true,
  remark: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
};

@Injectable()
export class AdminUserService {
  constructor(private prisma: PrismaService) {}

  /** 管理员列表 */
  async findAll() {
    return this.prisma.adminUser.findMany({
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** 新增管理员 */
  async create(dto: CreateAdminUserDto) {
    const username = dto.username.trim();
    const existing = await this.prisma.adminUser.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.adminUser.create({
      data: {
        username,
        password,
        remark: dto.remark?.trim() || null,
      },
      select: PUBLIC_SELECT,
    });
  }

  /**
   * 修改密码。
   * - 改自己的密码：必须提供并校验原密码
   * - 改他人的密码：不需要原密码
   */
  async updatePassword(id: string, dto: UpdatePasswordDto, currentUserId: string) {
    const user = await this.ensureExists(id);

    if (id === currentUserId) {
      if (!dto.oldPassword) {
        throw new BadRequestException('修改自己的密码需提供原密码');
      }
      const ok = await bcrypt.compare(dto.oldPassword, user.password);
      if (!ok) {
        throw new BadRequestException('原密码不正确');
      }
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.adminUser.update({ where: { id }, data: { password } });
    return { success: true };
  }

  /** 修改备注（选填，传空字符串表示清空） */
  async updateRemark(id: string, dto: UpdateRemarkDto) {
    await this.ensureExists(id);
    return this.prisma.adminUser.update({
      where: { id },
      data: { remark: dto.remark?.trim() || null },
      select: PUBLIC_SELECT,
    });
  }

  /**
   * 失效 / 启用。
   * 禁止对自己操作——这保证了系统永远至少有 1 个有效管理员。
   */
  async updateStatus(id: string, dto: UpdateStatusDto, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('不能对自己执行失效/启用操作');
    }
    await this.ensureExists(id);
    return this.prisma.adminUser.update({
      where: { id },
      data: { status: dto.status },
      select: PUBLIC_SELECT,
    });
  }

  /** 内部：确保管理员存在并返回完整记录（含 password） */
  private async ensureExists(id: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('管理员不存在');
    }
    return user;
  }
}
