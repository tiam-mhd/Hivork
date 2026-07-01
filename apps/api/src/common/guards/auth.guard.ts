import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ACTOR_METADATA_KEY, type AuthActor } from '../constants/auth.constants.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { StaffAuthGuard } from './staff-auth.guard.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(StaffAuthGuard) private readonly staffAuthGuard: StaffAuthGuard,
    @Inject(CustomerAuthGuard) private readonly customerAuthGuard: CustomerAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = this.reflector.getAllAndOverride<AuthActor>(ACTOR_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!actor) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Auth actor metadata is missing.',
      });
    }

    if (actor === 'staff') {
      return this.staffAuthGuard.canActivate(context);
    }

    return this.customerAuthGuard.canActivate(context);
  }
}
