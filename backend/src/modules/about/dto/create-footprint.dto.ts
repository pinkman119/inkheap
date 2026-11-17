import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFootprintDto {
  @IsString()
  @MaxLength(60)
  province: string;

  @IsString()
  @MaxLength(120)
  place: string;

  @IsString()
  @MaxLength(60)
  time: string;

  @IsString()
  @MaxLength(120)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  elevation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
