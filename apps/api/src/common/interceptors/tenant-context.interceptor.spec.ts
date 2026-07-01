import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CUSTOMER_CONTEXT_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { getRequestContext } from '../context/tenant.context.js';
import { TenantContextInterceptor } from './tenant-context.interceptor.js';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as ExecutionContext;
}

function createHandler(result: unknown = { ok: true }): CallHandler {
  return {
    handle: () =>
      of(
        (() => {
          const context = getRequestContext();
          return context ? { context, result } : result;
        })(),
      ),
  };
}

describe('TenantContextInterceptor', () => {
  const interceptor = new TenantContextInterceptor();

  it('populates tenant storage for staff requests', async () => {
    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
        primaryBranchId: 'branch-1',
        activeBranchId: null,
      },
    };

    const value = await lastValueFrom(
      interceptor.intercept(createContext(request), createHandler()),
    );

    expect(value).toMatchObject({
      context: {
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        activeBranchId: null,
        primaryBranchId: 'branch-1',
        effectiveBranchIds: ['branch-1', 'branch-2'],
      },
      result: { ok: true },
    });
  });

  it('skips tenant storage for customer requests', async () => {
    const request = {
      [CUSTOMER_CONTEXT_KEY]: { id: 'customer-1' },
    };

    const value = await lastValueFrom(
      interceptor.intercept(createContext(request), createHandler()),
    );

    expect(value).toEqual({ ok: true });
  });

  it('sets effectiveBranchIds to active branch only', async () => {
    const request = {
      [STAFF_CONTEXT_KEY]: {
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
        primaryBranchId: 'branch-1',
        activeBranchId: 'branch-2',
      },
    };

    const value = await lastValueFrom(
      interceptor.intercept(createContext(request), createHandler()),
    );

    expect(value).toMatchObject({
      context: {
        effectiveBranchIds: ['branch-2'],
      },
    });
  });

  it('skips storage when staff context is missing', async () => {
    const handle = vi.fn(() => of({ ok: true }));

    await lastValueFrom(interceptor.intercept(createContext({}), { handle }));

    expect(handle).toHaveBeenCalledOnce();
  });
});
