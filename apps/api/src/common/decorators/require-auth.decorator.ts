import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { ACTOR_METADATA_KEY, type AuthActor } from '../constants/auth.constants.js';
import { AuthGuard } from '../guards/auth.guard.js';

export const RequireAuth = (actor: AuthActor) =>
  applyDecorators(SetMetadata(ACTOR_METADATA_KEY, actor), UseGuards(AuthGuard));
