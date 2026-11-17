import { PartialType } from '@nestjs/mapped-types';
import { CreateXiaojiDto } from './create-xiaoji.dto';

export class UpdateXiaojiDto extends PartialType(CreateXiaojiDto) {}
