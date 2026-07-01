import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, defer } from 'rxjs';

import { buildBranchContext } from '../context/branch.context.js';
import { runRequestContext } from '../context/tenant.context.js';
import { STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import type { StaffContext } from '../types/auth-context.js';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const staff = request[STAFF_CONTEXT_KEY] as StaffContext | undefined;

    if (!staff?.tenantId) {
      return next.handle();
    }

    return defer(() =>
      runRequestContext(
        {
          tenantId: staff.tenantId,
          staffId: staff.id,
          ...buildBranchContext(staff),
        },
        () => next.handle(),
      ),
    );
  }
}
