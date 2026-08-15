import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { CreateResumeDto, UpdateResumeDto } from './dto/resume.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** 公开接口：前台简历页查询当前生效版本 */
@Controller('public/resume')
export class ResumePublicController {
  constructor(private readonly service: ResumeService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}

/** 管理接口：版本列表 / 详情 / 新建 / 更新 / 切换激活 / 删除 */
@Controller('admin/resume')
@UseGuards(JwtAuthGuard)
export class ResumeAdminController {
  constructor(private readonly service: ResumeService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateResumeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResumeDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
