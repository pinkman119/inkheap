import { IsString, IsOptional, IsBoolean, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsString()
  categoryKey: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  author: string;

  // 作者主页链接：可留空，留空时前台点击作者跳转站点首页
  @IsOptional()
  @IsString()
  authorUrl?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  // 虚拟阅读量：null / 不传 = 未设置（前台展示真实值）；>= 0 时前台直接展示该值
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  virtualViewCount?: number;
}
