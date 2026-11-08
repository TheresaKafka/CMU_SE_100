import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const areas = await this.prisma.orm.public.Area
      .include('tables', (tables) => tables.orderBy((t) => t.tableNumber.asc()))
      .orderBy((a) => a.sortOrder.asc())
      .all();

    return areas.map((a) => ({
      id: a.id,
      name: a.name,
      sortOrder: a.sortOrder,
      tableCount: a.tables.length,
      tables: a.tables.map((t) => ({
        id: t.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: t.status,
      })),
    }));
  }

  async findOne(id: string) {
    const area = await this.prisma.orm.public.Area
      .where({ id })
      .include('tables', (tables) => tables.orderBy((t) => t.tableNumber.asc()))
      .first();

    if (!area) {
      throw new NotFoundException('Không tìm thấy thông tin khu vực');
    }

    return {
      id: area.id,
      name: area.name,
      sortOrder: area.sortOrder,
      tableCount: area.tables.length,
      tables: area.tables.map((t) => ({
        id: t.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        status: t.status,
      })),
    };
  }

  async create(dto: CreateAreaDto) {
    const existing = await this.prisma.orm.public.Area
      .where({ name: dto.name })
      .first();

    if (existing) {
      throw new ConflictException(`Khu vực mang tên "${dto.name}" đã tồn tại`);
    }

    const area = await this.prisma.orm.public.Area.create({
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
    });

    return {
      message: 'Tạo khu vực thành công',
      area: {
        id: area.id,
        name: area.name,
        sortOrder: area.sortOrder,
      },
    };
  }

  async update(id: string, dto: UpdateAreaDto) {
    const area = await this.prisma.orm.public.Area.where({ id }).first();
    if (!area) {
      throw new NotFoundException('Không tìm thấy thông tin khu vực');
    }

    if (dto.name && dto.name !== area.name) {
      const duplicate = await this.prisma.orm.public.Area
        .where({ name: dto.name })
        .first();

      if (duplicate) {
        throw new ConflictException(`Khu vực mang tên "${dto.name}" đã tồn tại`);
      }
    }

    const updates: { name?: string; sortOrder?: number } = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;

    await this.prisma.orm.public.Area.where({ id }).update(updates);

    return {
      message: 'Cập nhật khu vực thành công',
      areaId: id,
    };
  }

  async remove(id: string) {
    const area = await this.prisma.orm.public.Area
      .where({ id })
      .include('tables')
      .first();

    if (!area) {
      throw new NotFoundException('Không tìm thấy khu vực cần xóa');
    }

    if (area.tables.length > 0) {
      throw new BadRequestException(
        `Không thể xóa khu vực "${area.name}" vì vẫn còn ${area.tables.length} bàn trực thuộc. Vui lòng xóa hoặc di dời các bàn trước.`,
      );
    }

    await this.prisma.orm.public.Area.where({ id }).delete();

    return {
      message: 'Xóa khu vực thành công',
      areaId: id,
    };
  }
}

