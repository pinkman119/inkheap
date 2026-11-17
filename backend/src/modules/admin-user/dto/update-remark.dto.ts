import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateRemarkDto {
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '备注最多 200 字' })
  remark?: string;
}
