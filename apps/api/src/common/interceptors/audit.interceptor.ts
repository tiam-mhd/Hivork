import { AUDIT_SERVICE, type AuditService } from '@hivork/application';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

import {
  AUDITABLE_METADATA_KEY,
  CUSTOMER_CONTEXT_KEY,
  STAFF_CONTEXT_KEY,
} from '../constants/auth.constants.js';
import type { CustomerContext, StaffContext } from '../types/auth-context.js';

function entityTypeFromAction(action: string): string {
  return action.split('.')[0] ?? 'unknown';
}

function extractEntityId(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  if (typeof record.id === 'string') {
    return record.id;
  }

  if (record.tenant && typeof record.tenant === 'object') {
    const tenant = record.tenant as Record<string, unknown>;
    if (typeof tenant.id === 'string') {
      return tenant.id;
    }
  }

  if (record.staff && typeof record.staff === 'object') {
    const staff = record.staff as Record<string, unknown>;
    if (typeof staff.id === 'string') {
      return staff.id;
    }
  }

  if (record.customer && typeof record.customer === 'object') {
    const customer = record.customer as Record<string, unknown>;
    if (typeof customer.id === 'string') {
      return customer.id;
    }
  }

  return undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AUDIT_SERVICE) private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string | undefined>(AUDITABLE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) {
      return next.handle();
    }

    const entityType =
      this.reflector.getAllAndOverride<string | undefined>('auditableEntityType', [
        context.getHandler(),
        context.getClass(),
      ]) ?? entityTypeFromAction(action);

    const request = context.switchToHttp().getRequest<Request>();
    const staff = (request as Request & Record<string, unknown>)[STAFF_CONTEXT_KEY] as
      | StaffContext
      | undefined;
    const customer = (request as Request & Record<string, unknown>)[CUSTOMER_CONTEXT_KEY] as
      | CustomerContext
      | undefined;

    const actor = staff
      ? { actorType: 'staff' as const, actorId: staff.id, tenantId: staff.tenantId }
      : customer
        ? { actorType: 'customer' as const, actorId: customer.id }
        : { actorType: 'system' as const, actorId: '00000000-0000-0000-0000-000000000001' };

    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((result) => {
        void this.audit.log({
          tenantId: 'tenantId' in actor ? actor.tenantId : undefined,
          actorType: actor.actorType,
          actorId: actor.actorId,
          action,
          entityType,
          entityId: extractEntityId(result) ?? actor.actorId,
          newValue: result,
          ip,
          userAgent,
        });
      }),
    );
  }
}
