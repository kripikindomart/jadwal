import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions decorator = allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      throw new ForbiddenException('Akses ditolak: Anda belum memiliki role.');
    }

    // Super admin bypasses all permission checks
    const isSuperAdmin = user.roles.some(
      (role: any) => role.slug === 'superadmin',
    );
    if (isSuperAdmin) {
      return true;
    }

    // Collect all permission slugs from user's roles
    const userPermissions: string[] = [];
    for (const role of user.roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          userPermissions.push(perm.slug);
        }
      }
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak memiliki izin untuk aksi ini.',
      );
    }

    return true;
  }
}
