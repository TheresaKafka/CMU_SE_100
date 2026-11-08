import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { TransferTableDto } from './dto/transfer-table.dto.js';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTables(areaId?: string) {
    let collection = this.prisma.orm.public.Table
      .include('area')
      .include('orders', (orders) => orders.where({ status: 'PENDING' }))
      .orderBy((t) => t.tableNumber.asc());

    if (areaId) {
      collection = collection.where({ areaId });
    }

    const tables = await collection.all();

    return tables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      status: t.status,
      area: {
        id: t.area.id,
        name: t.area.name,
      },
      currentPendingOrders: t.orders.map((o) => ({
        id: o.id,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
      })),
    }));
  }

  async getTableById(id: string) {
    const table = await this.prisma.orm.public.Table
      .where({ id })
      .include('area')
      .include('orders', (orders) => orders.where({ status: 'PENDING' }))
      .first();

    if (!table) {
      throw new NotFoundException('Không tìm thấy thông tin bàn');
    }

    return {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      area: {
        id: table.area.id,
        name: table.area.name,
      },
      currentPendingOrders: table.orders.map((o) => ({
        id: o.id,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
      })),
    };
  }

  async createTable(dto: CreateTableDto) {
    const area = await this.prisma.orm.public.Area.where({ id: dto.areaId }).first();
    if (!area) {
      throw new NotFoundException('Không tìm thấy khu vực chỉ định');
    }

    const existing = await this.prisma.orm.public.Table
      .where({ areaId: dto.areaId, tableNumber: dto.tableNumber })
      .first();

    if (existing) {
      throw new ConflictException(
        `Bàn số "${dto.tableNumber}" đã tồn tại trong khu vực "${area.name}"`,
      );
    }

    const table = await this.prisma.orm.public.Table.create({
      areaId: dto.areaId,
      tableNumber: dto.tableNumber,
      capacity: dto.capacity ?? 4,
      status: 'EMPTY',
    });

    return {
      message: 'Tạo bàn thành công',
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        areaId: table.areaId,
      },
    };
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    const table = await this.prisma.orm.public.Table.where({ id }).first();
    if (!table) {
      throw new NotFoundException('Không tìm thấy thông tin bàn');
    }

    const updates: {
      areaId?: string;
      tableNumber?: string;
      capacity?: number;
      status?: 'EMPTY' | 'OCCUPIED' | 'RESERVED';
    } = {};

    if (dto.areaId !== undefined) updates.areaId = dto.areaId;
    if (dto.tableNumber !== undefined) updates.tableNumber = dto.tableNumber;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
    if (dto.status !== undefined) updates.status = dto.status;

    await this.prisma.orm.public.Table.where({ id }).update(updates);

    return {
      message: 'Cập nhật thông tin bàn thành công',
      tableId: id,
    };
  }

  async deleteTable(id: string) {
    const table = await this.prisma.orm.public.Table.where({ id }).first();
    if (!table) {
      throw new NotFoundException('Không tìm thấy bàn cần xóa');
    }

    if (table.status === 'OCCUPIED') {
      throw new BadRequestException('Không thể xóa bàn đang có khách ngồi phục vụ');
    }

    await this.prisma.orm.public.Table.where({ id }).delete();

    return {
      message: 'Xóa bàn thành công',
      tableId: id,
    };
  }

  /**
   * Chuyển bàn / Gộp bàn (Dine-in Table Transfer) với DB Transaction
   */
  async transferTable(dto: TransferTableDto) {
    if (dto.sourceTableId === dto.targetTableId) {
      throw new BadRequestException('Bàn nguồn và bàn đích không được trùng nhau');
    }

    return this.prisma.transaction(async (tx) => {
      const source = await tx.orm.public.Table.where({ id: dto.sourceTableId }).first();
      const target = await tx.orm.public.Table.where({ id: dto.targetTableId }).first();

      if (!source || !target) {
        throw new NotFoundException('Bàn nguồn hoặc bàn đích không tồn tại');
      }

      if (source.status === 'EMPTY') {
        throw new BadRequestException(`Bàn nguồn (${source.tableNumber}) hiện đang trống, không có đơn để chuyển`);
      }

      // Tìm tất cả đơn PENDING của bàn nguồn
      const pendingOrders = await tx.orm.public.Order
        .where({ tableId: source.id, status: 'PENDING' })
        .all();

      for (const order of pendingOrders) {
        await tx.orm.public.Order
          .where({ id: order.id })
          .update({ tableId: target.id });
      }

      // Cập nhật trạng thái 2 bàn
      await tx.orm.public.Table.where({ id: target.id }).update({ status: 'OCCUPIED' });
      await tx.orm.public.Table.where({ id: source.id }).update({ status: 'EMPTY' });

      return {
        message: `Đã chuyển đơn từ Bàn ${source.tableNumber} sang Bàn ${target.tableNumber} thành công`,
        sourceTable: { id: source.id, tableNumber: source.tableNumber, status: 'EMPTY' },
        targetTable: { id: target.id, tableNumber: target.tableNumber, status: 'OCCUPIED' },
        transferredOrdersCount: pendingOrders.length,
      };
    });
  }
}
