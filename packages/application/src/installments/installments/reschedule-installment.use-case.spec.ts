import { ApplicationError, RescheduleInstallmentUseCase } from '@hivork/application';
import { InstallmentStatus, InstallmentOperationsService, ReschedulePolicy } from '@hivork/domain';
import { describe, expect, it, vi } from 'vitest';

import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';

describe('RescheduleInstallmentUseCase (domain delegation)', () => {
  it('delegates status validation to InstallmentOperationsService', () => {
    const installment = {
      id: 'i-1',
      saleId: 's-1',
      sequenceNumber: 1,
      dueDate: new Date('2026-12-01T12:00:00.000Z'),
      amountRial: 1_000_000n,
      status: 'PAID' as const,
    };

    const validation = InstallmentOperationsService.validateReschedule({
      installment: {
        ...installment,
        status: InstallmentStatus.PAID,
      },
      newDueDate: new Date('2027-01-01T12:00:00.000Z'),
      policy: ReschedulePolicy.fromSettings(),
    });

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.error).toBe('INSTALLMENT_STATUS_INVALID');
    }
  });

  it('maps domain validation failure to ApplicationError without calling repository update', async () => {
    const rescheduleDueDate = vi.fn();
    const installments = {
      findByIdWithSale: vi.fn().mockResolvedValue({
        installment: {
          id: 'i-1',
          saleId: 's-1',
          tenantId: 't-1',
          sequenceNumber: 1,
          dueDate: new Date('2026-12-01T12:00:00.000Z'),
          amountRial: 1_000_000n,
          status: 'PAID',
          paidAt: new Date(),
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

    const useCase = new RescheduleInstallmentUseCase(
      { transaction: (fn) => fn({}) } as never,
      installments,
      { append: vi.fn() } as never,
      { existsActiveInTenant: vi.fn().mockResolvedValue(true) } as never,
      { findByModule: vi.fn().mockResolvedValue({}) } as never,
      { log: vi.fn() } as never,
    );

    await expect(
      useCase.execute({
        tenantId: 't-1',
        branchId: 'b-1',
        staffId: 'staff-1',
        installmentId: 'i-1',
        newDueDate: '2027-01-15',
        expectedVersion: 1,
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'all',
          assignedBranchIds: ['b-1'],
          activeBranchId: 'b-1',
        },
      }),
    ).rejects.toBeInstanceOf(ApplicationError);

    expect(rescheduleDueDate).not.toHaveBeenCalled();
  });
});
