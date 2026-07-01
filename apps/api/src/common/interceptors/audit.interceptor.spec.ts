import type { AuditService } from '@hivork/application';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDITABLE_METADATA_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { AuditInterceptor } from './audit.interceptor.js';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('AuditInterceptor', () => {
  const reflector = new Reflector();
  const audit: AuditService = { log: vi.fn().mockResolvedValue(undefined) };
  const interceptor = new AuditInterceptor(reflector, audit);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs auditable actions after successful handler', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === AUDITABLE_METADATA_KEY) return 'tenant.create';
      return undefined;
    });

    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: null,
        activeBranchId: null,
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
    };

    await lastValueFrom(
      interceptor.intercept(createContext(request), {
        handle: () => of({ id: 'tenant-new', slug: 'demo' }),
      }),
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'tenant.create',
        entityType: 'tenant',
        entityId: 'tenant-new',
        actorType: 'staff',
        actorId: 'staff-1',
        tenantId: 'tenant-1',
        ip: '127.0.0.1',
        userAgent: 'vitest',
      }),
    );
  });

  it('skips when auditable metadata is absent', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    await lastValueFrom(
      interceptor.intercept(createContext({}), {
        handle: () => of({ ok: true }),
      }),
    );

    expect(audit.log).not.toHaveBeenCalled();
  });
});
