import { ApplicationError } from '@hivork/application';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CustomersController } from './customers.controller.js';

describe('CustomersController', () => {
  const createTenantCustomer = { execute: vi.fn() };
  const listTenantCustomers = { execute: vi.fn() };
  const getTenantCustomer = { execute: vi.fn() };
  const updateTenantCustomer = { execute: vi.fn() };
  const importCustomersExcel = { execute: vi.fn() };
  const softDeleteTenantCustomer = { execute: vi.fn() };
  const restoreTenantCustomer = { execute: vi.fn() };
  const archiveTenantCustomer = { execute: vi.fn() };
  const unarchiveTenantCustomer = { execute: vi.fn() };
  const listDeletedCustomers = { execute: vi.fn() };
  const bulkTagCustomers = { execute: vi.fn() };
  const bulkUntagCustomers = { execute: vi.fn() };
  const getStaffPermissions = {
    execute: vi.fn().mockResolvedValue(new Set(['installments.customer.create'])),
    hasPermission: vi.fn((_effective: Set<string>, permission: string) =>
      permission === 'installments.customer.create' || permission === 'installments.customer.blacklist',
    ),
  };
  const exportTenantCustomers = { execute: vi.fn() };
  const appConfig = { exportMaxRows: 50000 };

  const controller = new CustomersController(
    createTenantCustomer as unknown as never,
    listTenantCustomers as unknown as never,
    exportTenantCustomers as unknown as never,
    getTenantCustomer as unknown as never,
    updateTenantCustomer as unknown as never,
    softDeleteTenantCustomer as unknown as never,
    restoreTenantCustomer as unknown as never,
    archiveTenantCustomer as unknown as never,
    unarchiveTenantCustomer as unknown as never,
    importCustomersExcel as unknown as never,
    listDeletedCustomers as unknown as never,
    bulkTagCustomers as unknown as never,
    bulkUntagCustomers as unknown as never,
    getStaffPermissions as unknown as never,
    appConfig as never,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  const detailFixture = {
    id: 'tc-1',
    tenantId: 'tenant-1',
    globalCustomerId: 'global-1',
    version: 2,
    globalCustomer: {
      id: 'global-1',
      phone: '09123456789',
      name: 'علی',
      email: null,
      nationalId: null,
      birthDate: null,
      gender: 'unspecified' as const,
      address: null,
      status: 'active' as const,
    },
    localCode: 'C-001',
    tags: ['vip'],
    notes: null,
    internalNotes: null,
    defaultBranchId: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    preferredContactChannel: null,
    marketingOptIn: null,
    creditScore: 100,
    overdueCount: 0,
    totalPurchaseRial: 0n,
    lastPurchaseAt: null,
    metadata: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T11:00:00.000Z'),
    createdById: 'staff-1',
  };

  it('creates tenant customer and maps response', async () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    createTenantCustomer.execute.mockResolvedValue({
      customer: {
        id: 'tc-1',
        tenantId: 'tenant-1',
        globalCustomerId: 'global-1',
        localCode: 'C-001',
        tags: ['vip'],
        notes: null,
        internalNotes: null,
        defaultBranchId: null,
        preferredContactChannel: null,
        marketingOptIn: true,
        creditScore: 100,
        overdueCount: 0,
        totalPurchaseRial: 0n,
        lastPurchaseAt: null,
        createdAt,
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        version: 1,
        createdById: 'staff-1',
        categoryId: null,
        status: 'active',
        isBlacklisted: false,
        blacklistReason: null,
        assignedStaffId: null,
        addresses: [],
        emergencyContacts: [],
        contactPhones: [],
      },
      globalCustomer: {
        id: 'global-1',
        phone: '09123456789',
        name: 'علی',
        status: 'active',
        email: null,
        nationalId: null,
        birthDate: null,
        gender: null,
        address: null,
        preferredContactChannel: null,
        marketingOptIn: false,
        deletedAt: null,
      },
      restored: false,
    });

    const result = await controller.create(
      staff,
      { phone: '09123456789', name: 'علی' },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result).toMatchObject({
      id: 'tc-1',
      totalPurchaseRial: '0',
      customer: { phone: '09123456789', name: 'علی' },
    });
  });

  it('lists active customers', async () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    listTenantCustomers.execute.mockResolvedValue({
      data: [
        {
          id: 'tc-1',
          globalCustomer: { id: 'global-1', phone: '09123456789', name: 'علی' },
          localCode: 'C-001',
          tags: ['vip'],
          creditScore: 100,
          overdueCount: 0,
          totalPurchaseRial: 0n,
          lastPurchaseAt: null,
          preferredContactChannel: null,
          createdAt,
        },
      ],
      meta: { total: 1, hasNext: false, nextCursor: null },
    });

    const result = await controller.list(staff, {});

    expect(result.meta.total).toBe(1);
    expect(result.data[0]?.globalCustomer.phone).toBe('09123456789');
  });

  it('gets customer detail', async () => {
    getTenantCustomer.execute.mockResolvedValue(detailFixture);

    const result = await controller.getById(staff, '00000000-0000-4000-8000-000000000001', {});

    expect(result).toMatchObject({
      id: 'tc-1',
      version: 2,
      globalCustomer: { phone: '09123456789' },
      totalPurchaseRial: '0',
    });
  });

  it('updates customer and returns refreshed detail', async () => {
    updateTenantCustomer.execute.mockResolvedValue(detailFixture);
    getTenantCustomer.execute.mockResolvedValue({
      ...detailFixture,
      localCode: 'C-002',
      version: 3,
    });

    const result = await controller.update(
      staff,
      '00000000-0000-4000-8000-000000000001',
      { version: 2, localCode: 'C-002' },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(updateTenantCustomer.execute).toHaveBeenCalled();
    expect(result).toMatchObject({ localCode: 'C-002', version: 3 });
  });

  it('imports customers from uploaded file', async () => {
    importCustomersExcel.execute.mockResolvedValue({
      totalRows: 1,
      successCount: 1,
      failedCount: 0,
      errorCount: 0,
      errors: [],
    });

    const result = await controller.importCustomers(
      staff,
      { buffer: Buffer.from('file') } as Express.Multer.File,
      '00000000-0000-4000-8000-000000000099',
      {},
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result).toEqual({
      data: {
        totalRows: 1,
        successCount: 1,
        failedCount: 0,
        errorCount: 0,
        errors: [],
      },
    });
  });

  it('maps invalid restore target to 409 NOT_DELETED', async () => {
    restoreTenantCustomer.execute.mockRejectedValue(
      new ApplicationError('NOT_DELETED', 'Customer is not deleted.', 409),
    );

    await expect(
      controller.restore(
        staff,
        '00000000-0000-4000-8000-000000000001',
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'NOT_DELETED' },
      status: 409,
    });
  });

  it('maps already deleted to 409 on soft delete', async () => {
    softDeleteTenantCustomer.execute.mockRejectedValue(
      new ApplicationError('ALREADY_DELETED', 'Customer is already deleted.', 409),
    );

    await expect(
      controller.softDelete(
        staff,
        '00000000-0000-4000-8000-000000000001',
        {},
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
