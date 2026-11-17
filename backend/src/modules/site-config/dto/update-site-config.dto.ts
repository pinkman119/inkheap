import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateSiteConfigDto {
  /** 站点对外访问地址，如「https://inkheap.com」（无尾斜杠）；RSS 条目链接拼接的基础 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  // 允许清空（此时 feed 回退请求 Host），非空时才校验 URL 格式
  @ValidateIf((o: UpdateSiteConfigDto) => !!o.siteUrl?.trim())
  @IsUrl(
    { require_protocol: true },
    { message: '站点地址需为合法 URL（以 http:// 或 https:// 开头）' },
  )
  siteUrl?: string;

  /** 站点名称，RSS channel 标题；留空则回退「墨堆」 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  siteTitle?: string;

  /** 站点描述，RSS channel description */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  siteDescription?: string;

  /** 站点作者，RSS channel managingEditor */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  author?: string;
}
