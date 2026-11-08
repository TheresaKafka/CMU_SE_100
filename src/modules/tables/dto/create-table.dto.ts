import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTableDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã khu vực (areaId)',
  })
  @IsUUID('all', { message: 'Mã khu vực (areaId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã khu vực không được để trống' })
  areaId!: string;

  @ApiProperty({ example: 'B01', description: 'Số hiệu hoặc tên bàn' })
  @IsString()
  @IsNotEmpty({ message: 'Số hiệu bàn không được để trống' })
  tableNumber!: string;

  @ApiPropertyOptional({ example: 4, description: 'Sức chứa số chỗ ngồi của bàn' })
  @IsOptional()
  @IsInt({ message: 'Sức chứa phải là số nguyên' })
  @Min(1, { message: 'Sức chứa tối thiểu là 1 người' })
  capacity?: number;
}

