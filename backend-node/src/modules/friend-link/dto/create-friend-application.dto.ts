import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** 前台「申请加入」提交：生成一条待审核申请，通过后才会出现在友链列表 */
export class CreateFriendApplicationDto {
  @IsString()
  @MaxLength(40)
  name: string;

  @IsEmail()
  @MaxLength(80)
  email: string;

  @Matches(/^https?:\/\/[^\s]+\.[^\s]+$/, {
    message: '请填写以 http:// 或 https:// 开头的网址',
  })
  @MaxLength(300)
  url: string;

  /** 站点头像地址（选填，通过后会作为友链头像） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}
