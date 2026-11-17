import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTravelDto {
  @IsString()
  @MaxLength(60)
  glyph: string;

  @IsString()
  @MaxLength(120)
  place: string;

  @IsString()
  @MaxLength(120)
  meta: string;

  @IsString()
  note: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
