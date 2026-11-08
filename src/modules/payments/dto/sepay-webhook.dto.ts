import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SepayWebhookDto {
  @ApiProperty({ example: 92704, description: 'Mã giao dịch duy nhất từ SePay' })
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @ApiProperty({ example: 'Vietcombank', description: 'Ngân hàng nhận tiền' })
  @IsString()
  @IsNotEmpty()
  gateway!: string;

  @ApiProperty({ example: '2026-11-08 15:00:00', description: 'Thời gian giao dịch' })
  @IsString()
  @IsNotEmpty()
  transactionDate!: string;

  @ApiProperty({ example: '0388999999', description: 'Số tài khoản ngân hàng nhận tiền' })
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @ApiPropertyOptional({ example: '', description: 'Tài khoản phụ / VA nếu có' })
  @IsOptional()
  @IsString()
  subAccount?: string;

  @ApiPropertyOptional({ example: 'DH1A2B3C', description: 'Mã đơn hàng được SePay tự động bóc tách từ nội dung' })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ example: 'DH1A2B3C chuyen tien ca phe', description: 'Nội dung chuyển khoản gốc' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: 'in', description: 'Loại giao dịch: in (tiền vào) hoặc out (tiền ra)' })
  @IsString()
  @IsNotEmpty()
  transferType!: string;

  @ApiPropertyOptional({ example: 'Chuyen tien thanh toan hoa don' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 65000, description: 'Số tiền thực tế khách đã chuyển khoản (VNĐ)' })
  @IsNumber()
  @IsNotEmpty()
  transferAmount!: number;

  @ApiPropertyOptional({ example: 105000000, description: 'Số dư tài khoản sau giao dịch' })
  @IsOptional()
  @IsNumber()
  accumulated?: number;

  @ApiPropertyOptional({ example: 'FT24012345678', description: 'Mã tham chiếu ngân hàng' })
  @IsOptional()
  @IsString()
  referenceCode?: string;
}

