import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { API_KEY_SCOPE_METADATA_KEY } from '../constants/auth.constants.js';
import { ApiKeyGuard } from '../guards/api-key.guard.js';

export function RequireApiKey(scope?: string) {
  const decorators = [UseGuards(ApiKeyGuard)];
  if (scope) {
    decorators.push(SetMetadata(API_KEY_SCOPE_METADATA_KEY, scope));
  }
  return applyDecorators(...decorators);
}
