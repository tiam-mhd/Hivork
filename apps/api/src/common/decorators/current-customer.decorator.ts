import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { CUSTOMER_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { CustomerContext } from '../types/auth-context.js';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerContext => {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const customer = request[CUSTOMER_CONTEXT_KEY] as CustomerContext | undefined;
    if (!customer) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Customer context is missing.',
      });
    }
    return customer;
  },
);
