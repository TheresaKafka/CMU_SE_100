import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { PosLoginDto } from './dto/pos-login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản nhân viên mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Tên người dùng hoặc PIN POS đã tồn tại' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập tiêu chuẩn (Username + Password) cho Web Admin / Manager' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT Access Token' })
  @ApiResponse({ status: 401, description: 'Tài khoản hoặc mật khẩu không chính xác' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập POS siêu tốc bằng mã PIN dành riêng cho máy POS quầy bán hàng' })
  @ApiResponse({ status: 200, description: 'Đăng nhập POS thành công, cấp Access Token' })
  @ApiResponse({ status: 401, description: 'Mã PIN POS không hợp lệ' })
  @HttpCode(HttpStatus.OK)
  @Post('pos-login')
  async posLogin(@Body() dto: PosLoginDto) {
    return this.authService.posLogin(dto);
  }

  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực hoặc token hết hạn' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
