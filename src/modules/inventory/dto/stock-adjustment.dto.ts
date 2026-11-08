import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export enum InventoryLogTypeDto {
  ORDER_USAGE = 'ORDER_USAGE',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  WASTE = 'WASTE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class StockAdjustmentDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã nguyên vật liệu cần điều chỉnh / nhập kho',
  })
  @IsUUID('all', { message: 'Mã nguyên liệu phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã nguyên liệu không được để trống' })
  ingredientId!: string;

  @ApiProperty({
    example: 5000,
    description: 'Số lượng thay đổi (dương là nhập kho, âm là hao hụt/hỏng hóc)',
  })
  @IsNumber({}, { message: 'Số lượng thay đổi phải là số' })
  changeAmount!: number;

  @ApiProperty({
    enum: InventoryLogTypeDto,
    example: InventoryLogTypeDto.PURCHASE_RECEIPT,
    description: 'Loại biến động tồn kho (PURCHASE_RECEIPT: nhập hàng, WASTE: hao hụt, ADJUSTMENT: kiểm kê)',
  })
  @IsEnum(InventoryLogTypeDto, {
    message: 'Loại biến động phải là PURCHASE_RECEIPT, WASTE hoặc ADJUSTMENT',
  })
  type!: InventoryLogTypeDto;

  @ApiPropertyOptional({
    example: 'Nhập hàng lô cà phê mới từ nhà cung cấp Đắk Lắk',
    description: 'Lý do hoặc số hóa đơn nhập hàng',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

