import { applyDecorators, SetMetadata } from '@nestjs/common';

import { APPLY_DATA_SCOPE_KEY } from '../constants/auth.constants.js';
import { RequireAuth } from './require-auth.decorator.js';

export const ApplyDataScope = () =>
  applyDecorators(SetMetadata(APPLY_DATA_SCOPE_KEY, true), RequireAuth('staff'));
