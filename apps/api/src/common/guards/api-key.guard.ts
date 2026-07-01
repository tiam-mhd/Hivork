import { ApplicationError, AuthenticateApiKeyUseCase } from '@hivork/application';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import {
  API_KEY_CONTEXT_KEY,
  API_KEY_SCOPE_METADATA_KEY,
} from '../constants/auth.constants.js';
import type { ApiKeyContext } from '../types/api-key-context.js';
import { extractBearerToken } from '../utils/auth-request.util.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthenticateApiKeyUseCase) private readonly authenticate: AuthenticateApiKeyUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authorization header is missing.',
      });
    }

    const requiredScope = this.reflector.getAllAndOverride<string | undefined>(
      API_KEY_SCOPE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    try {
      const result = await this.authenticate.execute({
        rawKey: token,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
        requiredScope,
      });

      const apiKeyContext: ApiKeyContext = {
        tenantId: result.tenantId,
        apiKeyId: result.apiKeyId,
        scopes: result.scopes,
      };

      (request as Request & Record<string, unknown>)[API_KEY_CONTEXT_KEY] = apiKeyContext;
      return true;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw new HttpException(
          { code: error.code, message: error.message, details: error.details },
          error.httpStatus,
        );
      }
      throw error;
    }
  }
}
