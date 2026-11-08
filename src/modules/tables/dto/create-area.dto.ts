import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Tầng 1 - Trong nhà', description: 'Tên khu vực' })
  @IsString()
  @IsNotEmpty({ message: 'Tên khu vực không được để trống' })
  name!: string;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  sortOrder?: number;
}

