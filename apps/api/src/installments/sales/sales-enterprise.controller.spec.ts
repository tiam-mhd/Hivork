import { ApplicationError, TerminateContractUseCase } from '@hivork/application';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { SalesEnterpriseController } from './sales-enterprise.controller.js';

describe('SalesEnterpriseController (IFP-064)', () => {
  const terminateContract = { execute: vi.fn() };
  const noop = { execute: vi.fn() };

  const controller = new SalesEnterpriseController(
    noop as never,
    noop as never,
    terminateContract as unknown as TerminateContractUseCase,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
    noop as never,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    primaryBranchId: 'branch-1',
    activeBranchId: 'branch-1',
  };

  it('terminates contract when branch header is present', async () => {
    terminateContract.execute.mockResolvedValue({
      id: 'sale-1',
      status: 'terminated',
      contractNumber: null,
      customTerms: null,
      signatureStatus: 'unsigned',
      signedAt: null,
      insuranceRial: null,
      insuranceProvider: null,
      extendedFromSaleId: null,
      copiedFromSaleId: null,
      terminatedAt: '2026-07-01T00:00:00.000Z',
      closedAt: null,
      archivedAt: null,
      tenantCustomerId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      branchId: 'branch-1',
      title: null,
      totalAmountRial: '1000000',
      downPaymentRial: '0',
      installmentCount: 1,
      installments: [],
      createdAt: '2026-07-01T10:00:00.000Z',
    });

    const result = await controller.terminate(
      staff,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      { reason: 'فسخ توافقی' },
      {
        ip: '127.0.0.1',
        headers: { 'x-branch-id': 'branch-1' },
      } as never,
    );

    expect(result.data.status).toBe('terminated');
    expect(terminateContract.execute).toHaveBeenCalled();
  });

  it('maps application errors to HTTP exceptions', async () => {
    terminateContract.execute.mockRejectedValue(
      new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404),
    );

    await expect(
      controller.terminate(
        staff,
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        { reason: 'فسخ توافقی' },
        {
          ip: '127.0.0.1',
          headers: { 'x-branch-id': 'branch-1' },
        } as never,
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
