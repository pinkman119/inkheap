import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 后台新建友链。
 * url 允许填站内相对路径（本站条目为 "/"），因此不做 URL 格式校验。
 */
export class CreateFriendLinkDto {
  @IsString()
  @MaxLength(40)
  name: string;

  @IsString()
  @MaxLength(300)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  desc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;

  /** 0 = 全模式；1 = 仅工作；2 = 仅生活 */
  @IsOptional()
  @IsInt()
  mode?: number;

  /** active = 正常；dormant = 失联 */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /** 由审核通过生成时回填，标记来源申请 */
  @IsOptional()
  @IsString()
  applicationId?: string;
}
