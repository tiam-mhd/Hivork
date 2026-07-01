import {
  CreateStaffSavedViewUseCase,
  ForkSharedSavedViewUseCase,
  GetStaffPermissionsUseCase,
  ListStaffSavedViewsUseCase,
  RestoreStaffSavedViewUseCase,
  SoftDeleteStaffSavedViewUseCase,
  UpdateStaffSavedViewUseCase,
} from '@hivork/application';
import { describe, expect, it, vi } from 'vitest';

import { SavedViewsController } from './saved-views.controller.js';

describe('SavedViewsController', () => {
  const listSavedViews = { execute: vi.fn() };
  const createSavedView = { execute: vi.fn() };
  const updateSavedView = { execute: vi.fn() };
  const softDeleteSavedView = { execute: vi.fn() };
  const restoreSavedView = { execute: vi.fn() };
  const forkSharedSavedView = { execute: vi.fn() };
  const getStaffPermissions = {
    execute: vi.fn().mockResolvedValue(new Set(['core.saved_view.manage', 'core.saved_view.use_shared'])),
    hasPermission: vi.fn((effective: Set<string>, required: string) => effective.has(required)),
  };

  const controller = new SavedViewsController(
    listSavedViews as unknown as ListStaffSavedViewsUseCase,
    createSavedView as unknown as CreateStaffSavedViewUseCase,
    updateSavedView as unknown as UpdateStaffSavedViewUseCase,
    softDeleteSavedView as unknown as SoftDeleteStaffSavedViewUseCase,
    restoreSavedView as unknown as RestoreStaffSavedViewUseCase,
    forkSharedSavedView as unknown as ForkSharedSavedViewUseCase,
    getStaffPermissions as unknown as GetStaffPermissionsUseCase,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  it('lists saved views for resource', async () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    listSavedViews.execute.mockResolvedValue({
      mine: [
        {
          id: 'view-1',
          tenantId: 'tenant-1',
          staffId: 'staff-1',
          resourceKey: 'customers',
          name: 'نمای مالی',
          description: null,
          columnState: { order: ['displayName'], visibility: {} },
          sortBy: 'name',
          sortDir: 'asc',
          search: null,
          savedFilterId: null,
          filterAst: null,
          isDefault: true,
          visibility: 'private',
          ownerName: 'علی',
          version: 1,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
        },
      ],
      shared: [
        {
          id: 'view-2',
          tenantId: 'tenant-1',
          staffId: 'staff-2',
          resourceKey: 'customers',
          name: 'نمای تیم',
          description: null,
          columnState: { order: ['displayName'], visibility: {} },
          sortBy: 'name',
          sortDir: 'asc',
          search: null,
          savedFilterId: null,
          filterAst: null,
          isDefault: false,
          visibility: 'shared',
          ownerName: 'رضا',
          version: 1,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
        },
      ],
    });

    const result = await controller.list(staff, { resourceKey: 'customers', includeShared: true });

    expect(result.mine).toHaveLength(1);
    expect(result.mine[0]?.name).toBe('نمای مالی');
    expect(result.shared).toHaveLength(1);
    expect(result.shared[0]?.ownerName).toBe('رضا');
  });
});
