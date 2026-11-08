import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

interface JwtPayload {
  sub: string;
  username: string;
  roleName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService?: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService?.get<string>('JWT_SECRET') ||
        process.env['JWT_SECRET'] ||
        'cmu-se-100-jwt-secret-key-pos-system',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.orm.public.User
      .where({ id: payload.sub })
      .include('role')
      .first();

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị vô hiệu hoá');
    }

    return {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: (user.role.permissions as Record<string, unknown>) || {},
    };
  }
}

