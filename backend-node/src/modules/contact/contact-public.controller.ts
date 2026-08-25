import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ContactService } from './contact.service';

class CreateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsString()
  message: string;
}

@Controller('contact')
export class ContactPublicController {
  constructor(private contactService: ContactService) {}

  /** 前台「联系我」提交来信（无需登录） */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateContactDto) {
    const created = await this.contactService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      contact: dto.contact,
      message: dto.message,
    });
    return { id: created.id, message: '提交成功，我会尽快回复你！' };
  }
}
