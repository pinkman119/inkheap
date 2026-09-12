import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FOOTER_ICON_KEYS } from '../../footer-link/footer-icon.constants';

/**
 * 首页头像下方的单个社交链接。
 *
 * icon：预设图标 key，需与前端 footer-icons.js 保持一致；
 * svg ：自定义 SVG 源码，存在时优先级高于 icon。
 */
export class HomeSocialLinkDto {
  /** 按钮上显示的文字，如「语雀」 */
  @IsString()
  @MaxLength(60)
  label: string;

  /** 点击跳转的地址，外链或 mailto: */
  @IsString()
  @MaxLength(500)
  url: string;

  /** 预设图标 key（允许空串，表示使用自定义 SVG 或不显示图标） */
  @IsOptional()
  @IsString()
  @IsIn([...FOOTER_ICON_KEYS, ''])
  icon?: string;

  /** 自定义 SVG 源码（优先级高于 icon） */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  svg?: string;
}
