import type { TenantIdResolver } from '@hivork/module-core';
import { ExecutionContext, Injectable } from '@nestjs/common';

import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { getRequestContext } from '../context/tenant.context.js';
import type { StaffContext } from '../types/auth-context.js';

@Injectable()
export class StaffTenantIdResolver implements TenantIdResolver {
  resolveTenantId(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const staff = request[STAFF_CONTEXT_KEY] as StaffContext | undefined;
    if (staff?.tenantId) {
      return staff.tenantId;
    }

    return getRequestContext()?.tenantId ?? null;
  }
}
