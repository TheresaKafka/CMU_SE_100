
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { PosLoginDto } from './dto/pos-login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.orm.public.User
      .where({ username: dto.username })
      .first();

    if (existingUser) {
      throw new ConflictException('Tên người dùng đã tồn tại trong hệ thống');
    }

    if (dto.posPin) {
      const existingPin = await this.prisma.orm.public.User
        .where({ posPin: dto.posPin })
        .first();

      if (existingPin) {
        throw new ConflictException('Mã PIN POS này đã được người khác sử dụng');
      }
    }

    // Tìm role hoặc tự động tạo nếu chưa có
    let role = await this.prisma.orm.public.Role
      .where({ name: dto.roleName })
      .first();

    if (!role) {
      role = await this.prisma.orm.public.Role.create({
        name: dto.roleName,
        permissions: {},
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.orm.public.User.create({
      username: dto.username,
      passwordHash,
      roleId: role.id,
      posPin: dto.posPin ?? null,
      status: 'ACTIVE',
    });

    const token = await this.generateToken(newUser.id, newUser.username, role.name);

    return {
      message: 'Đăng ký tài khoản thành công',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: role.name,
        createdAt: newUser.createdAt,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.orm.public.User
      .where({ username: dto.username })
      .include('role')
      .first();

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const token = await this.generateToken(user.id, user.username, user.role.name);

    return {
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,
      },
      accessToken: token,
    };
  }

  async posLogin(dto: PosLoginDto) {
    const user = await this.prisma.orm.public.User
      .where({ posPin: dto.posPin })
      .include('role')
      .first();

    if (!user) {
      throw new UnauthorizedException('Mã PIN POS không hợp lệ');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản đã bị tạm khóa');
    }

    const token = await this.generateToken(user.id, user.username, user.role.name);

    return {
      message: 'Đăng nhập POS thành công',
      user: {
        id: user.id,
        username: user.username,
        role: user.role.name,
      },
      accessToken: token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.orm.public.User
      .where({ id: userId })
      .include('role')
      .first();

    if (!user) {
      throw new BadRequestException('Không tìm thấy thông tin người dùng');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role.name,
      permissions: user.role.permissions,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  private async generateToken(userId: string, username: string, roleName: string): Promise<string> {
    const payload = {
      sub: userId,
      username,
      roleName,
    };
    return this.jwtService.signAsync(payload);
  }
}

