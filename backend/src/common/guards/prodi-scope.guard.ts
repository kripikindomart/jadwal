import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard ini memastikan bahwa jika user yang login adalah "Staff" atau Dosen,
 * mereka hanya dapat memanipulasi data yang sesuai dengan prodiId yang disubmit (body/query/param).
 * Jika user adalah Super Admin atau Admin, guard akan allow access.
 */
@Injectable()
export class ProdiScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Bypass check for Super Admin and Admin
    const isSuperAdminOrAdmin = user.roles?.some(
      (role: any) => role.slug === 'superadmin' || role.slug === 'admin',
    );

    if (isSuperAdminOrAdmin) {
      return true;
    }

    // Ekstrak target prodiId dari request
    // Biasanya prodiId ada di body (POST/PATCH), query (GET), atau params
    let targetProdiId = null;

    if (request.body && request.body.prodiId) {
      targetProdiId = request.body.prodiId;
    } else if (request.query && request.query.prodiId) {
      targetProdiId = request.query.prodiId;
    }

    // Allow jika tidak ada prodiId context (misal sedang fetch global data bukan per prodi)
    if (!targetProdiId) {
      return true;
    }

    // Cek apakah user memiliki akses ke prodi tersebut
    const allowedProdiIds =
      user.staffProdiAccess?.map((access: any) => access.prodiId) || [];

    const hasAccess = allowedProdiIds.includes(Number(targetProdiId));

    if (!hasAccess) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke data Prodi ini.',
      );
    }

    return true;
  }
}
