import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { FooterLinkService } from './footer-link.service';
import { CreateFooterLinkDto } from './dto/create-footer-link.dto';
import { UpdateFooterLinkDto } from './dto/update-footer-link.dto';
import { MoveFooterLinkDto } from './dto/move-footer-link.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/footer-links')
@UseGuards(JwtAuthGuard)
export class FooterLinkController {
  constructor(private readonly footerLinkService: FooterLinkService) {}

  @Get()
  findAll() {
    return this.footerLinkService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.footerLinkService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFooterLinkDto) {
    return this.footerLinkService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFooterLinkDto) {
    return this.footerLinkService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.footerLinkService.remove(id);
  }

  @Post('move')
  move(@Body() dto: MoveFooterLinkDto) {
    return this.footerLinkService.move(dto);
  }
}
