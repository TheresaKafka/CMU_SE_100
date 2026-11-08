import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'cashier01', description: 'Tên đăng nhập mới' })
  @IsString()
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  username!: string;

  @ApiProperty({ example: 'Password123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @ApiProperty({ example: 'CASHIER', description: 'Tên vai trò (ADMIN, CASHIER, BARISTA, MANAGER)' })
  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò (Role) không được để trống' })
  roleName!: string;

  @ApiPropertyOptional({ example: '1234', description: 'Mã PIN POS để đăng nhập nhanh tại quầy' })
  @IsOptional()
  @IsString()
  @Length(4, 6, { message: 'Mã PIN POS phải từ 4 đến 6 chữ số' })
  @Matches(/^\d+$/, { message: 'Mã PIN POS chỉ được chứa chữ số' })
  posPin?: string;
}
