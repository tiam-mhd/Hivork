import { ApplicationError, CreateContractGuarantorUseCase } from '@hivork/application';
import { describe, expect, it, vi } from 'vitest';

describe('CreateContractGuarantorUseCase (IFP-067)', () => {
  const sales = { findById: vi.fn() };
  const installments = { findBySaleId: vi.fn() };
  const guarantors = {
    countActiveBySale: vi.fn(),
    create: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new CreateContractGuarantorUseCase(
    sales as never,
    installments as never,
    guarantors as never,
    audit as never,
  );

  const baseInput = {
    tenantId: 'tenant-1',
    staffId: 'staff-1',
    branchId: 'branch-1',
    saleId: 'sale-1',
    relationship: 'parent' as const,
    fullName: 'ضامن تست',
    phone: '09123456789',
    staffContext: {
      staffId: 'staff-1',
      dataScope: 'all' as const,
      assignedBranchIds: ['branch-1'],
      activeBranchId: 'branch-1',
    },
  };

  it('creates external guarantor and audits', async () => {
    sales.findById.mockResolvedValue({
      id: 'sale-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      deletedAt: null,
      archivedAt: null,
      status: 'ACTIVE',
      createdByStaffId: 'staff-1',
    });
    installments.findBySaleId.mockResolvedValue([]);
    guarantors.countActiveBySale.mockResolvedValue(0);
    guarantors.create.mockImplementation(async (input) => ({
      ...input,
      tenantCustomerId: null,
      nationalId: null,
      note: null,
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      metadata: null,
    }));

    const result = await useCase.execute(baseInput);

    expect(result.fullName).toBe('ضامن تست');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.guarantor.create' }),
    );
  });

  it('rejects when guarantor limit exceeded', async () => {
    sales.findById.mockResolvedValue({
      id: 'sale-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      deletedAt: null,
      archivedAt: null,
      status: 'ACTIVE',
      createdByStaffId: 'staff-1',
    });
    installments.findBySaleId.mockResolvedValue([]);
    guarantors.countActiveBySale.mockResolvedValue(10);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'GUARANTOR_LIMIT_EXCEEDED',
    });
  });

  it('rejects archived sale', async () => {
    sales.findById.mockResolvedValue({
      id: 'sale-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      deletedAt: null,
      archivedAt: new Date(),
      status: 'ACTIVE',
      createdByStaffId: 'staff-1',
    });
    installments.findBySaleId.mockResolvedValue([]);

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(ApplicationError);
    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ARCHIVED_READONLY',
    });
  });
});
