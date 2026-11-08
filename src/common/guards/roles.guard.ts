import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';
import { UserRole } from '../enums/user-role.enum.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !user.roleName) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    const userRoleUpper = user.roleName.toUpperCase();

    // Quản trị viên cấp cao ADMIN luôn có toàn quyền
    if (userRoleUpper === UserRole.ADMIN) {
      return true;
    }

    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === userRoleUpper,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Yêu cầu vai trò: [${requiredRoles.join(', ')}]. Vai trò hiện tại của bạn: [${user.roleName}]`,
      );
    }

    return true;
  }
}
