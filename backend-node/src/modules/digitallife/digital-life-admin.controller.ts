import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModelConfigService } from './model-config.service';
import { PersonaService } from './persona.service';
import { ChatService } from './chat.service';
import { TrainingService, REF_TYPES, RefType } from './training.service';
import {
  PersonaTestChatDto,
  QueryTrainingDto,
  UpdateModelConfigDto,
  UpdatePersonaDto,
} from './dto/digital-life.dto';

/**
 * 数字生命后台管理接口（管理员 JWT 鉴权）：
 * - 模型配置：GET/PUT /api/admin/digital-life/model、POST …/model/test
 * - 人格：GET/PUT /api/admin/digital-life/persona、POST …/persona/reset、POST …/persona/test-chat
 * - 训练：GET …/training/:refType、POST …/training/:refType/:refId/train|remove
 */
@Controller('admin/digital-life')
@UseGuards(JwtAuthGuard)
export class DigitalLifeAdminController {
  constructor(
    private readonly modelConfigService: ModelConfigService,
    private readonly personaService: PersonaService,
    private readonly chatService: ChatService,
    private readonly trainingService: TrainingService,
  ) {}

  // ==================== 模型管理 ====================

  @Get('models')
  getModelConfig() {
    return this.modelConfigService.getConfig();
  }

  @Put('models')
  updateModelConfig(@Body() dto: UpdateModelConfigDto) {
    return this.modelConfigService.updateConfig(dto);
  }

  @Post('models/test')
  testModelConnection() {
    return this.modelConfigService.testConnection();
  }

  // ==================== 人格管理 ====================

  @Get('persona')
  async getPersona() {
    const content = await this.personaService.getContent();
    return { content };
  }

  @Put('persona')
  updatePersona(@Body() dto: UpdatePersonaDto) {
    return this.personaService.update(dto);
  }

  @Post('persona/reset')
  resetPersona() {
    return this.personaService.resetToDefault();
  }

  /** 试聊：useDraft=true 时以草稿人格验证效果（不落库、不入聊天记录） */
  @Post('persona/test-chat')
  async personaTestChat(@Body() dto: PersonaTestChatDto) {
    try {
      return await this.chatService.testChat(dto.content, !!dto.useDraft, dto.draftPersona);
    } catch (e: any) {
      throw new HttpException(
        e?.response?.data?.error?.message || e?.message || '试聊失败',
        e?.status ?? 500,
      );
    }
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
  async trainOne(@Param('refType') refType: string, @Param('refId') refId: string) {
    const result = await this.trainingService.trainOne(this.assertRefType(refType), refId);
    return { success: true, ...result };
  }

  @Post('training/:refType/:refId/remove')
  async removeOne(@Param('refType') refType: string, @Param('refId') refId: string) {
    const result = await this.trainingService.removeOne(this.assertRefType(refType), refId);
    return { success: true, ...result };
  }
}
