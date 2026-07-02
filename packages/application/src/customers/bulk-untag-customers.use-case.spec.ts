import { describe, expect, it, vi } from 'vitest';

import { BulkUntagCustomersUseCase } from './bulk-untag-customers.use-case.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { AuditService } from '../ports/audit.port.js';

describe('BulkUntagCustomersUseCase', () => {
  it('logs undo.executed when isUndo is true', async () => {
    const audit = { log: vi.fn(), find: vi.fn() } satisfies AuditService;
    const tenantCustomers = {
      findDetailById: vi.fn().mockResolvedValue({
        id: 'c1',
        tenantId: 't1',
        version: 1,
        tags: ['vip'],
        defaultBranchId: null,
      }),
      updateLink: vi.fn().mockResolvedValue({}),
    } as unknown as ITenantCustomerRepository;
    const sales = {
      hasSaleForTenantCustomerInBranches: vi.fn(),
      hasSaleForTenantCustomerByStaff: vi.fn(),
    } as unknown as ISaleRepository;

    const useCase = new BulkUntagCustomersUseCase(tenantCustomers, sales, audit);

    await useCase.execute({
      tenantId: 't1',
      actorId: 'staff-1',
      ids: ['c1'],
      tag: 'vip',
      staffContext: { dataScope: 'all', assignedBranchIds: [], activeBranchId: null },
      isUndo: true,
      originalAction: 'customer.bulk_tag',
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'undo.executed',
        entityType: 'customer.bulk_tag',
        oldValue: { originalEntityIds: ['c1'], tag: 'vip' },
      }),
    );
  });
});
