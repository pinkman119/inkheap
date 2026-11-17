import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/** 后台文章列表拖拽排序：ids 为拖拽后的目标顺序 */
export class ReorderArticleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
