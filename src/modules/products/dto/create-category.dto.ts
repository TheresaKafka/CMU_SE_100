import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Cà phê truyền thống & Espresso', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  name!: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã danh mục cha (để tạo menu phân cấp nếu có)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Mã danh mục cha (parentId) phải là UUID hợp lệ' })
  parentId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự sắp xếp hiển thị trên POS/App' })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  sortOrder?: number;
}
