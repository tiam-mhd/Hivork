import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ArchiveTenantCustomerUseCase,
  UnarchiveTenantCustomerUseCase,
} from './archive-tenant-customer.use-case.js';
import { RestoreTenantCustomerUseCase } from './restore-tenant-customer.use-case.js';
import { SoftDeleteTenantCustomerUseCase } from './soft-delete-tenant-customer.use-case.js';

const staffContext = {
  staffId: 'staff-1',
  dataScope: 'all' as const,
  assignedBranchIds: [],
  activeBranchId: null,
};

const existing = {
  id: 'tc-1',
  tenantId: 'tenant-1',
  globalCustomerId: 'global-1',
  localCode: 'C-1',
  notes: null,
  defaultBranchId: null,
  deletedAt: null,
  deletedById: null,
  deleteReason: null,
  version: 1,
};

const detail = {
  ...existing,
  tags: [],
  internalNotes: null,
  preferredContactChannel: null,
  marketingOptIn: null,
  creditScore: 100,
  overdueCount: 0,
  totalPurchaseRial: 0n,
  lastPurchaseAt: null,
  createdAt: new Date('2026-01-01'),
  createdById: 'staff-1',
  categoryId: null,
  status: 'active' as const,
  isBlacklisted: false,
  blacklistReason: null,
  assignedStaffId: null,
};

describe('SoftDeleteTenantCustomerUseCase', () => {
  const tenantCustomers = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    findDetailById: vi.fn(),
    softDelete: vi.fn(),
  };
  const sales = { getSalesSummaryForTenantCustomer: vi.fn() };
  const settings = { findByModule: vi.fn() };
  const unitOfWork = { transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})) };
  const audit = { log: vi.fn() };

  const useCase = new SoftDeleteTenantCustomerUseCase(
    tenantCustomers as never,
    sales as never,
    settings as never,
    unitOfWork as never,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCustomers.findActiveById.mockResolvedValue(existing);
    tenantCustomers.findDetailById.mockResolvedValue(detail);
    tenantCustomers.softDelete.mockResolvedValue({
      ...existing,
      deletedAt: new Date('2026-06-01'),
      deletedById: 'staff-1',
    });
    settings.findByModule.mockResolvedValue({});
    sales.getSalesSummaryForTenantCustomer.mockResolvedValue({ activeSalesCount: 0 });
  });

  it('soft deletes customer and audits customer.delete', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.id).toBe('tc-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.delete', entityId: 'tc-1' }),
    );
  });

  it('rejects delete when customer has active sales', async () => {
    sales.getSalesSummaryForTenantCustomer.mockResolvedValue({ activeSalesCount: 2 });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        actorId: 'staff-1',
        staffContext,
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_HAS_ACTIVE_SALES',
      httpStatus: 409,
    });
  });

  it('allows delete when tenant setting disables blocking', async () => {
    settings.findByModule.mockResolvedValue({
      block_customer_delete_with_active_sales: false,
    });
    sales.getSalesSummaryForTenantCustomer.mockResolvedValue({ activeSalesCount: 3 });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        actorId: 'staff-1',
        staffContext,
      }),
    ).resolves.toMatchObject({ id: 'tc-1' });
  });
});

describe('RestoreTenantCustomerUseCase', () => {
  const tenantCustomers = {
    findDeletedById: vi.fn(),
    findActiveById: vi.fn(),
    restore: vi.fn(),
    findDetailById: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new RestoreTenantCustomerUseCase(tenantCustomers as never, audit);

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCustomers.findDeletedById.mockResolvedValue({
      ...existing,
      deletedAt: new Date('2026-06-01'),
    });
    tenantCustomers.restore.mockResolvedValue({ ...existing, deletedAt: null });
    tenantCustomers.findDetailById.mockResolvedValue(detail);
  });

  it('restores deleted customer and audits customer.restore', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      actorId: 'staff-1',
    });

    expect(result.customer.id).toBe('tc-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.restore', entityId: 'tc-1' }),
    );
  });

  it('rejects restore when customer is not deleted', async () => {
    tenantCustomers.findDeletedById.mockResolvedValue(null);
    tenantCustomers.findActiveById.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        actorId: 'staff-1',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_DELETED',
      httpStatus: 409,
    });
  });
});

describe('ArchiveTenantCustomerUseCase', () => {
  const tenantCustomers = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    findDetailById: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  };
  const sales = {
    hasSaleForTenantCustomerInBranches: vi.fn(),
    hasSaleForTenantCustomerByStaff: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const archiveUseCase = new ArchiveTenantCustomerUseCase(
    tenantCustomers as never,
    sales as never,
    audit,
  );
  const unarchiveUseCase = new UnarchiveTenantCustomerUseCase(
    tenantCustomers as never,
    sales as never,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCustomers.findActiveById.mockResolvedValue(existing);
    tenantCustomers.findDetailById.mockResolvedValue(detail);
    tenantCustomers.archive.mockResolvedValue({ ...detail, status: 'archived' });
    tenantCustomers.unarchive.mockResolvedValue({ ...detail, status: 'active' });
  });

  it('archives customer and audits customer.archive', async () => {
    const result = await archiveUseCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.status).toBe('archived');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.archive', entityId: 'tc-1' }),
    );
  });

  it('unarchives customer and audits customer.unarchive', async () => {
    tenantCustomers.findDetailById.mockResolvedValue({ ...detail, status: 'archived' });

    const result = await unarchiveUseCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      actorId: 'staff-1',
      staffContext,
    });

    expect(result.status).toBe('active');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.unarchive', entityId: 'tc-1' }),
    );
  });
});
