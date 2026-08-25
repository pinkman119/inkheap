import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRingDto {
  @IsString()
  @MaxLength(10)
  year: string;

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
