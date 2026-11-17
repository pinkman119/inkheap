import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatAdminService } from './chat-admin.service';
import { ModelConfigService } from './model-config.service';
import { PersonaService } from './persona.service';
import { TrainingService, REF_TYPES, RefType } from './training.service';
import {
  CreateDlModelDto,
  QueryTrainingDto,
  TrainDto,
  UpdateDlModelDto,
  UpdatePersonaDto,
} from './dto/digital-life.dto';

/**
 * 数字生命后台管理接口（管理员 JWT 鉴权）：
 * - 模型：GET …/models、POST …/models（新增）、DELETE …/models/:id、
 *   PUT …/models/:id（更新）、PUT …/models/:id/toggle、POST …/models/:id/test
 * - 人格：GET …/personas、GET …/personas/:id、PUT …/personas/:id
 * - 训练：GET …/training/:refType、POST …/training/:refType/:refId/train|remove
 * - 会话：GET …/sessions（会话列表，支持 IP 搜索）、GET …/sessions/messages（会话详情）
 */
@Controller('admin/digital-life')
@UseGuards(JwtAuthGuard)
export class DigitalLifeAdminController {
  constructor(
    private readonly modelConfigService: ModelConfigService,
    private readonly personaService: PersonaService,
    private readonly trainingService: TrainingService,
    private readonly chatAdminService: ChatAdminService,
  ) {}

  // ==================== 会话管理 ====================

  /** GET …/sessions?page&pageSize&ip —— 会话列表（支持按 IP 搜索） */
  @Get('sessions')
  listSessions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('ip') ip?: string,
  ) {
    return this.chatAdminService.listSessions({ page, pageSize, ip });
  }

  /** GET …/sessions/messages?userId&sessionId —— 会话详情（全部消息，时间正序） */
  @Get('sessions/messages')
  sessionMessages(@Query('userId') userId: string, @Query('sessionId') sessionId?: string) {
    return this.chatAdminService.getSessionMessages(userId, sessionId || undefined);
  }

  // ==================== 模型管理 ====================

  @Get('models')
  listModels() {
    return this.modelConfigService.list();
  }

  @Post('models')
  createModel(@Body() dto: CreateDlModelDto) {
    return this.modelConfigService.create(dto);
  }

  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.modelConfigService.remove(id);
  }

  @Put('models/:id')
  updateModel(@Param('id') id: string, @Body() dto: UpdateDlModelDto) {
    return this.modelConfigService.update(id, dto);
  }

  @Put('models/:id/toggle')
  toggleModel(@Param('id') id: string) {
    return this.modelConfigService.toggle(id);
  }

  @Post('models/:id/test')
  testModel(@Param('id') id: string) {
    return this.modelConfigService.test(id);
  }

  // ==================== 人格管理 ====================

  @Get('personas')
  listPersonas() {
    return this.personaService.list();
  }

  @Get('personas/:id')
  getPersona(@Param('id') id: string) {
    return this.personaService.detail(id);
  }

  @Put('personas/:id')
  updatePersona(@Param('id') id: string, @Body() dto: UpdatePersonaDto) {
    return this.personaService.update(id, dto);
  }

  // ==================== 训练管理 ====================

  /** refType 合法性校验 */
  private assertRefType(refType: string): RefType {
    if (!REF_TYPES.includes(refType as RefType)) {
      throw new HttpException(`无效的数据源类型：${refType}`, 400);
    }
    return refType as RefType;
  }

  @Get('training/:refType')
  listTraining(@Param('refType') refType: string, @Query() query: QueryTrainingDto) {
    return this.trainingService.list(this.assertRefType(refType), query);
  }

  @Post('training/:refType/:refId/train')
  async trainOne(
    @Param('refType') refType: string,
    @Param('refId') refId: string,
    @Body() dto: TrainDto,
  ) {
    const result = await this.trainingService.trainOne(
      this.assertRefType(refType),
      refId,
      dto.embeddingModelId,
    );
    return { success: true, ...result };
  }

  @Post('training/:refType/:refId/remove')
  async removeOne(@Param('refType') refType: string, @Param('refId') refId: string) {
    const result = await this.trainingService.removeOne(this.assertRefType(refType), refId);
    return { success: true, ...result };
  }
}
