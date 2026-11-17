import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HomeSocialLinkDto } from './home-social-link.dto';

export class UpdateHomePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  siteName?: string;

  /** 通用人物 title：对应模式的专属配置为空时的兜底 */
  @IsOptional()
  @IsString()
  @MaxLength(240)
  personTitle?: string;

  /** 通用代码框内容：对应模式的专属配置为空时的兜底 */
  @IsOptional()
  @IsString()
  codeContent?: string;

  /** 工作模式人物 title */
  @IsOptional()
  @IsString()
  @MaxLength(240)
  workPersonTitle?: string;

  /** 工作模式代码框内容 */
  @IsOptional()
  @IsString()
  workCodeContent?: string;

  /** 生活模式人物 title */
  @IsOptional()
  @IsString()
  @MaxLength(240)
  lifePersonTitle?: string;

  /** 生活模式代码框内容 */
  @IsOptional()
  @IsString()
  lifeCodeContent?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  /** 首页头像下方的社交链接列表，整体覆盖式保存 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => HomeSocialLinkDto)
  socialLinks?: HomeSocialLinkDto[];
}
