import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum TableStatusDto {
  EMPTY = 'EMPTY',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
}

export class UpdateTableDto {
  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsOptional()
  @IsUUID('all', { message: 'Mã khu vực phải là UUID hợp lệ' })
  areaId?: string;

  @ApiPropertyOptional({ example: 'B01-VIP' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: TableStatusDto, example: TableStatusDto.EMPTY })
  @IsOptional()
  @IsEnum(TableStatusDto, {
    message: 'Trạng thái bàn phải là EMPTY, OCCUPIED hoặc RESERVED',
  })
  status?: TableStatusDto;
}

