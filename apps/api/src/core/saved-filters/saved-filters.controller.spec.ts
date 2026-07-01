import {
  CreateStaffSavedFilterUseCase,
  ListStaffSavedFiltersUseCase,
  RestoreStaffSavedFilterUseCase,
  SoftDeleteStaffSavedFilterUseCase,
  UpdateStaffSavedFilterUseCase,
} from '@hivork/application';
import { describe, expect, it, vi } from 'vitest';

import { SavedFiltersController } from './saved-filters.controller.js';

describe('SavedFiltersController', () => {
  const listSavedFilters = { execute: vi.fn() };
  const createSavedFilter = { execute: vi.fn() };
  const updateSavedFilter = { execute: vi.fn() };
  const softDeleteSavedFilter = { execute: vi.fn() };
  const restoreSavedFilter = { execute: vi.fn() };

  const controller = new SavedFiltersController(
    listSavedFilters as unknown as ListStaffSavedFiltersUseCase,
    createSavedFilter as unknown as CreateStaffSavedFilterUseCase,
    updateSavedFilter as unknown as UpdateStaffSavedFilterUseCase,
    softDeleteSavedFilter as unknown as SoftDeleteStaffSavedFilterUseCase,
    restoreSavedFilter as unknown as RestoreStaffSavedFilterUseCase,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  it('lists saved filters for resource', async () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    listSavedFilters.execute.mockResolvedValue({
      items: [
        {
          id: 'filter-1',
          tenantId: 'tenant-1',
          staffId: 'staff-1',
          resourceKey: 'customers',
          name: 'VIP',
          description: null,
          filterAst: {
            root: { type: 'group', logic: 'and', children: [] },
          },
          isDefault: true,
          visibility: 'private',
          version: 1,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
        },
      ],
    });

    const result = await controller.list(staff, { resourceKey: 'customers' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('VIP');
  });
});
