import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAboutProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  kicker?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lede?: string;

  @IsOptional()
  @IsString()
  evaluationQuote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  evaluationBy?: string;
}
