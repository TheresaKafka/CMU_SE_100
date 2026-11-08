import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class OpenShiftDto {
  @ApiProperty({
    example: 500000,
    description: 'Số tiền mặt ban đầu trong két khi thu ngân bắt đầu mở ca (VNĐ)',
  })
  @IsNumber({}, { message: 'Tiền mặt đầu ca phải là số' })
  @Min(0, { message: 'Tiền mặt đầu ca không được âm' })
  @IsNotEmpty({ message: 'Tiền mặt đầu ca không được để trống' })
  startingCash!: number;
}
