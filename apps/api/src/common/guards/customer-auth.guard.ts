import { JwtTokenService } from '@hivork/infrastructure';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { CUSTOMER_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { CustomerContext } from '../types/auth-context.js';
import { extractBearerToken } from '../utils/auth-request.util.js';

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly tokens: JwtTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing.',
      });
    }

    const payload = await this.tokens.verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Access token is invalid or expired.',
      });
    }

    if (payload.actor !== 'customer') {
      throw new ForbiddenException({
        code: 'WRONG_ACTOR',
        message: 'Customer access token required.',
      });
    }

    const customerContext: CustomerContext = { id: payload.sub };
    (request as Request & Record<string, unknown>)[CUSTOMER_CONTEXT_KEY] = customerContext;
    return true;
  }
}
