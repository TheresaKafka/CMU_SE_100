import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class PosLoginDto {
  @ApiProperty({
    example: '1234',
    description: 'Mã PIN POS nhanh (từ 4 đến 6 chữ số) dành riêng cho thu ngân tại quầy',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã PIN POS không được để trống' })
  @Length(4, 6, { message: 'Mã PIN POS phải từ 4 đến 6 chữ số' })
  @Matches(/^\d+$/, { message: 'Mã PIN POS chỉ được chứa chữ số' })
  posPin!: string;
}
