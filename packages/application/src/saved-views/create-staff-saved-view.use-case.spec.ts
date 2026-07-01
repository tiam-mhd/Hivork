import { describe, expect, it, vi } from 'vitest';

import { CreateStaffSavedViewUseCase } from './create-staff-saved-view.use-case.js';

describe('CreateStaffSavedViewUseCase', () => {
  const repository = {
    countActive: vi.fn().mockResolvedValue(0),
    findActiveByName: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
  };

  const savedFilters = {
    findActiveById: vi.fn(),
  };

  const audit = { log: vi.fn() };

  const useCase = new CreateStaffSavedViewUseCase(
    repository as never,
    savedFilters as never,
    audit as never,
  );

  const columnState = {
    order: ['displayName', 'phone'],
    visibility: { phone: true },
  };

  it('rejects duplicate view names', async () => {
    repository.findActiveByName.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        resourceKey: 'customers',
        name: 'نمای مالی',
        columnState,
      }),
    ).rejects.toMatchObject({ code: 'SAVED_VIEW_NAME_EXISTS' });
  });

  it('creates a saved view with audit', async () => {
    repository.create.mockResolvedValueOnce({
      id: 'view-1',
      name: 'نمای مالی',
      resourceKey: 'customers',
      isDefault: false,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      resourceKey: 'customers',
      name: 'نمای مالی',
      columnState,
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(result.id).toBe('view-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'saved_view.create', entityId: 'view-1' }),
    );
  });
});
