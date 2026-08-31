import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  // active = 启用，disabled = 失效
  @IsIn(['active', 'disabled'], { message: '状态只能是 active 或 disabled' })
  status: 'active' | 'disabled';
}
