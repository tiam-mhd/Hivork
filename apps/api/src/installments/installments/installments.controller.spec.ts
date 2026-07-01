import { ApplicationError, ListInstallmentsUseCase } from '@hivork/application';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { InstallmentsController } from './installments.controller.js';

describe('InstallmentsController', () => {
  const listInstallments = { execute: vi.fn() };
  const controller = new InstallmentsController(
    listInstallments as unknown as ListInstallmentsUseCase,
  );

  const staff = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    primaryBranchId: 'branch-1',
    activeBranchId: null,
  };

  it('lists installments with pagination meta', async () => {
    listInstallments.execute.mockResolvedValue({
      data: [
        {
          id: 'inst-1',
          saleId: 'sale-1',
          customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
          branchId: 'branch-1',
          sequenceNumber: 1,
          dueDate: '2026-08-01T00:00:00.000Z',
          amountRial: '2000000',
          status: 'pending',
        },
      ],
      meta: { total: 1, hasNext: false, nextCursor: null },
    });

    const result = await controller.list(staff, { limit: '10', status: 'pending' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.amountRial).toBe('2000000');
    expect(result.meta.total).toBe(1);
    expect(listInstallments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        status: 'pending',
        limit: 10,
      }),
    );
  });

  it('passes multi-status filter as statuses array', async () => {
    listInstallments.execute.mockResolvedValue({
      data: [],
      meta: { total: 0, hasNext: false, nextCursor: null },
    });

    await controller.list(staff, { status: 'pending,overdue' });

    expect(listInstallments.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        statuses: ['pending', 'overdue'],
      }),
    );
  });

  it('maps application errors to HTTP exceptions', async () => {
    listInstallments.execute.mockRejectedValue(
      new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is not allowed.', 403),
    );

    await expect(controller.list(staff, {})).rejects.toBeInstanceOf(HttpException);
  });
});
