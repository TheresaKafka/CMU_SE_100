import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { QueryOrdersDto } from './dto/query-orders.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @ApiOperation({
    summary: 'Tạo mã QR SePay / VietQR động cho đơn hàng (POS-04 - Quyền: Cashier, Admin)',
    description: 'Tạo mã QR thanh toán kèm mã chuyển khoản duy nhất cho khách quét tại quầy POS',
  })
  @ApiResponse({ status: 200, description: 'Tạo mã QR thành công kèm URL VietQR' })
  @ApiResponse({ status: 400, description: 'Đơn hàng không ở trạng thái PENDING' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':id/generate-qr')
  async generateQr(@Param('id') orderId: string) {
    return this.paymentsService.generateOrderQr(orderId);
  }

  @ApiOperation({
    summary: 'Tạo đơn hàng POS nguyên tử (DB Transaction ACID - Quyền: Cashier, Admin)',
  })
  @ApiResponse({ status: 201, description: 'Đơn hàng tạo thành công' })
  @ApiResponse({ status: 400, description: 'Ca làm việc đã đóng hoặc tùy chọn modifier không hợp lệ' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @Post()
  async createOrder(
    @CurrentUser('id') cashierId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(cashierId, dto);
  }

  @ApiOperation({
    summary: 'Thanh toán đơn hàng PENDING (DB Transaction ACID - Quyền: Cashier, Admin)',
  })
  @ApiResponse({ status: 200, description: 'Thanh toán đơn hàng thành công, đổi sang PAID' })
  @ApiResponse({ status: 400, description: 'Đơn hàng không ở trạng thái PENDING' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post(':id/pay')
  async payOrder(
    @Param('id') orderId: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.ordersService.payOrder(orderId, dto);
  }

  @ApiOperation({ summary: 'Hủy đơn hàng (Quyền: Cashier, Admin, Manager)' })
  @ApiResponse({ status: 200, description: 'Hủy đơn thành công, đổi sang CANCELLED' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  async cancelOrder(@Param('id') orderId: string) {
    return this.ordersService.cancelOrder(orderId);
  }

  @ApiOperation({ summary: 'Báo cáo doanh thu & KPI bán hàng cho HQ Dashboard' })
  @ApiResponse({ status: 200, description: 'Dữ liệu tổng quan doanh thu, tiền mặt, QR và top món bán chạy' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @Get('analytics/summary')
  async getOrderAnalytics() {
    return this.ordersService.getOrderAnalytics();
  }

  @ApiOperation({ summary: 'Xem chi tiết hóa đơn (in bill, in sticker ly, xem KDS)' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER, UserRole.BARISTA)
  @Get(':id')
  async getOrderById(@Param('id') orderId: string) {
    return this.ordersService.getOrderById(orderId);
  }

  @ApiOperation({ summary: 'Lấy danh sách các đơn hàng (lọc theo ca, trạng thái)' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng' })
  @Roles(UserRole.CASHIER, UserRole.ADMIN, UserRole.MANAGER)
  @Get()
  async getOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.getOrders(query);
  }
}
