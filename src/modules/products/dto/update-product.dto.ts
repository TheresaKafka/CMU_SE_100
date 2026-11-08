import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsOptional()
  @IsUUID('all', { message: 'Mã danh mục phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Caramel Macchiato Đặc Biệt' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 69000 })
  @IsOptional()
  @IsNumber({}, { message: 'Giá cơ bản phải là số' })
  @Min(0, { message: 'Giá cơ bản không được âm' })
  basePrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
