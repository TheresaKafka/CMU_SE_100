import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';

export class RecipeItemDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã nguyên vật liệu (ingredientId)',
  })
  @IsUUID('all', { message: 'Mã nguyên liệu phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã nguyên liệu không được để trống' })
  ingredientId!: string;

  @ApiProperty({
    example: 18,
    description: 'Định mức tiêu hao cho 1 phần món (ví dụ: 18g cafe, 40ml sữa đặc)',
  })
  @IsNumber({}, { message: 'Định mức tiêu hao phải là số' })
  @Min(0.01, { message: 'Định mức tiêu hao phải lớn hơn 0' })
  quantityRequired!: number;
}

export class SetRecipeDto {
  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Mã sản phẩm thiết lập công thức (productId)',
  })
  @IsUUID('all', { message: 'Mã món (productId) phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Mã món không được để trống' })
  productId!: string;

  @ApiProperty({
    type: [RecipeItemDto],
    description: 'Danh sách các nguyên liệu định mức cho món',
  })
  @IsArray({ message: 'Danh sách định mức phải là một mảng' })
  @ArrayMinSize(1, { message: 'Công thức món phải có ít nhất 1 nguyên vật liệu' })
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items!: RecipeItemDto[];
}

