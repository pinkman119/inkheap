import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHomePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  siteName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  personTitle?: string;

  @IsOptional()
  @IsString()
  codeContent?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
