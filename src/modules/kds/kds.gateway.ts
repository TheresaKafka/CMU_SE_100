import {
  Logger,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { KdsOrderEvent } from './interfaces/kds-order-event.interface.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/kds',
})
export class KdsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KdsGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  afterInit() {
    this.logger.log('KDS WebSocket Gateway khởi tạo thành công (Namespace: /kds)');
  }

  handleConnection(client: Socket) {
    this.logger.log(`KDS Màn hình bếp/bar đã kết nối: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS Màn hình bếp/bar đã ngắt kết nối: ${client.id}`);
  }

  /**
   * Bắn sự kiện real-time xuống toàn bộ các màn hình KDS khi có đơn hàng mới
   */
  emitOrderCreated(orderData: KdsOrderEvent): void {
    if (!this.server) {
      this.logger.warn('WebSocket Server chưa sẵn sàng để emit order.created');
      return;
    }

    this.logger.log(`Phát sóng sự kiện order.created cho Đơn hàng #${orderData.orderId.slice(0, 8)}`);
    // Bắn cả order.created và order:new để các frontend client dễ dàng bắt sự kiện
    this.server.emit('order.created', orderData);
    this.server.emit('order:new', orderData);
  }

  /**
   * Bắn sự kiện real-time xuống toàn bộ KDS và POS khi đơn hàng thanh toán thành công (tiền mặt hoặc SePay QR)
   */
  emitOrderPaid(payload: {
    orderId: string;
    status: string;
    paymentMethod: string;
    paidAt: string;
  }): void {
    if (!this.server) {
      this.logger.warn('WebSocket Server chưa sẵn sàng để emit order.paid');
      return;
    }

    this.logger.log(
      `Phát sóng sự kiện order.paid cho Đơn hàng #${payload.orderId.slice(0, 8)} (${payload.paymentMethod})`,
    );
    this.server.emit('order.paid', payload);
    this.server.emit('order.status-updated', {
      orderId: payload.orderId,
      status: payload.status,
      paymentMethod: payload.paymentMethod,
      updatedAt: payload.paidAt,
    });
  }

  /**
   * Barista nhấn cập nhật trạng thái chế biến món (Đang làm -> Hoàn thành)
   */
  @SubscribeMessage('order.update-status')
  async handleUpdateStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string; status: 'PROCESSING' | 'COMPLETED' },
  ) {
    this.logger.log(
      `KDS ${client.id} yêu cầu đổi trạng thái đơn ${payload.orderId} -> ${payload.status}`,
    );

    const order = await this.prisma.orm.public.Order
      .where({ id: payload.orderId })
      .first();

    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    await this.prisma.orm.public.Order
      .where({ id: payload.orderId })
      .update({
        status: payload.status,
        updatedAt: new Date(),
      });

    const updateEvent = {
      orderId: payload.orderId,
      status: payload.status,
      updatedAt: new Date().toISOString(),
    };

    // Broadcast tới toàn bộ KDS và POS
    this.server.emit('order.status-updated', updateEvent);

    return { success: true, data: updateEvent };
  }
}

