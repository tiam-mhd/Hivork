import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { PERMISSION_METADATA_KEY } from '../constants/auth.constants.js';
import { PermissionGuard } from '../guards/permission.guard.js';
import { RequireAuth } from './require-auth.decorator.js';

export const RequirePermission = (permission: string) =>
  applyDecorators(
    SetMetadata(PERMISSION_METADATA_KEY, permission),
    RequireAuth('staff'),
    UseGuards(PermissionGuard),
  );
