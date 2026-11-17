import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { HomePageService } from './homepage.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('public/home-page')
export class HomePagePublicController {
  constructor(private readonly service: HomePageService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }
}

@Controller('admin/home-page')
@UseGuards(JwtAuthGuard)
export class HomePageAdminController {
  constructor(private readonly service: HomePageService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }

  @Put()
  update(@Body() dto: UpdateHomePageDto) {
    return this.service.update(dto);
  }
}
