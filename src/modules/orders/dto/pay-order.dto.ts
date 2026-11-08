import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from './order.enums.js';

export class PayOrderDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.QR,
    description: 'Phương thức thanh toán cho đơn hàng (CASH, QR, CARD)',
  })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là CASH, QR hoặc CARD',
  })
  paymentMethod!: PaymentMethod;
}
