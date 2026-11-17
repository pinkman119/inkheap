import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateFooterConfigDto {
  /** 备案号，如「苏ICP备2024125779号」；传空字符串表示不展示 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icpNo?: string;

  /** 备案号跳转地址；留空时前台回退到工信部备案查询系统 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  // 允许清空（此时回退默认地址），非空时才校验 URL 格式
  @ValidateIf((o: UpdateFooterConfigDto) => !!o.icpUrl?.trim())
  @IsUrl(
    { require_protocol: true },
    { message: '备案地址需为合法 URL（以 http:// 或 https:// 开头）' },
  )
  icpUrl?: string;
}
