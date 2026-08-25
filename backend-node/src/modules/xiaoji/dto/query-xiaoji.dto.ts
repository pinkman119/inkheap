import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsIn } from 'class-validator';

export class QueryXiaojiDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(['all', 'published', 'draft'])
  status?: string = 'all';

  @IsOptional()
  @IsString()
  search?: string;
}
