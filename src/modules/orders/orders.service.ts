import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { KdsGateway } from '../kds/kds.gateway.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { OrderStatus } from './dto/order.enums.js';
import { KdsOrderEvent } from '../kds/interfaces/kds-order-event.interface.js';

interface CalculatedModifier {
  optionValueId: string;
  valueName: string;
  priceAdjustment: number;
}

interface CalculatedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: CalculatedModifier[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly kdsGateway: KdsGateway,
  ) {}

  /**
   * Tạo đơn hàng với Database Transaction ACID (INV-03) & Bắn WebSockets KDS (POS-02).
   * - Kiểm tra ca làm việc (Shift OPEN).
   * - Tự động đổi trạng thái bàn sang OCCUPIED nếu là đơn Dine-in tại bàn.
   * - Pricing engine tính toán giá gốc & modifier.
   * - Tự động trừ kho nguyên liệu (INV-03) nếu thanh toán ngay. Nếu thiếu nguyên liệu -> ROLLBACK toàn bộ!
   * - Bắn sự kiện real-time order.created xuống màn hình pha chế KDS.
   */
  async createOrder(cashierId: string, dto: CreateOrderDto) {
    let tableInfo: { tableNumber: string; areaName: string } | null = null;

    // 1. Thực thi Interactive Transaction
    const transactionResult = await this.prisma.transaction(async (tx) => {
      // 1.1. Kiểm tra ca làm việc
      const shift = await tx.orm.public.Shift
        .where({ id: dto.shiftId })
        .first();

      if (!shift) {
        throw new NotFoundException('Không tìm thấy ca làm việc (shiftId)');
      }

      if (shift.status !== 'OPEN') {
        throw new BadRequestException('Ca làm việc này đã đóng, không thể tạo thêm đơn hàng');
      }

      // 1.2. Kiểm tra bàn nếu khách ngồi tại chỗ (Dine-in)
      if (dto.tableId) {
        const table = await tx.orm.public.Table
          .where({ id: dto.tableId })
          .include('area')
          .first();

        if (!table) {
          throw new NotFoundException('Không tìm thấy bàn chỉ định');
        }

        tableInfo = {
          tableNumber: table.tableNumber,
          areaName: table.area.name,
        };

        // Đổi trạng thái bàn sang OCCUPIED
        await tx.orm.public.Table.where({ id: dto.tableId }).update({ status: 'OCCUPIED' });
      }

      // 1.3. Tính toán & Validate giá từng món dựa trên Database
      const calculatedItems: CalculatedOrderItem[] = [];
      let subtotal = 0;

      for (const itemDto of dto.items) {
        const product = await tx.orm.public.Product
          .where({ id: itemDto.productId })
          .include('options', (opts) => opts.include('values'))
          .first();

        if (!product) {
          throw new NotFoundException(`Không tìm thấy sản phẩm có mã: ${itemDto.productId}`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Sản phẩm "${product.name}" hiện đang tạm ngừng kinh doanh`);
        }

        const basePrice = Number(product.basePrice);
        const chosenModifiers: CalculatedModifier[] = [];
        const chosenValueIds = new Set((itemDto.modifiers ?? []).map((m) => m.optionValueId));

        // Kiểm tra ràng buộc Options: isRequired & maxChoices
        for (const option of product.options) {
          const selectedForThisOption = option.values.filter((v) => chosenValueIds.has(v.id));

          if (option.isRequired && selectedForThisOption.length === 0) {
            // Tự động gán tùy chọn mặc định (ưu tiên phụ thu 0đ hoặc lựa chọn đầu tiên) nếu client chưa chỉ định
            const defaultValue =
              option.values.find((v) => Number(v.priceAdjustment) === 0) ||
              option.values[0];

            if (defaultValue) {
              chosenModifiers.push({
                optionValueId: defaultValue.id,
                valueName: defaultValue.valueName,
                priceAdjustment: Number(defaultValue.priceAdjustment),
              });
              continue;
            }

            throw new BadRequestException(
              `Nhóm tùy chọn "${option.optionName}" của món "${product.name}" là bắt buộc chọn`,
            );
          }

          if (selectedForThisOption.length > option.maxChoices) {
            throw new BadRequestException(
              `Nhóm tùy chọn "${option.optionName}" của món "${product.name}" chỉ được chọn tối đa ${option.maxChoices} lựa chọn`,
            );
          }

          for (const selectedVal of selectedForThisOption) {
            chosenModifiers.push({
              optionValueId: selectedVal.id,
              valueName: selectedVal.valueName,
              priceAdjustment: Number(selectedVal.priceAdjustment),
            });
          }
        }

        const totalModifiersPrice = chosenModifiers.reduce(
          (sum, mod) => sum + mod.priceAdjustment,
          0,
        );

        const unitPrice = basePrice + totalModifiersPrice;
        const totalPrice = unitPrice * itemDto.quantity;
        subtotal += totalPrice;

        calculatedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice,
          modifiers: chosenModifiers,
        });
      }

      const totalAmount = subtotal;
      const initialStatus = dto.paymentMethod ? OrderStatus.PAID : OrderStatus.PENDING;

      // 1.4. Lưu Order + OrderItems + OrderItemModifiers
      const order = await tx.orm.public.Order.create({
        cashierId,
        shiftId: dto.shiftId,
        tableId: dto.tableId ?? null,
        orderType: dto.orderType ?? 'DINE_IN',
        status: initialStatus,
        paymentMethod: dto.paymentMethod ?? null,
        subtotal: subtotal.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      });

      for (const item of calculatedItems) {
        const orderItem = await tx.orm.public.OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        });

        for (const mod of item.modifiers) {
          await tx.orm.public.OrderItemModifier.create({
            orderItemId: orderItem.id,
            optionValueId: mod.optionValueId,
            priceAdjustment: mod.priceAdjustment.toFixed(2),
          });
        }
      }

      // 1.5. Nếu thanh toán ngay: Tự động trừ kho nguyên liệu BOM (INV-03)
      // Nếu bất kỳ nguyên liệu nào hết hàng / âm kho -> Ném lỗi và ROLLBACK 100%!
      if (initialStatus === OrderStatus.PAID) {
        await this.inventoryService.deductInventoryForOrder(order.id, tx);
      }

      return {
        order,
        items: calculatedItems,
        subtotal,
        totalAmount,
      };
    });

    const { order, items, subtotal, totalAmount } = transactionResult;

    // 2. Tích hợp WebSockets KDS (POS-02): Bắn sự kiện real-time xuống màn hình bếp/bar
    const kdsPayload: KdsOrderEvent = {
      orderId: order.id,
      shiftId: order.shiftId,
      orderType: order.orderType as 'DINE_IN' | 'TAKE_AWAY',
      tableNumber: tableInfo ? (tableInfo as { tableNumber: string }).tableNumber : null,
      areaName: tableInfo ? (tableInfo as { areaName: string }).areaName : null,
      status: order.status,
      totalAmount,
      createdAt: order.createdAt.toISOString(),
      items: items.map((item) => {
        const nameLower = item.productName.toLowerCase();
        let station: 'HOT_BAR' | 'COLD_BAR' | 'WARMING_STATION' | 'BAR' = 'BAR';

        if (nameLower.includes('bánh') || nameLower.includes('cake') || nameLower.includes('croissant')) {
          station = 'WARMING_STATION';
        } else if (nameLower.includes('đá') || nameLower.includes('trà') || nameLower.includes('freeze') || nameLower.includes('cold')) {
          station = 'COLD_BAR';
        } else if (nameLower.includes('nóng') || nameLower.includes('hot') || nameLower.includes('espresso')) {
          station = 'HOT_BAR';
        }

        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => ({
            name: m.valueName,
            priceAdjustment: m.priceAdjustment,
          })),
          station,
        };
      }),
    };

    this.kdsGateway.emitOrderCreated(kdsPayload);

    return {
      message: 'Tạo đơn hàng thành công và đã thông báo tới màn hình pha chế KDS',
      order: {
        id: order.id,
        shiftId: order.shiftId,
        tableId: order.tableId,
        orderType: order.orderType,
        status: order.status,
        paymentMethod: order.paymentMethod,
        subtotal,
        totalAmount,
        createdAt: order.createdAt,
        items,
      },
    };
  }

  /**
   * Thanh toán đơn hàng với Database Transaction
   * - Đổi trạng thái sang PAID.
   * - Tự động trừ kho nguyên liệu theo định mức BOM (INV-03). Nếu thiếu nguyên liệu -> ROLLBACK!
   * - Tự động giải phóng bàn về EMPTY nếu bàn không còn đơn PENDING nào khác.
   */
  async payOrder(orderId: string, dto: PayOrderDto) {
    const result = await this.prisma.transaction(async (tx) => {
      const order = await tx.orm.public.Order
        .where({ id: orderId })
        .first();

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể thanh toán đơn hàng đang ở trạng thái "${order.status}"`,
        );
      }

      await tx.orm.public.Order
        .where({ id: orderId })
        .update({
          status: OrderStatus.PAID,
          paymentMethod: dto.paymentMethod,
          updatedAt: new Date(),
        });

      // Tự động trừ kho nguyên liệu theo định mức BOM (INV-03)
      // Nếu thiếu nguyên liệu -> Throw exception -> Rollback toàn bộ giao dịch thanh toán!
      await this.inventoryService.deductInventoryForOrder(order.id, tx);

      // Giải phóng bàn nếu không còn đơn PENDING nào khác của bàn đó
      if (order.tableId) {
        const remainingPending = await tx.orm.public.Order
          .where({ tableId: order.tableId, status: 'PENDING' })
          .all();

        if (remainingPending.length === 0) {
          await tx.orm.public.Table
            .where({ id: order.tableId })
            .update({ status: 'EMPTY' });
        }
      }

      return {
        message: 'Thanh toán đơn hàng thành công và đã tự động khấu trừ tồn kho nguyên liệu',
        orderId,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.PAID,
        paidAt: new Date(),
      };
    });

    this.kdsGateway.emitOrderPaid({
      orderId: result.orderId,
      status: result.status,
      paymentMethod: result.paymentMethod,
      paidAt: result.paidAt.toISOString(),
    });

    return result;
  }

  async cancelOrder(orderId: string) {
    return this.prisma.transaction(async (tx) => {
      const order = await tx.orm.public.Order.where({ id: orderId }).first();
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Đơn hàng này đã bị hủy trước đó');
      }

      await tx.orm.public.Order
        .where({ id: orderId })
        .update({
          status: OrderStatus.CANCELLED,
          updatedAt: new Date(),
        });

      // Nếu đơn có gắn bàn, kiểm tra để giải phóng bàn
      if (order.tableId) {
        const remainingPending = await tx.orm.public.Order
          .where({ tableId: order.tableId, status: 'PENDING' })
          .all();

        if (remainingPending.length === 0) {
          await tx.orm.public.Table
            .where({ id: order.tableId })
            .update({ status: 'EMPTY' });
        }
      }

      return {
        message: 'Hủy đơn hàng thành công',
        orderId,
        status: OrderStatus.CANCELLED,
      };
    });
  }

  async getOrderById(orderId: string) {
    const order = await this.prisma.orm.public.Order
      .where({ id: orderId })
      .include('cashier')
      .include('table', (t) => t.include('area'))
      .include('items', (items) =>
        items
          .include('product')
          .include('modifiers', (mods) => mods.include('optionValue')),
      )
      .first();

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return {
      id: order.id,
      shiftId: order.shiftId,
      orderType: order.orderType,
      table: order.table
        ? {
            id: order.table.id,
            tableNumber: order.table.tableNumber,
            areaName: order.table.area.name,
          }
        : null,
      status: order.status,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      cashier: {
        id: order.cashier.id,
        username: order.cashier.username,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        modifiers: item.modifiers.map((m) => ({
          name: m.optionValue.valueName,
          priceAdjustment: Number(m.priceAdjustment),
        })),
      })),
    };
  }

  async getOrders(query: QueryOrdersDto) {
    let collection = this.prisma.orm.public.Order
      .include('cashier')
      .include('table')
      .include('items', (items) => items.include('product'))
      .orderBy((o) => o.createdAt.desc());

    if (query.shiftId) {
      collection = collection.where({ shiftId: query.shiftId });
    }

    if (query.status) {
      collection = collection.where({ status: query.status });
    }

    const limit = query.limit ?? 20;
    collection = collection.limit(limit);

    const orders = await collection.all();

    return orders.map((o) => ({
      id: o.id,
      shiftId: o.shiftId,
      orderType: o.orderType,
      tableNumber: o.table ? o.table.tableNumber : null,
      cashierUsername: o.cashier.username,
      status: o.status,
      paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal),
      totalAmount: Number(o.totalAmount),
      itemCount: o.items.reduce((acc, item) => acc + item.quantity, 0),
      createdAt: o.createdAt,
    }));
  }

  /**
   * Tổng hợp báo cáo doanh thu & phân tích dữ liệu bán hàng cho HQ Dashboard
   */
  async getOrderAnalytics() {
    const allOrders = await this.prisma.orm.public.Order
      .include('items', (items) => items.include('product'))
      .orderBy((o) => o.createdAt.desc())
      .limit(200)
      .all();

    let totalRevenue = 0;
    let cashRevenue = 0;
    let qrRevenue = 0;
    let cardRevenue = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of allOrders) {
      const amount = Number(order.totalAmount);

      if (order.status === 'PAID' || order.status === 'COMPLETED' || order.status === 'PROCESSING') {
        totalRevenue += amount;
        paidOrdersCount++;

        if (order.paymentMethod === 'CASH') {
          cashRevenue += amount;
        } else if (order.paymentMethod === 'QR') {
          qrRevenue += amount;
        } else if (order.paymentMethod === 'CARD') {
          cardRevenue += amount;
        }

        for (const item of order.items) {
          const itemTotal = Number(item.totalPrice);
          const existing = productSalesMap.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += itemTotal;
          } else {
            productSalesMap.set(item.productId, {
              name: item.product.name,
              quantity: item.quantity,
              revenue: itemTotal,
            });
          }
        }
      } else if (order.status === 'PENDING') {
        pendingOrdersCount++;
      } else if (order.status === 'CANCELLED') {
        cancelledOrdersCount++;
      }
    }

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalRevenue,
      cashRevenue,
      qrRevenue,
      cardRevenue,
      totalOrders: allOrders.length,
      paidOrdersCount,
      pendingOrdersCount,
      cancelledOrdersCount,
      topProducts,
    };
  }
}
