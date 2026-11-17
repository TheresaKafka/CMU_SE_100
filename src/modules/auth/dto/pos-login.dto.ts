import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PosLoginDto {
  @ApiPropertyOptional({
    example: '1234',
    description: 'Mã PIN POS nhanh (từ 4 đến 6 chữ số) dành riêng cho thu ngân tại quầy',
  })
  @IsOptional()
  @IsString()
  posPin?: string;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Alias cho posPin',
  })
  @IsOptional()
  @IsString()
  pin?: string;
}
