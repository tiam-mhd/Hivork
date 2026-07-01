import { describe, expect, it, vi } from 'vitest';

import { SoftDeleteEntityUseCase } from './soft-delete-entity.use-case.js';
import { RestoreEntityUseCase } from './restore-entity.use-case.js';

describe('SoftDeleteEntityUseCase', () => {
  const repository = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    listDeleted: vi.fn(),
  };
  const audit = { log: vi.fn() };
  const useCase = new SoftDeleteEntityUseCase(repository, audit, 'tenant_customer');

  it('soft deletes active entity and audits', async () => {
    repository.findActiveById.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
    });
    repository.softDelete.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: new Date('2026-01-01'),
      deletedById: 'staff-1',
      deleteReason: 'duplicate',
      version: 2,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      entityId: 'cust-1',
      actorId: 'staff-1',
      deleteReason: 'duplicate',
    });

    expect(result.id).toBe('cust-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'entity.soft_delete',
        entityType: 'tenant_customer',
      }),
    );
  });

  it('returns 409 when already deleted', async () => {
    repository.findActiveById.mockResolvedValue(null);
    repository.findDeletedById.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: new Date(),
      deletedById: 'staff-1',
      deleteReason: null,
      version: 2,
    });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', entityId: 'cust-1', actorId: 'staff-1' }),
    ).rejects.toMatchObject({ code: 'ALREADY_DELETED', httpStatus: 409 });
  });
});

describe('RestoreEntityUseCase', () => {
  const repository = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    listDeleted: vi.fn(),
  };
  const audit = { log: vi.fn() };
  const useCase = new RestoreEntityUseCase(repository, audit, 'tenant_customer');

  it('restores deleted entity and audits', async () => {
    repository.findDeletedById.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: new Date('2026-01-01'),
      deletedById: 'staff-1',
      deleteReason: null,
      version: 2,
    });
    repository.restore.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 3,
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      entityId: 'cust-1',
      actorId: 'staff-1',
    });

    expect(result.id).toBe('cust-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'entity.restore',
        entityType: 'tenant_customer',
      }),
    );
  });

  it('returns 409 when entity is not deleted', async () => {
    repository.findDeletedById.mockResolvedValue(null);
    repository.findActiveById.mockResolvedValue({
      id: 'cust-1',
      tenantId: 'tenant-1',
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
    });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', entityId: 'cust-1', actorId: 'staff-1' }),
    ).rejects.toMatchObject({ code: 'NOT_DELETED', httpStatus: 409 });
  });
});
