import { ApplicationError, buildDataScopeFilter } from '@hivork/application';
import { CallHandler, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { APPLY_DATA_SCOPE_KEY, STAFF_CONTEXT_KEY } from '../constants/auth.constants.js';
import { getDataScopeFilter } from '../context/data-scope.context.js';
import { prismaRequestStorage } from '@hivork/infrastructure';
import { DataScopeInterceptor } from './data-scope.interceptor.js';

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

describe('DataScopeInterceptor', () => {
  const reflector = new Reflector();
  const interceptor = new DataScopeInterceptor(reflector);

  it('stores branch scope filter in async storage', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const staffContext = {
      id: 'staff-1',
      tenantId: 'tenant-1',
      dataScope: 'branch' as const,
      assignedBranchIds: ['branch-1', 'branch-2'],
      primaryBranchId: 'branch-1',
      activeBranchId: null,
    };

    const request = {
      [STAFF_CONTEXT_KEY]: staffContext,
    };

    const parent = {
      tenantId: staffContext.tenantId,
      staffId: staffContext.id,
      activeBranchId: null,
      primaryBranchId: 'branch-1',
      effectiveBranchIds: ['branch-1', 'branch-2'],
    };

    const value = await prismaRequestStorage.run(parent, () =>
      lastValueFrom(
        interceptor.intercept(createContext(request), {
          handle: () =>
            of({
              filter: getDataScopeFilter(),
            }),
        }),
      ),
    );

    expect(value).toEqual({
      filter: { branchId: { in: ['branch-1', 'branch-2'] } },
    });
  });

  it('narrows filter to active branch', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const staffContext = {
      id: 'staff-1',
      tenantId: 'tenant-1',
      dataScope: 'branch' as const,
      assignedBranchIds: ['branch-1', 'branch-2'],
      primaryBranchId: 'branch-1',
      activeBranchId: 'branch-2',
    };

    const request = { [STAFF_CONTEXT_KEY]: staffContext };
    const parent = {
      tenantId: staffContext.tenantId,
      staffId: staffContext.id,
      activeBranchId: 'branch-2',
      primaryBranchId: 'branch-1',
      effectiveBranchIds: ['branch-2'],
    };

    const value = await prismaRequestStorage.run(parent, () =>
      lastValueFrom(
        interceptor.intercept(createContext(request), {
          handle: () => of(getDataScopeFilter()),
        }),
      ),
    );

    expect(value).toEqual({ branchId: { in: ['branch-2'] } });
  });

  it('skips storage when metadata is absent', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const value = await lastValueFrom(
      interceptor.intercept(createContext({}), {
        handle: () => of(getDataScopeFilter() ?? 'missing'),
      }),
    );

    expect(value).toBe('missing');
  });

  it('rejects active branch outside assignment with 403', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const staffContext = {
      id: 'staff-1',
      tenantId: 'tenant-1',
      dataScope: 'branch' as const,
      assignedBranchIds: ['branch-1'],
      primaryBranchId: 'branch-1',
      activeBranchId: 'branch-2',
    };

    const request = { [STAFF_CONTEXT_KEY]: staffContext };
    const parent = {
      tenantId: staffContext.tenantId,
      staffId: staffContext.id,
      activeBranchId: 'branch-2',
      primaryBranchId: 'branch-1',
      effectiveBranchIds: ['branch-2'],
    };

    await expect(
      prismaRequestStorage.run(parent, () =>
        lastValueFrom(
          interceptor.intercept(createContext(request), {
            handle: () => of(true),
          }),
        ),
      ),
    ).rejects.toMatchObject({
      response: { code: 'BRANCH_NOT_ALLOWED' },
    });
  });

  it('requires staff context when metadata is present', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    await expect(
      lastValueFrom(
        interceptor.intercept(createContext({}), {
          handle: () => of(true),
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('stores empty filter for dataScope=all', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const staffContext = {
      id: 'staff-1',
      tenantId: 'tenant-1',
      dataScope: 'all' as const,
      assignedBranchIds: [],
      primaryBranchId: null,
      activeBranchId: null,
    };

    const request = { [STAFF_CONTEXT_KEY]: staffContext };
    const parent = {
      tenantId: staffContext.tenantId,
      staffId: staffContext.id,
      activeBranchId: null,
      primaryBranchId: null,
      effectiveBranchIds: [],
    };

    const value = await prismaRequestStorage.run(parent, () =>
      lastValueFrom(
        interceptor.intercept(createContext(request), {
          handle: () => of(getDataScopeFilter()),
        }),
      ),
    );

    expect(value).toEqual({});
  });

  it('reads metadata from handler and class', async () => {
    const getAllAndOverride = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createContext({});

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of(true),
      }),
    );

    expect(getAllAndOverride).toHaveBeenCalledWith(APPLY_DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
