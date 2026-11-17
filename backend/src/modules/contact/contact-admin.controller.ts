import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import type { ContactQuery } from './contact.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/contact')
@UseGuards(JwtAuthGuard)
export class ContactAdminController {
  constructor(private contactService: ContactService) {}

  /** 列表：分页 + 已读/未读筛选 + 关键词搜索 */
  @Get()
  findAll(@Query() query: ContactQuery) {
    return this.contactService.findAll(query);
  }

  /** 仪表盘统计：总数 / 未读数 */
  @Get('stats')
  stats() {
    return this.contactService.stats();
  }

  /** 标记单条已读 / 未读 */
  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  setRead(@Param('id') id: string, @Body() body: { read?: boolean }) {
    return this.contactService.setRead(id, body.read ?? true);
  }

  /** 批量标记已读 */
  @Put('read-many')
  @HttpCode(HttpStatus.OK)
  setReadMany(@Body() body: { ids: string[]; read?: boolean }) {
    return this.contactService.setReadMany(body.ids ?? [], body.read ?? true);
  }

  /** 删除单条 */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
