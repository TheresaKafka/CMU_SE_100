import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Hạt Cà Phê Robusta & Arabica Blend', description: 'Tên nguyên vật liệu' })
  @IsString()
  @IsNotEmpty({ message: 'Tên nguyên liệu không được để trống' })
  name!: string;

  @ApiProperty({ example: 'gram', description: 'Đơn vị tính (ml, gram, cái, lon, túi)' })
  @IsString()
  @IsNotEmpty({ message: 'Đơn vị tính không được để trống' })
  unit!: string;

  @ApiPropertyOptional({ example: 10000, description: 'Số lượng tồn kho ban đầu' })
  @IsOptional()
  @IsNumber({}, { message: 'Tồn kho ban đầu phải là số' })
  @Min(0, { message: 'Tồn kho ban đầu không được âm' })
  currentStock?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Ngưỡng tồn kho an toàn để cảnh báo nhập hàng' })
  @IsOptional()
  @IsNumber({}, { message: 'Ngưỡng an toàn phải là số' })
  @Min(0, { message: 'Ngưỡng an toàn không được âm' })
  safetyStock?: number;

  @ApiPropertyOptional({ example: 250, description: 'Đơn giá vốn trên một đơn vị (VNĐ)' })
  @IsOptional()
  @IsNumber({}, { message: 'Đơn giá vốn phải là số' })
  @Min(0, { message: 'Đơn giá vốn không được âm' })
  costPrice?: number;
}

