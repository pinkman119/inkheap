import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { XiaojiService } from './xiaoji.service';
import { CreateXiaojiDto } from './dto/create-xiaoji.dto';
import { UpdateXiaojiDto } from './dto/update-xiaoji.dto';
import { QueryXiaojiDto } from './dto/query-xiaoji.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';

/** 后台小记管理接口（JWT 鉴权） */
@Controller('admin/xiaoji')
@UseGuards(JwtAuthGuard)
export class AdminXiaojiController {
  constructor(private readonly xiaojiService: XiaojiService) {}

  @Get()
  findAll(@Query() query: QueryXiaojiDto) {
    return this.xiaojiService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.xiaojiService.findOne(id);
  }

  // 自动生成摘要：读取正文内容，调用后台已启用的通用模型生成一段摘要。
  // 注意需声明在 @Post() 之前，避免被动态路由误匹配。
  @Post('generate-summary')
  generateSummary(@Body() dto: GenerateSummaryDto) {
    return this.xiaojiService.generateSummary(dto.content, dto.title);
  }

  @Post()
  create(@Body() dto: CreateXiaojiDto) {
    return this.xiaojiService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateXiaojiDto) {
    return this.xiaojiService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.xiaojiService.remove(id);
  }
}
