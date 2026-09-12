import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// 自动生成摘要入参：正文为必填（生成输入源），标题可选（提供给模型作上下文）
export class GenerateSummaryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;
}
