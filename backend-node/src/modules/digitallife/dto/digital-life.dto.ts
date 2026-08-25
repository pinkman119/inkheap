import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { REF_TYPES, RefType } from '../training.service';

/** Mock 微信登录 */
export class MockLoginDto {
  @IsOptional()
  @IsString()
  openid?: string;
}

/** 聊天提问 */
export class ChatDto {
  @IsString()
  @MaxLength(4000)
  content!: string;
}

/** 模型配置更新 */
export class UpdateModelConfigDto {
  @IsOptional()
  @IsString()
  chatModel?: string;

  @IsOptional()
  @IsString()
  embeddingModel?: string;

  /** 提供则更新密文（空串清除）；不提供保留原值 */
  @IsOptional()
  @IsString()
  apiKey?: string;
}

/** 人格更新 */
export class UpdatePersonaDto {
  @IsString()
  content!: string;
}

/** 人格试聊（草稿人格验证） */
export class PersonaTestChatDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  /** true 时使用 draftPersona（草稿人格），不落库不影响线上 */
  @IsOptional()
  @IsBoolean()
  useDraft?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30000)
  draftPersona?: string;
}

/** 训练列表查询 */
export class QueryTrainingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  /** 0 未训练 / 1 已训练 / 2 已移除 */
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1, 2])
  trainType?: number;
}

/** refType 路由参数校验 */
export const REF_TYPE_VALUES = REF_TYPES;
export type { RefType };
