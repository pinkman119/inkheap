import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportVisitDto {
  /** 前台路由路径（仅作记录用途，当前版本不做路径维度统计） */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;
}
