import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 随笔最多 9 张照片；相册（album）不限 */
export const XIAOJI_MAX_PHOTOS = 9;

export class PhotoDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class CreateXiaojiDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  // album = 相册，essay = 随笔
  @IsOptional()
  @IsIn(['album', 'essay'])
  type?: string;

  // 分类名数组：保存时按名称复用/自动新建 BlogCategory
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  quote?: string;

  @IsOptional()
  @IsString()
  location?: string;

  // 绑定的足迹 id（地点从足迹中选择）；空字符串 = 不绑定，地点清空
  @IsOptional()
  @IsString()
  footprintId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  // 照片数量上限按类型校验：相册不限，随笔最多 9 张（见 XiaojiService.assertPhotoLimit）
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  photos?: PhotoDto[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  // 虚拟阅读量：null / 不传 = 未设置（前台展示真实值）；>= 0 时前台直接展示该值
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  virtualViewCount?: number;
}
