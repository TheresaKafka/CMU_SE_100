import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateIngredientDto {
  @ApiPropertyOptional({ example: 'Hạt Cà Phê Cầu Đất Đặc Biệt' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'gram' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 3000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional({ example: 280 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

