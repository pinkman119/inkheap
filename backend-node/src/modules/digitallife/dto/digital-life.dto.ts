import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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

/** 模型更新（name / modelId / apiKey） */
export class UpdateDlModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelId?: string;

  /** 提供则更新密文（空串清除）；不提供保留原值 */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiKey?: string;
}

/** 人格更新（结构化字段） */
export class UpdatePersonaDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  greeting?: string;

  /** 性格描述（核心人格 prompt，允许长文本） */
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  styleHint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  avatarEmoji?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  personalityType?: string;
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
