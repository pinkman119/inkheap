import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { REF_TYPES, RefType } from '../training.service';
import { MODEL_TYPES } from '../digital-life.defaults';

/** Mock 微信登录 */
export class MockLoginDto {
  @IsOptional()
  @IsString()
  openid?: string;
}

/** 聊天提问（可指定使用某个「通用」模型） */
export class ChatDto {
  @IsString()
  @MaxLength(4000)
  content!: string;

  /** 指定通用模型 ID；不传则按启用的通用模型顺序自动切换 */
  @IsOptional()
  @IsString()
  modelId?: string;

  /** 会话 ID：开启新会话时由前端生成并持久化；不传则消息归入默认（空）会话 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}

/** 训练请求（可指定使用的「嵌入」模型） */
export class TrainDto {
  /** 嵌入模型 ID（模型管理中的「嵌入」类型模型）；不传则使用当前默认嵌入模型 */
  @IsOptional()
  @IsString()
  embeddingModelId?: string;
}

/** 模型更新（name / modelId / modelType / apiKey） */
export class UpdateDlModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelId?: string;

  /** 模型类型：general 通用（对话）/ embedding 嵌入（训练与检索），预留扩展枚举 */
  @IsOptional()
  @IsIn(MODEL_TYPES as unknown as string[])
  modelType?: string;

  /** 提供则更新密文（空串清除）；不提供保留原值 */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiKey?: string;
}

/** 人格更新（结构化字段）：人格文本均不设字数上限 */
export class UpdatePersonaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  greeting?: string;

  /** 性格描述（核心人格 prompt，允许长文本） */
  @IsOptional()
  @IsString()
  description?: string;

  /** 基本信息：站主的事实性资料（姓名/职业/城市/兴趣等），前台据此回答相关问题 */
  @IsOptional()
  @IsString()
  basicInfo?: string;

  @IsOptional()
  @IsString()
  styleHint?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  avatarEmoji?: string;

  @IsOptional()
  @IsString()
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
