import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

export interface ShiftSalesSummary {
  orderCount: number;
  cashRevenue: number;
  qrRevenue: number;
  cardRevenue: number;
  totalRevenue: number;
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async openShift(user: AuthenticatedUser, dto: OpenShiftDto) {
    const existingOpenShift = await this.prisma.orm.public.Shift
      .where({ cashierId: user.id, status: 'OPEN' })
      .first();

    if (existingOpenShift) {
      throw new BadRequestException(
        'Bạn đang có một ca làm việc chưa kết thúc. Vui lòng đóng ca hiện tại trước khi mở ca mới.',
      );
    }

    const startingCashFormatted = dto.startingCash.toFixed(2);

    const shift = await this.prisma.orm.public.Shift.create({
      cashierId: user.id,
      startingCash: startingCashFormatted,
      status: 'OPEN',
    });

    return {
      message: 'Mở ca làm việc thành công',
      shift: {
        id: shift.id,
        cashierId: shift.cashierId,
        cashierName: user.username,
        startTime: shift.startTime,
        startingCash: Number(shift.startingCash),
        status: shift.status,
      },
    };
  }

  async getCurrentShift(user: AuthenticatedUser) {
    const shift = await this.prisma.orm.public.Shift
      .where({ cashierId: user.id, status: 'OPEN' })
      .first();

    if (!shift) {
      return {
        message: 'Hiện tại bạn chưa mở ca làm việc',
        shift: null,
      };
    }

    const summary = await this.calculateShiftSales(shift.id);
    const startingCash = Number(shift.startingCash);
    const expectedCashInDrawer = startingCash + summary.cashRevenue;

    return {
      message: 'Lấy thông tin ca làm việc hiện tại thành công',
      shift: {
        id: shift.id,
        cashierId: shift.cashierId,
        cashierName: user.username,
        startTime: shift.startTime,
        startingCash,
        status: shift.status,
        salesSummary: summary,
        expectedCashInDrawer,
      },
    };
  }

  async closeShift(shiftId: string, user: AuthenticatedUser, dto: CloseShiftDto) {
    return this.prisma.transaction(async (tx) => {
      const shift = await tx.orm.public.Shift
        .where({ id: shiftId })
        .include('cashier')
        .first();

      if (!shift) {
        throw new NotFoundException('Không tìm thấy ca làm việc');
      }

      if (shift.status === 'CLOSED') {
        throw new BadRequestException('Ca làm việc này đã được đóng trước đó');
      }

      // Chỉ thu ngân của ca hoặc Quản lý/Admin mới có quyền đóng ca
      const isOwner = shift.cashierId === user.id;
      const isManager = user.roleName.toLowerCase().includes('admin') || user.roleName.toLowerCase().includes('manager');
      if (!isOwner && !isManager) {
        throw new ForbiddenException('Bạn không có quyền đóng ca làm việc này');
      }

      // Tổng hợp các đơn hàng đã thanh toán trong ca
      const orders = await tx.orm.public.Order
        .where({ shiftId, status: 'PAID' })
        .all();

      let cashRevenue = 0;
      let qrRevenue = 0;
      let cardRevenue = 0;
      let totalRevenue = 0;

      for (const order of orders) {
        const amount = Number(order.totalAmount);
        totalRevenue += amount;
        if (order.paymentMethod === 'CASH') {
          cashRevenue += amount;
        } else if (order.paymentMethod === 'QR') {
          qrRevenue += amount;
        } else if (order.paymentMethod === 'CARD') {
          cardRevenue += amount;
        }
      }

      const startingCash = Number(shift.startingCash);
      const expectedEndingCash = startingCash + cashRevenue;
      const discrepancy = dto.actualEndingCash - expectedEndingCash;

      const actualEndingCashFormatted = dto.actualEndingCash.toFixed(2);
      const endTime = new Date();

      await tx.orm.public.Shift
        .where({ id: shiftId })
        .update({
          actualEndingCash: actualEndingCashFormatted,
          endTime,
          status: 'CLOSED',
        });

      return {
        message: 'Đóng ca và đối soát tiền mặt thành công',
        audit: {
          shiftId: shift.id,
          cashierName: shift.cashier.username,
          startTime: shift.startTime,
          endTime,
          startingCash,
          actualEndingCash: dto.actualEndingCash,
          expectedEndingCash,
          discrepancy, // Chênh lệch (âm = thiếu tiền, dương = thừa tiền, 0 = khớp)
          salesSummary: {
            orderCount: orders.length,
            cashRevenue,
            qrRevenue,
            cardRevenue,
            totalRevenue,
          },
          notes: dto.notes ?? null,
        },
      };
    });
  }

  async getShiftById(shiftId: string) {
    const shift = await this.prisma.orm.public.Shift
      .where({ id: shiftId })
      .include('cashier')
      .first();

    if (!shift) {
      throw new NotFoundException('Không tìm thấy thông tin ca làm việc');
    }

    const summary = await this.calculateShiftSales(shiftId);
    const startingCash = Number(shift.startingCash);
    const actualEndingCash = shift.actualEndingCash ? Number(shift.actualEndingCash) : null;
    const expectedCashInDrawer = startingCash + summary.cashRevenue;
    const discrepancy = actualEndingCash !== null ? actualEndingCash - expectedCashInDrawer : null;

    return {
      id: shift.id,
      cashier: {
        id: shift.cashier.id,
        username: shift.cashier.username,
      },
      startTime: shift.startTime,
      endTime: shift.endTime,
      startingCash,
      actualEndingCash,
      expectedCashInDrawer,
      discrepancy,
      status: shift.status,
      salesSummary: summary,
    };
  }

  async getAllShifts(limit = 20) {
    const shifts = await this.prisma.orm.public.Shift
      .include('cashier')
      .orderBy((s) => s.startTime.desc())
      .limit(limit)
      .all();

    return shifts.map((s) => ({
      id: s.id,
      cashierUsername: s.cashier.username,
      startTime: s.startTime,
      endTime: s.endTime,
      startingCash: Number(s.startingCash),
      actualEndingCash: s.actualEndingCash ? Number(s.actualEndingCash) : null,
      status: s.status,
    }));
  }

  private async calculateShiftSales(shiftId: string): Promise<ShiftSalesSummary> {
    const orders = await this.prisma.orm.public.Order
      .where({ shiftId, status: 'PAID' })
      .all();

    let cashRevenue = 0;
    let qrRevenue = 0;
    let cardRevenue = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      const amount = Number(order.totalAmount);
      totalRevenue += amount;
      if (order.paymentMethod === 'CASH') {
        cashRevenue += amount;
      } else if (order.paymentMethod === 'QR') {
        qrRevenue += amount;
      } else if (order.paymentMethod === 'CARD') {
        cardRevenue += amount;
      }
    }

    return {
      orderCount: orders.length,
      cashRevenue,
      qrRevenue,
      cardRevenue,
      totalRevenue,
    };
  }
}
