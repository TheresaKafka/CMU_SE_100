import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @ApiProperty({
    example: 1850000,
    description: 'Số tiền mặt thực tế đếm được trong két khi kết thúc ca (VNĐ)',
  })
  @IsNumber({}, { message: 'Tiền mặt thực tế cuối ca phải là số' })
  @Min(0, { message: 'Tiền mặt thực tế cuối ca không được âm' })
  @IsNotEmpty({ message: 'Tiền mặt thực tế cuối ca không được để trống' })
  actualEndingCash!: number;

  @ApiPropertyOptional({
    example: 'Két tiền khớp hoàn toàn, không có chênh lệch',
    description: 'Ghi chú bàn giao ca của thu ngân',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
