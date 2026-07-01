import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { API_KEY_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { ApiKeyContext } from '../types/api-key-context.js';

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApiKeyContext => {
    const request = context.switchToHttp().getRequest<Request>();
    const ctx = (request as Request & Record<string, unknown>)[API_KEY_CONTEXT_KEY] as
      | ApiKeyContext
      | undefined;

    if (!ctx) {
      throw new Error('ApiKeyContext is missing — apply RequireApiKey() on this route.');
    }

    return ctx;
  },
);
