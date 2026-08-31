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
import { TrainingService, REF_TYPES, RefType } from './training.service';
import {
  QueryTrainingDto,
  TrainDto,
  UpdateDlModelDto,
  UpdatePersonaDto,
} from './dto/digital-life.dto';

/**
 * 数字生命后台管理接口（管理员 JWT 鉴权）：
 * - 模型：GET …/models、PUT …/models/:id（更新）、PUT …/models/:id/toggle、POST …/models/:id/test
 * - 人格：GET …/personas、GET …/personas/:id、PUT …/personas/:id
 * - 训练：GET …/training/:refType、POST …/training/:refType/:refId/train|remove
 */
@Controller('admin/digital-life')
@UseGuards(JwtAuthGuard)
export class DigitalLifeAdminController {
  constructor(
    private readonly modelConfigService: ModelConfigService,
    private readonly personaService: PersonaService,
    private readonly trainingService: TrainingService,
  ) {}

  // ==================== 模型管理 ====================

  @Get('models')
  listModels() {
    return this.modelConfigService.list();
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
