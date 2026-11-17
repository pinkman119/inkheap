import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAvatarDto {
  // 头像地址：上传接口返回的 /files/... 相对路径或外链；传空字符串表示移除头像
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '头像地址最多 500 字' })
  avatar?: string;
}
