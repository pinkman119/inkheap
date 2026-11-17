import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class MoveFooterLinkDto {
  @IsString()
  @IsNotEmpty({ message: 'id 不能为空' })
  id: string;

  // up = 上移（sortOrder 减小），down = 下移（sortOrder 增大）
  @IsIn(['up', 'down'])
  direction: 'up' | 'down';
}
