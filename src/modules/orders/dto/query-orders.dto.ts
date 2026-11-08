import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { OrderStatus } from './order.enums.js';

export class QueryOrdersDto {
  @ApiPropertyOptional({ description: 'Lọc danh sách theo ca làm việc' })
  @IsOptional()
  @IsUUID('all', { message: 'Mã ca làm việc (shiftId) phải là UUID hợp lệ' })
  shiftId?: string;

  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Lọc theo trạng thái đơn hàng (PENDING, PAID, PROCESSING, COMPLETED, CANCELLED)',
  })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn hàng phải là PENDING, PAID, PROCESSING, COMPLETED hoặc CANCELLED',
  })
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 20, description: 'Số lượng bản ghi tối đa' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
