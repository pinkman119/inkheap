import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateTravelDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  glyph?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  place?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  meta?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
