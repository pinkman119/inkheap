import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRingDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  year?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  desc?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
