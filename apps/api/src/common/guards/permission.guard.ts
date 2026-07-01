import { GetStaffPermissionsUseCase } from '@hivork/application';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PERMISSION_METADATA_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { StaffContext } from '../types/auth-context.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(GetStaffPermissionsUseCase) private readonly getStaffPermissions: GetStaffPermissionsUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(PERMISSION_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const staff = (request as Request & Record<string, unknown>)[STAFF_CONTEXT_KEY] as
      | StaffContext
      | undefined;

    if (!staff) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Staff context is missing.',
      });
    }

    const effective = await this.getStaffPermissions.execute({ staffId: staff.id });
    if (!this.getStaffPermissions.hasPermission(effective, required)) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
      });
    }

    return true;
  }
}
