import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

/** 简历 content 的最小结构校验：至少包含姓名（原型 hero 区块）。 */
export class ResumeContentDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsObject()
  @IsNotEmpty()
  content: ResumeContentDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateResumeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsObject()
  content?: ResumeContentDto;

  // 至少提交 name 或 content 之一
  @ValidateIf((o) => o.name === undefined && o.content === undefined)
  @IsObject()
  readonly _requireNameOrContent?: never;
}
