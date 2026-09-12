import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FOOTER_ICON_KEYS, FOOTER_LINK_TYPES } from '../footer-icon.constants';

export class CreateFooterLinkDto {
  // nav = 导航（站内路由），ext = 扩展（外链），social = 社交图标（圆形图标栏）
  @IsIn(FOOTER_LINK_TYPES)
  type: 'nav' | 'ext' | 'social';

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

  // 预设图标 key（type = social 时生效），留空则前端兜底为 link 图标
  @IsOptional()
  @IsIn(FOOTER_ICON_KEYS)
  icon?: string;

  // 自定义图标：完整 SVG 源码，优先级高于 icon
  @IsOptional()
  @IsString()
  @Matches(/<svg[\s\S]*<\/svg>/i, { message: '自定义图标需为完整的 SVG 代码' })
  svg?: string;

  // 不传则服务端自动取同类型 MAX+1
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
