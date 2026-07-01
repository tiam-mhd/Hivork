import { describe, expect, it, vi } from 'vitest';

import { CreateStaffSavedFilterUseCase } from './create-staff-saved-filter.use-case.js';
import { MAX_SAVED_FILTERS_PER_STAFF } from './saved-filter.constants.js';

describe('CreateStaffSavedFilterUseCase', () => {
  const audit = { log: vi.fn() };
  const repository = {
    countActive: vi.fn(),
    findActiveByName: vi.fn(),
    create: vi.fn(),
    listActive: vi.fn(),
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  const useCase = new CreateStaffSavedFilterUseCase(repository, audit);

  const filterAst = {
    root: {
      type: 'group' as const,
      logic: 'and' as const,
      children: [
        { type: 'condition' as const, field: 'name', operator: 'contains' as const, value: 'a' },
      ],
    },
  };

  it('rejects duplicate names', async () => {
    repository.countActive.mockResolvedValue(0);
    repository.findActiveByName.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        tenantId: 't1',
        staffId: 's1',
        resourceKey: 'customers',
        name: 'VIP',
        filterAst,
      }),
    ).rejects.toMatchObject({ code: 'SAVED_FILTER_NAME_EXISTS' });
  });

  it('enforces max saved filters', async () => {
    repository.countActive.mockResolvedValue(MAX_SAVED_FILTERS_PER_STAFF);
    repository.findActiveByName.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 't1',
        staffId: 's1',
        resourceKey: 'customers',
        name: 'VIP',
        filterAst,
      }),
    ).rejects.toMatchObject({ code: 'PLAN_LIMIT_EXCEEDED' });
  });
});
