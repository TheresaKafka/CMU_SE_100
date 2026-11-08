import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { KdsGateway } from '../kds/kds.gateway.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { OrderStatus, PaymentMethod } from '../orders/dto/order.enums.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly kdsGateway: KdsGateway,
  ) {}

  /**
   * Tạo thông tin mã QR VietQR / SePay động cho đơn hàng POS (POS-04)
   * Khách hàng quét mã này trên màn hình phụ POS để thanh toán chuyển khoản ngân hàng.
   */
  async generateOrderQr(orderId: string) {
    const order = await this.prisma.orm.public.Order
      .where({ id: orderId })
      .include('table', (t) => t.include('area'))
      .first();

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng chỉ định');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Đơn hàng đang ở trạng thái "${order.status}", chỉ có thể tạo mã thanh toán cho đơn PENDING`,
      );
    }

    const amount = Math.round(Number(order.totalAmount));
    const bank = this.configService.get<string>('SEPAY_BANK') || 'MBBank';
    const accountNumber = this.configService.get<string>('SEPAY_ACC_NUMBER') || '0388999999';

    // Mã nhận diện đơn hàng duy nhất đưa vào nội dung chuyển khoản: DH + 8 ký tự đầu của UUID
    const cleanId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const description = `DH${cleanId}`;

    // Link tạo ảnh VietQR động chuẩn SePay
    const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(accountNumber)}&bank=${encodeURIComponent(bank)}&amount=${amount}&des=${encodeURIComponent(description)}&template=compact`;

    return {
      orderId: order.id,
      orderCode: description,
      amount,
      bank,
      accountNumber,
      accountName: 'QUAN CAFE POS',
      description,
      qrUrl,
      table: order.table
        ? `${order.table.area.name} - Bàn ${order.table.tableNumber}`
        : 'Mang đi (Take-away)',
      paymentStatus: 'WAITING_FOR_PAYMENT',
    };
  }

  /**
   * Xử lý Webhook IPN (Instant Payment Notification) từ cổng thanh toán SePay.
   * Khi tiền vào tài khoản ngân hàng:
   * 1. Bóc tách mã đơn hàng từ `dto.code` hoặc `dto.content`.
   * 2. Kiểm tra số tiền chuyển khớp hoặc lớn hơn `totalAmount`.
   * 3. Thực thi Database Transaction ACID:
   *    - Cập nhật Order -> PAID (paymentMethod = 'QR').
   *    - Tự động trừ kho nguyên liệu theo định mức BOM (INV-03).
   *    - Giải phóng bàn nếu khách ngồi tại chỗ.
   * 4. Bắn sự kiện WebSockets real-time `order.paid` xuống KDS và POS màn hình thu ngân.
   */
  async processSepayWebhook(dto: SepayWebhookDto, authHeader?: string) {
    this.logger.log(
      `Nhận webhook SePay IPN #${dto.id} | Số tiền: ${dto.transferAmount}đ | Nội dung: "${dto.content}" | Loại: ${dto.transferType}`,
    );

    // Xác thực API Key nếu được cấu hình
    const configuredApiKey = this.configService.get<string>('SEPAY_API_KEY');
    if (configuredApiKey && authHeader) {
      const cleanHeader = authHeader.replace(/^Apikey\s+/i, '').trim();
      if (cleanHeader !== configuredApiKey) {
        this.logger.warn(`Cảnh báo: Authorization header SePay không khớp với SEPAY_API_KEY cấu hình`);
      }
    }

    // Chỉ xử lý giao dịch tiền vào (in)
    if (dto.transferType !== 'in') {
      this.logger.log(`Bỏ qua giao dịch SePay #${dto.id} vì không phải tiền vào (transferType: ${dto.transferType})`);
      return {
        success: true,
        message: 'Bỏ qua giao dịch tiền ra (out)',
      };
    }

    // 1. Trích xuất mã đơn hàng
    let codeCandidate: string | null = null;

    if (dto.code) {
      codeCandidate = dto.code.replace(/^(DH|CF|ORDER)/i, '').trim();
    }

    if (!codeCandidate) {
      const match =
        dto.content.match(/(?:DH|CF|ORDER)([a-fA-F0-9]{6,32})/i) ||
        dto.content.match(/(?:DH|CF|ORDER)([a-zA-Z0-9]+)/i);
      if (match) {
        codeCandidate = match[1];
      }
    }

    // Kiểm tra nếu nội dung chứa UUID hoàn chỉnh
    const uuidMatch = dto.content.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );

    // 2. Tra cứu đơn hàng
    let order: any = null;

    if (uuidMatch) {
      order = await this.prisma.orm.public.Order
        .where({ id: uuidMatch[0] })
        .first();
    }

    if (!order && codeCandidate) {
      const pendingOrders = await this.prisma.orm.public.Order
        .where({ status: OrderStatus.PENDING })
        .all();

      const candidateClean = codeCandidate.toLowerCase();
      order = pendingOrders.find((o) => {
        const idClean = o.id.replace(/-/g, '').toLowerCase();
        return idClean.startsWith(candidateClean) || dto.content.toLowerCase().includes(idClean.slice(0, 8));
      });
    }

    // Kiểm tra tính Idempotent (Nếu đơn hàng đã được thanh toán từ trước)
    if (!order && codeCandidate) {
      const paidOrders = await this.prisma.orm.public.Order
        .where({ status: OrderStatus.PAID })
        .limit(20)
        .all();

      const candidateClean = codeCandidate.toLowerCase();
      const alreadyPaid = paidOrders.find((o) => {
        const idClean = o.id.replace(/-/g, '').toLowerCase();
        return idClean.startsWith(candidateClean) || dto.content.toLowerCase().includes(idClean.slice(0, 8));
      });

      if (alreadyPaid) {
        this.logger.log(`Giao dịch SePay #${dto.id} đã được xử lý thành công trước đó (Idempotent) cho đơn ${alreadyPaid.id}`);
        return {
          success: true,
          message: 'Đơn hàng đã được thanh toán trước đó (idempotent)',
          orderId: alreadyPaid.id,
        };
      }
    }

    if (!order) {
      this.logger.warn(
        `Không tìm thấy đơn hàng PENDING khớp với nội dung chuyển khoản "${dto.content}" (Code: ${dto.code})`,
      );
      return {
        success: false,
        message: `Không tìm thấy đơn hàng PENDING tương ứng với nội dung "${dto.content}"`,
      };
    }

    // 3. Kiểm tra số tiền thanh toán
    const expectedAmount = Math.round(Number(order.totalAmount));
    if (dto.transferAmount < expectedAmount) {
      this.logger.warn(
        `Số tiền khách chuyển (${dto.transferAmount}đ) không đủ so với hóa đơn #${order.id} (${expectedAmount}đ)`,
      );
      return {
        success: false,
        message: `Số tiền thanh toán ${dto.transferAmount}đ không đủ cho đơn hàng ${expectedAmount}đ`,
      };
    }

    // 4. Thực thi Database Transaction ACID
    await this.prisma.transaction(async (tx) => {
      // Cập nhật trạng thái đơn hàng sang PAID
      await tx.orm.public.Order
        .where({ id: order.id })
        .update({
          status: OrderStatus.PAID,
          paymentMethod: PaymentMethod.QR,
          updatedAt: new Date(),
        });

      // Tự động trừ kho nguyên liệu theo định mức BOM (INV-03)
      await this.inventoryService.deductInventoryForOrder(order.id, tx);

      // Giải phóng bàn nếu không còn đơn PENDING nào khác của bàn đó
      if (order.tableId) {
        const remainingPending = await tx.orm.public.Order
          .where({ tableId: order.tableId, status: OrderStatus.PENDING })
          .all();

        if (remainingPending.length === 0) {
          await tx.orm.public.Table
            .where({ id: order.tableId })
            .update({ status: 'EMPTY' });
        }
      }
    });

    const paidAt = new Date().toISOString();

    // 5. Bắn sự kiện WebSockets real-time thông báo cho KDS & POS
    this.kdsGateway.emitOrderPaid({
      orderId: order.id,
      status: OrderStatus.PAID,
      paymentMethod: PaymentMethod.QR,
      paidAt,
    });

    this.logger.log(
      `Xử lý thanh toán QR SePay thành công đơn hàng #${order.id.slice(0, 8)} (${dto.transferAmount}đ)`,
    );

    return {
      success: true,
      message: 'Xác nhận thanh toán SePay thành công và đã tự động khấu trừ kho',
      orderId: order.id,
      paidAt,
    };
  }

  /**
   * Tra cứu trạng thái thanh toán của đơn hàng (dành cho POS polling fallback khi mất kết nối socket)
   */
  async checkPaymentStatus(orderId: string) {
    const order = await this.prisma.orm.public.Order
      .where({ id: orderId })
      .first();

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      totalAmount: Number(order.totalAmount),
      isPaid: order.status === OrderStatus.PAID,
      updatedAt: order.updatedAt,
    };
  }
}

