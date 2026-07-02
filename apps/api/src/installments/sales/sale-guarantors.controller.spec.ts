import { ApplicationError, CreateContractGuarantorUseCase } from '@hivork/application';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { SaleGuarantorsController } from './sale-guarantors.controller.js';

describe('SaleGuarantorsController (IFP-067)', () => {
  const listGuarantors = { execute: vi.fn() };
  const createGuarantor = { execute: vi.fn() };
  const noop = { execute: vi.fn() };

  const controller = new SaleGuarantorsController(
    listGuarantors as never,
    createGuarantor as unknown as CreateContractGuarantorUseCase,
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

  it('lists guarantors for a sale', async () => {
    listGuarantors.execute.mockResolvedValue([
      {
        id: 'g-1',
        saleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        relationship: 'parent',
      },
    ]);

    const result = await controller.list(staff, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    expect(result.data).toHaveLength(1);
    expect(listGuarantors.execute).toHaveBeenCalled();
  });

  it('creates guarantor when branch header is present', async () => {
    createGuarantor.execute.mockResolvedValue({
      id: 'g-1',
      saleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      tenantCustomerId: null,
      fullName: 'ضامن',
      nationalId: null,
      phone: '09123456789',
      relationship: 'parent',
      note: null,
      sortOrder: 0,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      createdById: 'staff-1',
      version: 1,
    });

    const result = await controller.create(
      staff,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      {
        fullName: 'ضامن',
        phone: '09123456789',
        relationship: 'parent',
      },
      {
        ip: '127.0.0.1',
        headers: { 'x-branch-id': 'branch-1' },
      } as never,
    );

    expect(result.data.id).toBe('g-1');
    expect(createGuarantor.execute).toHaveBeenCalled();
  });

  it('maps application errors to HTTP exceptions', async () => {
    createGuarantor.execute.mockRejectedValue(
      new ApplicationError('GUARANTOR_LIMIT_EXCEEDED', 'Limit reached.', 409),
    );

    await expect(
      controller.create(
        staff,
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        {
          fullName: 'ضامن',
          phone: '09123456789',
          relationship: 'parent',
        },
        {
          ip: '127.0.0.1',
          headers: { 'x-branch-id': 'branch-1' },
        } as never,
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
