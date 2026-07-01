import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { StaffContext } from '../types/auth-context.js';

export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext): StaffContext => {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const staff = request[STAFF_CONTEXT_KEY] as StaffContext | undefined;
    if (!staff) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Staff context is missing.',
      });
    }
    return staff;
  },
);
