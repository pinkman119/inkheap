import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  // YYYY-MM-DD 格式
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date 必须为 YYYY-MM-DD 格式' })
  date: string;

  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  desc: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
