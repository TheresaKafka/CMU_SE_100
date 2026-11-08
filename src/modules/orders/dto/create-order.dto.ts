import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from './order.enums.js';

export enum OrderTypeDto {
  DINE_IN = 'DINE_IN',
  TAKE_AWAY = 'TAKE_AWAY',
}

export class OrderItemModifierDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã giá trị tùy chọn (optionValueId)',
  })
  @IsUUID('all', { message: 'Mã tùy chọn (optionValueId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã tùy chọn không được để trống' })
  optionValueId!: string;
}

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Mã sản phẩm (productId)',
  })
  @IsUUID('all', { message: 'Mã món (productId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã món không được để trống' })
  productId!: string;

  @ApiProperty({ example: 2, description: 'Số lượng món' })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity!: number;

  @ApiPropertyOptional({
    type: [OrderItemModifierDto],
    description: 'Danh sách các tùy biến đã chọn (Size, Đường, Đá, Sữa, Topping)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemModifierDto)
  modifiers?: OrderItemModifierDto[];
}

export class CreateOrderDto {
  @ApiProperty({
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    description: 'Mã ca làm việc đang mở (shiftId) của thu ngân',
  })
  @IsUUID('all', { message: 'Mã ca làm việc (shiftId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã ca làm việc không được để trống' })
  shiftId!: string;

  @ApiPropertyOptional({
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    description: 'Mã bàn phục vụ (tableId) nếu khách dùng tại quán (Dine-in)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Mã bàn (tableId) phải là UUID hợp lệ' })
  tableId?: string;

  @ApiPropertyOptional({
    enum: OrderTypeDto,
    example: OrderTypeDto.DINE_IN,
    description: 'Loại hình phục vụ (DINE_IN: tại chỗ, TAKE_AWAY: mang đi)',
  })
  @IsOptional()
  @IsEnum(OrderTypeDto, { message: 'orderType phải là DINE_IN hoặc TAKE_AWAY' })
  orderType?: OrderTypeDto;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'Danh sách các món đặt trong đơn hàng',
  })
  @IsArray({ message: 'Danh sách món (items) phải là một mảng' })
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất 1 món' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description: 'Phương thức thanh toán ngay (nếu có: CASH, QR, CARD)',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là CASH, QR hoặc CARD',
  })
  paymentMethod?: PaymentMethod;
}
