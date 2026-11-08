import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('Payments & QR')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({
    summary: 'Webhook nhận IPN từ SePay (Tự động xác nhận thanh toán & trừ kho BOM)',
    description:
      'Endpoint công khai tiếp nhận thông báo biến động số dư tức thời từ SePay khi khách quét VietQR thành công.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xác nhận xử lý thành công IPN từ SePay',
    schema: {
      example: {
        success: true,
        message: 'Xác nhận thanh toán SePay thành công và đã tự động khấu trừ kho',
        orderId: 'c7438c7f-9f7a-4c28-97c2-9ce83d5a0c3d',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Post('sepay-webhook')
  async handleSepayWebhook(
    @Body() dto: SepayWebhookDto,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.paymentsService.processSepayWebhook(dto, authHeader);
  }

  @ApiOperation({
    summary: 'Kiểm tra trạng thái thanh toán của đơn hàng (POS Polling Fallback)',
  })
  @ApiResponse({ status: 200, description: 'Trạng thái thanh toán của đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/status')
  async getPaymentStatus(@Param('id') orderId: string) {
    return this.paymentsService.checkPaymentStatus(orderId);
  }
}

