import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  photos?: PhotoDto[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
