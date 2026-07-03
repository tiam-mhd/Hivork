import { ApplicationError, DeferInstallmentUseCase } from '@hivork/application';
import {
  DeferPolicy,
  InstallmentOperationsService,
  InstallmentStatus,
} from '@hivork/domain';
import { describe, expect, it, vi } from 'vitest';

import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';

describe('DeferInstallmentUseCase (domain delegation)', () => {
  it('adds exactly deferDays to dueDate via domain calculator', () => {
    const currentDueDate = new Date('2026-08-01T12:00:00.000Z');
    const deferred = InstallmentOperationsService.computeDeferredDueDate(currentDueDate, 7);

    expect(deferred.toISOString()).toBe('2026-08-08T12:00:00.000Z');
  });

  it('delegates max defer validation to InstallmentOperationsService', () => {
    const validation = InstallmentOperationsService.validateDefer({
      installment: {
        id: 'i-1',
        saleId: 's-1',
        sequenceNumber: 1,
        dueDate: new Date('2026-08-01T12:00:00.000Z'),
        amountRial: 1_000_000n,
        status: InstallmentStatus.PENDING,
      },
      deferDays: 31,
      policy: DeferPolicy.fromSettings({ defer_max_days: 30 }),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('DEFER_MAX_EXCEEDED');
    }
  });

  it('maps overdue status to ApplicationError without updating dueDate', async () => {
    const rescheduleDueDate = vi.fn();
    const installments = {
      findByIdWithSale: vi.fn().mockResolvedValue({
        installment: {
          id: 'i-1',
          saleId: 's-1',
          tenantId: 't-1',
          sequenceNumber: 1,
          dueDate: new Date('2026-08-01T12:00:00.000Z'),
          amountRial: 1_000_000n,
          status: 'OVERDUE',
          paidAt: null,
          confirmedByStaffId: null,
          waivedByStaffId: null,
          waiveReason: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        sale: {
          id: 's-1',
          branchId: 'b-1',
          status: 'ACTIVE',
          archivedAt: null,
          createdByStaffId: 'staff-1',
        },
      }),
      rescheduleDueDate,
    } as unknown as IInstallmentRepository;

    const useCase = new DeferInstallmentUseCase(
      { transaction: (fn) => fn({}) } as never,
      installments,
      { append: vi.fn(), findLatestDeferLogForInstallment: vi.fn() } as never,
      { existsActiveInTenant: vi.fn().mockResolvedValue(true) } as never,
      { findByModule: vi.fn().mockResolvedValue({ defer_max_days: 30 }) } as never,
      { log: vi.fn() } as never,
    );

    await expect(
      useCase.execute({
        tenantId: 't-1',
        branchId: 'b-1',
        staffId: 'staff-1',
        installmentId: 'i-1',
        deferDays: 7,
        expectedVersion: 1,
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'all',
          assignedBranchIds: ['b-1'],
          activeBranchId: 'b-1',
        },
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_STATUS_INVALID',
      httpStatus: 409,
    });

    expect(rescheduleDueDate).not.toHaveBeenCalled();
  });
});
