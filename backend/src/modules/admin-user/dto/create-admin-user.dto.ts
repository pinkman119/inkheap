import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  @MinLength(3, { message: '用户名至少 3 位' })
  @MaxLength(32, { message: '用户名最多 32 位' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和中划线',
  })
  username: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(64, { message: '密码最多 64 位' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '备注最多 200 字' })
  remark?: string;
}
