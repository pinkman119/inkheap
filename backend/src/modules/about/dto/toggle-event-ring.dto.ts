import { IsBoolean } from 'class-validator';

/** 设为成就（写进年轮）：仅切换 isRing 标记 */
export class ToggleEventRingDto {
  @IsBoolean()
  isRing: boolean;
}
