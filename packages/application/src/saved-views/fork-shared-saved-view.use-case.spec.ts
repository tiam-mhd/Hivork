import { describe, expect, it, vi } from 'vitest';

import { ForkSharedSavedViewUseCase } from './fork-shared-saved-view.use-case.js';

describe('ForkSharedSavedViewUseCase', () => {
  const repository = {
    findAccessibleById: vi.fn(),
    findActiveByName: vi.fn(),
    create: vi.fn(),
  };
  const savedFilters = { create: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new ForkSharedSavedViewUseCase(
    repository as never,
    savedFilters as never,
    audit as never,
  );

  const columnState = {
    order: ['displayName'],
    visibility: { displayName: true },
  };

  it('forks a shared view into a private copy', async () => {
    repository.findAccessibleById.mockResolvedValue({
      id: 'shared-1',
      tenantId: 'tenant-1',
      staffId: 'owner-1',
      resourceKey: 'customers',
      name: 'نمای مالی',
      description: null,
      columnState,
      sortBy: 'name',
      sortDir: 'asc',
      search: null,
      savedFilterId: null,
      filterAst: {
        root: { type: 'group', logic: 'and', children: [] },
      },
      visibility: 'shared',
    });
    repository.findActiveByName.mockResolvedValue(null);
    savedFilters.create.mockResolvedValue({ id: 'filter-copy' });
    repository.create.mockResolvedValue({
      id: 'forked-1',
      name: 'کپی نمای مالی',
      visibility: 'private',
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      viewId: 'shared-1',
      name: 'کپی نمای مالی',
    });

    expect(result.id).toBe('forked-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'saved_view.fork', entityId: 'forked-1' }),
    );
  });
});
