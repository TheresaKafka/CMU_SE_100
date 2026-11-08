import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOptionValueDto {
  @ApiProperty({ example: 'Size L (Lớn)', description: 'Tên giá trị tùy chọn' })
  @IsString()
  @IsNotEmpty({ message: 'Tên giá trị tùy chọn không được để trống' })
  valueName!: string;

  @ApiPropertyOptional({ example: 10000, description: 'Mức phụ thu so với giá gốc (VNĐ)' })
  @IsOptional()
  @IsNumber({}, { message: 'Mức chênh lệch giá phải là số' })
  priceAdjustment?: number;
}

export class CreateProductOptionDto {
  @ApiProperty({ example: 'Kích cỡ (Size)', description: 'Tên nhóm tùy biến' })
  @IsString()
  @IsNotEmpty({ message: 'Tên nhóm tùy chọn không được để trống' })
  optionName!: string;

  @ApiPropertyOptional({ example: true, description: 'Khách hàng có bắt buộc phải chọn nhóm này không' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Số lượng lựa chọn tối đa (vd: 1 = radio button)' })
  @IsOptional()
  @IsInt({ message: 'Số lượng lựa chọn tối đa phải là số nguyên' })
  @Min(1, { message: 'Số lượng lựa chọn tối đa ít nhất là 1' })
  maxChoices?: number;

  @ApiProperty({ type: [CreateOptionValueDto], description: 'Danh sách các giá trị lựa chọn' })
  @IsArray()
  @IsNotEmpty({ message: 'Danh sách giá trị tùy chọn không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionValueDto)
  values!: CreateOptionValueDto[];
}

export class CreateProductDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã danh mục của món ăn/thức uống',
  })
  @IsUUID('all', { message: 'Mã danh mục (categoryId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã danh mục không được để trống' })
  categoryId!: string;

  @ApiProperty({ example: 'Caramel Macchiato Đá', description: 'Tên món' })
  @IsString()
  @IsNotEmpty({ message: 'Tên món không được để trống' })
  name!: string;

  @ApiProperty({ example: 65000, description: 'Giá cơ bản chưa tính topping/size (VNĐ)' })
  @IsNumber({}, { message: 'Giá cơ bản phải là số' })
  @Min(0, { message: 'Giá cơ bản không được âm' })
  @IsNotEmpty({ message: 'Giá cơ bản không được để trống' })
  basePrice!: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái kinh doanh' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [CreateProductOptionDto],
    description: 'Các nhóm tùy biến (Size, Đường, Đá, Sữa, Topping)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductOptionDto)
  options?: CreateProductOptionDto[];
}
