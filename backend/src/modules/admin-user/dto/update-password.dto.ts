import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(64, { message: '新密码最多 64 位' })
  newPassword: string;

  // 修改自己的密码时必须提供并校验原密码；修改他人密码时无需提供
  @IsOptional()
  @IsString()
  oldPassword?: string;
}
