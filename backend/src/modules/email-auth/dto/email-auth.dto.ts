import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

/** 发送注册验证码 */
export class SendCodeDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;
}

/** 注册：邮箱 + 密码 + 昵称 + 主站（可选）+ 验证码 */
export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(64, { message: '密码过长（最多 64 位）' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(32, { message: '昵称过长（最多 32 字符）' })
  nickname!: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: '主站链接格式不正确' })
  homepageUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: '头像链接格式不正确' })
  @MaxLength(500, { message: '头像链接过长' })
  avatarUrl?: string;

  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  code!: string;
}

/** 登录：邮箱 + 密码 */
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string;
}

/** 忘记密码 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;
}
