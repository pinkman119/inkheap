import { IsIn, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class CreateFooterLinkDto {
  // nav = 导航（站内路由），ext = 扩展（外链）
  @IsIn(['nav', 'ext'])
  type: 'nav' | 'ext';

  // 0 = 全模式显示，1 = 仅工作，2 = 仅生活
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  mode?: number;

  @IsNotEmpty({ message: 'label 不能为空' })
  label: string;

  @IsNotEmpty({ message: 'url 不能为空' })
  url: string;

  // 不传则服务端自动取同类型 MAX+1
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
