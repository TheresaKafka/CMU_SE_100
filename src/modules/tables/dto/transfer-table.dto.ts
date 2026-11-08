import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferTableDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Mã bàn nguồn đang có khách (sourceTableId)',
  })
  @IsUUID('all', { message: 'sourceTableId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'sourceTableId không được để trống' })
  sourceTableId!: string;

  @ApiProperty({
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'Mã bàn đích muốn chuyển tới (targetTableId)',
  })
  @IsUUID('all', { message: 'targetTableId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'targetTableId không được để trống' })
  targetTableId!: string;
}

