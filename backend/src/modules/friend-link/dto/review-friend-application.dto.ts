import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** 审核通过：可顺手补全友链信息（不填则用申请内容兜底） */
export class ApproveFriendApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  desc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string;

  @IsOptional()
  @IsInt()
  mode?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** 审核拒绝：可填写拒绝原因（后台备注） */
export class RejectFriendApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
