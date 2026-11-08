import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryProductsDto {
  @ApiPropertyOptional({ description: 'Lọc món theo mã danh mục' })
  @IsOptional()
  @IsUUID('all', { message: 'Mã danh mục lọc phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên sản phẩm' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đang bán (true) hoặc ngưng bán (false)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}
