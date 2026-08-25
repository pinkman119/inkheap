import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingService, RefType } from '../digitallife/training.service';
import { UpdateAboutProfileDto } from './dto/update-about-profile.dto';
import { CreateRingDto } from './dto/create-ring.dto';
import { UpdateRingDto } from './dto/update-ring.dto';
import { CreateFootprintDto } from './dto/create-footprint.dto';
import { UpdateFootprintDto } from './dto/update-footprint.dto';
import { CreateTravelDto } from './dto/create-travel.dto';
import { UpdateTravelDto } from './dto/update-travel.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const PROFILE_ID = 'about';

/** 把 ISO/Date 转为 YYYY-MM-DD（前端展示用） */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 把 YYYY-MM-DD 字符串解析为本地 Date（避免 UTC 偏移导致日期错位） */
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

@Injectable()
export class AboutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingService: TrainingService,
  ) {}

  // ==================== Profile（单条全局） ====================

  async getProfile() {
    const record = await this.prisma.aboutProfile.findUnique({
      where: { id: PROFILE_ID },
    });
    if (!record) {
      return {
        id: PROFILE_ID,
        kicker: 'About Me',
        lede: '',
        evaluationQuote: '',
        evaluationBy: '',
        createdAt: null,
        updatedAt: null,
      };
    }
    return record;
  }

  async updateProfile(dto: UpdateAboutProfileDto) {
    const existing = await this.prisma.aboutProfile.findUnique({
      where: { id: PROFILE_ID },
    });
    if (existing) {
      const updated = await this.prisma.aboutProfile.update({
        where: { id: PROFILE_ID },
        data: dto,
      });
      // 数字生命：已训练数据被编辑 → 删向量 + trainType 重置 0
      await this.trainingService.invalidateIfTrained('about_profile', PROFILE_ID);
      return updated;
    }
    return this.prisma.aboutProfile.create({
      data: {
        id: PROFILE_ID,
        kicker: dto.kicker ?? 'About Me',
        lede: dto.lede ?? '',
        evaluationQuote: dto.evaluationQuote ?? '',
        evaluationBy: dto.evaluationBy ?? '',
      },
    });
  }

  // ==================== Rings ====================

  async findRings() {
    const list = await this.prisma.aboutRing.findMany({
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }, { createdAt: 'asc' }],
    });
    return list;
  }

  async createRing(dto: CreateRingDto) {
    return this.prisma.aboutRing.create({
      data: {
        year: dto.year,
        title: dto.title,
        desc: dto.desc,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateRing(id: string, dto: UpdateRingDto) {
    const existing = await this.prisma.aboutRing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('年轮记录不存在');
    const data: any = {};
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.desc !== undefined) data.desc = dto.desc;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    const updated = await this.prisma.aboutRing.update({ where: { id }, data });
    await this.trainingService.invalidateIfTrained('about_ring', id);
    return updated;
  }

  async removeRing(id: string) {
    const existing = await this.prisma.aboutRing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('年轮记录不存在');
    await this.trainingService.invalidateByRef('about_ring', id);
    await this.prisma.aboutRing.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Footprints ====================

  async findFootprints() {
    return this.prisma.aboutFootprint.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createFootprint(dto: CreateFootprintDto) {
    return this.prisma.aboutFootprint.create({
      data: {
        province: dto.province,
        place: dto.place,
        time: dto.time,
        location: dto.location,
        elevation: dto.elevation ?? '—',
        note: dto.note,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateFootprint(id: string, dto: UpdateFootprintDto) {
    const existing = await this.prisma.aboutFootprint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('足迹记录不存在');
    const data: any = {};
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.place !== undefined) data.place = dto.place;
    if (dto.time !== undefined) data.time = dto.time;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.elevation !== undefined) data.elevation = dto.elevation;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    const updated = await this.prisma.aboutFootprint.update({ where: { id }, data });
    await this.trainingService.invalidateIfTrained('about_footprint', id);
    return updated;
  }

  async removeFootprint(id: string) {
    const existing = await this.prisma.aboutFootprint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('足迹记录不存在');
    await this.trainingService.invalidateByRef('about_footprint', id);
    await this.prisma.aboutFootprint.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Travels ====================

  async findTravels() {
    return this.prisma.aboutTravel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createTravel(dto: CreateTravelDto) {
    return this.prisma.aboutTravel.create({
      data: {
        glyph: dto.glyph,
        place: dto.place,
        meta: dto.meta,
        note: dto.note,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateTravel(id: string, dto: UpdateTravelDto) {
    const existing = await this.prisma.aboutTravel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('旅行记录不存在');
    const data: any = {};
    if (dto.glyph !== undefined) data.glyph = dto.glyph;
    if (dto.place !== undefined) data.place = dto.place;
    if (dto.meta !== undefined) data.meta = dto.meta;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    const updated = await this.prisma.aboutTravel.update({ where: { id }, data });
    await this.trainingService.invalidateIfTrained('about_travel', id);
    return updated;
  }

  async removeTravel(id: string) {
    const existing = await this.prisma.aboutTravel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('旅行记录不存在');
    await this.trainingService.invalidateByRef('about_travel', id);
    await this.prisma.aboutTravel.delete({ where: { id } });
    return { success: true };
  }

  // ==================== Events ====================

  async findEvents() {
    const list = await this.prisma.aboutEvent.findMany({
      orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }, { createdAt: 'asc' }],
    });
    return list.map((e) => ({ ...e, date: toDateStr(e.date) }));
  }

  async createEvent(dto: CreateEventDto) {
    const created = await this.prisma.aboutEvent.create({
      data: {
        date: parseDateStr(dto.date),
        title: dto.title,
        desc: dto.desc,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { ...created, date: toDateStr(created.date) };
  }

  async updateEvent(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.aboutEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('事件记录不存在');
    const data: any = {};
    if (dto.date !== undefined) data.date = parseDateStr(dto.date);
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.desc !== undefined) data.desc = dto.desc;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    const updated = await this.prisma.aboutEvent.update({ where: { id }, data });
    await this.trainingService.invalidateIfTrained('about_event', id);
    return { ...updated, date: toDateStr(updated.date) };
  }

  async removeEvent(id: string) {
    const existing = await this.prisma.aboutEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('事件记录不存在');
    await this.trainingService.invalidateByRef('about_event', id);
    await this.prisma.aboutEvent.delete({ where: { id } });
    return { success: true };
  }
}
