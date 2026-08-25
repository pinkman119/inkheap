import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AboutService } from './about.service';
import { UpdateAboutProfileDto } from './dto/update-about-profile.dto';
import { CreateFootprintDto } from './dto/create-footprint.dto';
import { UpdateFootprintDto } from './dto/update-footprint.dto';
import { CreateTravelDto } from './dto/create-travel.dto';
import { UpdateTravelDto } from './dto/update-travel.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ToggleEventRingDto } from './dto/toggle-event-ring.dto';

/** 后台关于我管理接口（JWT 鉴权） */
@Controller('admin/about')
@UseGuards(JwtAuthGuard)
export class AboutAdminController {
  constructor(private readonly service: AboutService) {}

  // ===== Profile =====
  @Get('profile')
  getProfile() {
    return this.service.getProfile();
  }

  @Put('profile')
  updateProfile(@Body() dto: UpdateAboutProfileDto) {
    return this.service.updateProfile(dto);
  }

  // ===== Footprints =====
  @Get('footprints')
  findFootprints() {
    return this.service.findFootprints();
  }

  @Post('footprints')
  createFootprint(@Body() dto: CreateFootprintDto) {
    return this.service.createFootprint(dto);
  }

  @Put('footprints/:id')
  updateFootprint(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFootprintDto) {
    return this.service.updateFootprint(id, dto);
  }

  @Delete('footprints/:id')
  removeFootprint(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeFootprint(id);
  }

  // ===== Travels =====
  @Get('travels')
  findTravels() {
    return this.service.findTravels();
  }

  @Post('travels')
  createTravel(@Body() dto: CreateTravelDto) {
    return this.service.createTravel(dto);
  }

  @Put('travels/:id')
  updateTravel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTravelDto) {
    return this.service.updateTravel(id, dto);
  }

  @Delete('travels/:id')
  removeTravel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTravel(id);
  }

  // ===== Events =====
  @Get('events')
  findEvents() {
    return this.service.findEvents();
  }

  @Post('events')
  createEvent(@Body() dto: CreateEventDto) {
    return this.service.createEvent(dto);
  }

  @Put('events/:id')
  updateEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.service.updateEvent(id, dto);
  }

  /** 设为成就（写进年轮）/ 取消成就：仅切换 isRing 标记 */
  @Patch('events/:id/ring')
  toggleEventRing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ToggleEventRingDto) {
    return this.service.toggleEventRing(id, dto);
  }

  @Delete('events/:id')
  removeEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeEvent(id);
  }
}
