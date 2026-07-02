import {
  ApplicationError,
  CancelSaleUseCase,
  CreateSaleUseCase,
  GetSaleEnterpriseUseCase,
  ListSalesUseCase,
} from '@hivork/application';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { SalesController } from './sales.controller.js';

describe('SalesController', () => {
  const createSale = { execute: vi.fn() };
  const listSales = { execute: vi.fn() };
  const getSaleEnterprise = { execute: vi.fn() };
  const cancelSale = { execute: vi.fn() };

  const controller = new SalesController(
    createSale as unknown as CreateSaleUseCase,
    listSales as unknown as ListSalesUseCase,
    getSaleEnterprise as unknown as GetSaleEnterpriseUseCase,
    cancelSale as unknown as CancelSaleUseCase,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    primaryBranchId: 'branch-1',
    activeBranchId: null,
  };

  const validCreateBody = {
    tenantCustomerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    branchId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    title: 'فروش تست',
    totalAmountRial: '5000000',
    downPaymentRial: '1000000',
    installmentCount: 4,
    firstDueDate: '2026-08-01',
    contractDate: '2026-07-01',
  };

  it('creates sale when idempotency key is present', async () => {
    createSale.execute.mockResolvedValue({
      id: 'sale-1',
      tenantCustomerId: validCreateBody.tenantCustomerId,
      branchId: validCreateBody.branchId,
      title: validCreateBody.title,
      totalAmountRial: '5000000',
      downPaymentRial: '1000000',
      installmentCount: 4,
      status: 'active',
      installments: [],
      createdAt: '2026-07-01T10:00:00.000Z',
    });

    const result = await controller.create(
      staff,
      validCreateBody,
      'cccccccc-dddd-eeee-ffff-000000000001',
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.data?.id).toBe('sale-1');
    expect(createSale.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        idempotencyKey: 'cccccccc-dddd-eeee-ffff-000000000001',
        totalAmountRial: 5_000_000n,
      }),
    );
  });

  it('rejects create without idempotency key', async () => {
    await expect(
      controller.create(staff, validCreateBody, undefined, { ip: '127.0.0.1', headers: {} } as never),
    ).rejects.toMatchObject({ response: { code: 'FIELD_REQUIRED' } });
  });

  it('lists sales with pagination meta', async () => {
    listSales.execute.mockResolvedValue({
      data: [
        {
          id: 'sale-1',
          tenantCustomerId: validCreateBody.tenantCustomerId,
          branchId: validCreateBody.branchId,
          title: 'فروش',
          totalAmountRial: '5000000',
          downPaymentRial: '1000000',
          installmentCount: 4,
          status: 'active',
          createdAt: '2026-07-01T10:00:00.000Z',
        },
      ],
      meta: { nextCursor: null, hasMore: false },
    });

    const result = await controller.list(staff, { limit: '10' });

    expect(result.data).toHaveLength(1);
    expect(result.meta.hasMore).toBe(false);
  });

  it('gets sale by id', async () => {
    getSaleEnterprise.execute.mockResolvedValue({
      id: 'sale-1',
      tenantCustomerId: validCreateBody.tenantCustomerId,
      customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
      branchId: validCreateBody.branchId,
      title: 'فروش',
      totalAmountRial: '5000000',
      downPaymentRial: '1000000',
      installmentCount: 4,
      status: 'active',
      contractNumber: null,
      customTerms: null,
      signatureStatus: 'unsigned',
      signedAt: null,
      insuranceRial: null,
      insuranceProvider: null,
      extendedFromSaleId: null,
      copiedFromSaleId: null,
      terminatedAt: null,
      closedAt: null,
      archivedAt: null,
      installments: [],
      createdAt: '2026-07-01T10:00:00.000Z',
    });

    const result = await controller.getById(
      staff,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      {},
    );
    expect(result.data.customer).toEqual({ id: 'gc-1', phone: '09123456789', name: 'علی' });
  });

  it('cancels sale', async () => {
    cancelSale.execute.mockResolvedValue({
      status: 'cancelled',
      cancelledAt: new Date('2026-07-02T08:00:00.000Z'),
    });

    const result = await controller.cancel(
      staff,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      { reason: 'مشتری انصراف داد' },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result).toEqual({
      status: 'cancelled',
      cancelledAt: '2026-07-02T08:00:00.000Z',
    });
  });

  it('maps application errors to HTTP exceptions', async () => {
    createSale.execute.mockRejectedValue(
      new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404),
    );

    await expect(
      controller.create(
        staff,
        validCreateBody,
        'cccccccc-dddd-eeee-ffff-000000000001',
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
