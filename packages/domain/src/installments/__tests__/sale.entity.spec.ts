import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import { SaleDomainErrorCode } from '../errors.js';
import {
  SaleArchivedEvent,
  SaleClosedEvent,
  SaleTerminatedEvent,
} from '../events/sale-lifecycle.events.js';
import { InstallmentStatus } from '../installment.types.js';
import { Sale } from '../sale.entity.js';
import { SaleStatus, type CreateSaleInput } from '../sale.types.js';

function futureUtcDate(daysFromNow = 7): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function pastUtcDate(daysAgo = 1): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function baseCreateInput(overrides: Partial<CreateSaleInput> = {}): CreateSaleInput {
  return {
    tenantId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    tenantCustomerId: '00000000-0000-0000-0000-000000000003',
    createdByStaffId: '00000000-0000-0000-0000-000000000004',
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    installmentCount: 3,
    firstDueDate: futureUtcDate(),
    intervalDays: 30,
    contractDate: new Date('2026-06-01'),
    ...overrides,
  };
}

describe('Sale entity (TASK-065)', () => {
  describe('createInstallments', () => {
    it('Sale.createInstallments_sum_equals_total — 10M/3 installments', () => {
      const { sale, installments } = Sale.create(baseCreateInput());

      expect(installments).toHaveLength(3);
      const sum = installments.reduce((acc, draft) => acc + draft.amountRial, 0n);
      expect(sum + sale.downPaymentRial).toBe(sale.totalAmountRial);
      expect(sum).toBe(10_000_000n);
    });

    it('Sale.createInstallments_full_prepay_zero_installment — BR-004', () => {
      const { sale, installments } = Sale.create(
        baseCreateInput({
          totalAmountRial: 5_000_000n,
          downPaymentRial: 5_000_000n,
          installmentCount: 1,
        }),
      );

      expect(installments).toHaveLength(1);
      expect(installments[0].amountRial).toBe(0n);
      expect(sale.status).toBe('ACTIVE');
    });

    it('Sale.createInstallments_remainder_distribution — first N get +1', () => {
      const { installments } = Sale.create(baseCreateInput());

      expect(installments[0].amountRial).toBe(3_333_334n);
      expect(installments[1].amountRial).toBe(3_333_333n);
      expect(installments[2].amountRial).toBe(3_333_333n);
    });

    it('distributes due dates by intervalDays', () => {
      const firstDueDate = futureUtcDate(10);
      const { installments } = Sale.create(
        baseCreateInput({ firstDueDate, intervalDays: 15, installmentCount: 2 }),
      );

      expect(installments[0].dueDate.toISOString()).toBe(firstDueDate.toISOString());
      expect(installments[1].dueDate.getUTCDate()).toBe(
        new Date(firstDueDate.getTime() + 15 * 86_400_000).getUTCDate(),
      );
    });
  });

  describe('validateCreate', () => {
    it('Sale.validateCreate_rejects_past_due_date', () => {
      expect(() =>
        Sale.create(baseCreateInput({ firstDueDate: pastUtcDate() })),
      ).toThrow(new DomainError(SaleDomainErrorCode.DUE_DATE_IN_PAST));
    });

    it('rejects zero total amount', () => {
      expect(() => Sale.create(baseCreateInput({ totalAmountRial: 0n }))).toThrow(
        new DomainError(SaleDomainErrorCode.AMOUNT_MUST_BE_POSITIVE),
      );
    });

    it('rejects down payment exceeding total', () => {
      expect(() =>
        Sale.create(
          baseCreateInput({ totalAmountRial: 5_000_000n, downPaymentRial: 6_000_000n }),
        ),
      ).toThrow(new DomainError(SaleDomainErrorCode.AMOUNT_EXCEEDS_TOTAL));
    });

    it('rejects invalid installment count', () => {
      expect(() => Sale.create(baseCreateInput({ installmentCount: 0 }))).toThrow(
        new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID),
      );
      expect(() => Sale.create(baseCreateInput({ installmentCount: 121 }))).toThrow(
        new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID),
      );
    });

    it('rejects full prepay with count > 1 — BR-004', () => {
      expect(() =>
        Sale.create(
          baseCreateInput({
            totalAmountRial: 5_000_000n,
            downPaymentRial: 5_000_000n,
            installmentCount: 3,
          }),
        ),
      ).toThrow(new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID));
    });
  });

  describe('cancel', () => {
    it('Sale.cancel_rejects_when_paid_exists', () => {
      const { sale } = Sale.create(baseCreateInput());

      expect(() =>
        sale.cancel('دلیل لغو', 'staff-1', [
          { status: InstallmentStatus.PAID },
          { status: InstallmentStatus.PENDING },
        ]),
      ).toThrow(new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT));
    });

    it('Sale.cancel_allows_when_only_waived_overdue', () => {
      const { sale } = Sale.create(baseCreateInput());

      sale.cancel('دیگر نیازی نیست', 'staff-1', [
        { status: InstallmentStatus.WAIVED },
        { status: InstallmentStatus.OVERDUE },
        { status: InstallmentStatus.PENDING },
      ]);

      expect(sale.status).toBe('CANCELLED');
      expect(sale.cancelReason).toBe('دیگر نیازی نیست');
      expect(sale.cancelledById).toBe('staff-1');
      expect(sale.cancelledAt).toBeInstanceOf(Date);
    });

    it('rejects cancel when already cancelled', () => {
      const { sale } = Sale.create(baseCreateInput());
      sale.cancel('اول', 'staff-1', [{ status: InstallmentStatus.PENDING }]);

      expect(() =>
        sale.cancel('دوم', 'staff-2', [{ status: InstallmentStatus.PENDING }]),
      ).toThrow(new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED));
    });
  });

  describe('markCompleted', () => {
    it('Sale.markCompleted_when_all_terminal', () => {
      const { sale } = Sale.create(baseCreateInput({ installmentCount: 2 }));

      sale.markCompleted([
        { status: InstallmentStatus.PAID },
        { status: InstallmentStatus.WAIVED },
      ]);

      expect(sale.status).toBe('COMPLETED');
    });

    it('rejects when pending installment remains', () => {
      const { sale } = Sale.create(baseCreateInput({ installmentCount: 2 }));

      expect(() =>
        sale.markCompleted([
          { status: InstallmentStatus.PAID },
          { status: InstallmentStatus.PENDING },
        ]),
      ).toThrow(new DomainError(SaleDomainErrorCode.INSTALLMENT_STATUS_INVALID));
    });
  });

  describe('canSoftDelete', () => {
    it('returns false when any installment is paid', () => {
      const { sale } = Sale.create(baseCreateInput());

      expect(sale.canSoftDelete([{ status: InstallmentStatus.PAID }])).toBe(false);
    });

    it('returns true when only waived/overdue/pending', () => {
      const { sale } = Sale.create(baseCreateInput());

      expect(
        sale.canSoftDelete([
          { status: InstallmentStatus.WAIVED },
          { status: InstallmentStatus.OVERDUE },
        ]),
      ).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('round-trips via toProps', () => {
      const { sale } = Sale.create(baseCreateInput({ title: '  فروش تست  ' }));
      const restored = Sale.reconstitute(sale.toProps());

      expect(restored.id).toBe(sale.id);
      expect(restored.title).toBe('فروش تست');
      expect(restored.totalAmountRial).toBe(10_000_000n);
    });
  });
});

describe('Sale entity lifecycle (IFP-059)', () => {
  const ACTOR_ID = '00000000-0000-0000-0000-000000000099';
  const pendingOnly = [{ status: InstallmentStatus.PENDING }];
  const withPaid = [{ status: InstallmentStatus.PAID }, { status: InstallmentStatus.PENDING }];

  function activeSale() {
    return Sale.create(baseCreateInput()).sale;
  }

  function completedSale() {
    const sale = activeSale();
    sale.markCompleted([
      { status: InstallmentStatus.PAID },
      { status: InstallmentStatus.WAIVED },
      { status: InstallmentStatus.PAID },
    ]);
    return sale;
  }

  it('active → terminated OK and emits SaleTerminatedEvent', () => {
    const sale = activeSale();

    sale.terminate(ACTOR_ID, 'فسخ توافقی', new Date('2026-08-01T00:00:00.000Z'));

    expect(sale.status).toBe(SaleStatus.TERMINATED);
    expect(sale.terminateReason).toBe('فسخ توافقی');
    const events = sale.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(SaleTerminatedEvent);
    expect((events[0] as SaleTerminatedEvent).toPayload().effectiveDate).toBe(
      '2026-08-01T00:00:00.000Z',
    );
  });

  it('completed → terminated FAIL', () => {
    const sale = completedSale();

    expect(() => sale.terminate(ACTOR_ID, 'تلاش فسخ')).toThrow(
      new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION),
    );
  });

  it('archive from closed OK and emits SaleArchivedEvent', () => {
    const sale = activeSale();
    sale.close(ACTOR_ID, 'بستن قرارداد');
    sale.archive(ACTOR_ID, 'بایگانی پرونده');

    expect(sale.status).toBe(SaleStatus.ARCHIVED);
    const events = sale.pullDomainEvents();
    expect(events.at(-1)).toBeInstanceOf(SaleArchivedEvent);
  });

  it('archive from active FAIL', () => {
    const sale = activeSale();

    expect(() => sale.archive(ACTOR_ID, 'بایگانی زودهنگام')).toThrow(
      new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION),
    );
  });

  it('canEditFinancials false when paid installment exists', () => {
    const sale = activeSale();

    expect(sale.canEditFinancials(pendingOnly)).toBe(true);
    expect(sale.canEditFinancials(withPaid)).toBe(false);
  });

  it('cancel with paid installment FAIL', () => {
    const sale = activeSale();

    expect(() => sale.cancel('لغو', ACTOR_ID, withPaid)).toThrow(
      new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT),
    );
  });

  it('terminate when archived → SALE_ARCHIVED_READONLY', () => {
    const sale = activeSale();
    sale.close(ACTOR_ID, 'بستن');
    sale.archive(ACTOR_ID, 'بایگانی');

    expect(() => sale.terminate(ACTOR_ID, 'تلاش فسخ')).toThrow(
      new DomainError(SaleDomainErrorCode.SALE_ARCHIVED_READONLY),
    );
  });

  it('terminated → closed OK and emits SaleClosedEvent', () => {
    const sale = activeSale();
    sale.terminate(ACTOR_ID, 'فسخ');
    sale.close(ACTOR_ID, 'تسویه پس از فسخ', { waiveRemaining: true });

    expect(sale.status).toBe(SaleStatus.CLOSED);
    const events = sale.pullDomainEvents();
    expect(events.at(-1)).toBeInstanceOf(SaleClosedEvent);
    expect((events.at(-1) as SaleClosedEvent).toPayload().waiveRemaining).toBe(true);
  });

  it('unarchive restores prior status from metadata', () => {
    const sale = activeSale();
    sale.close(ACTOR_ID, 'بستن');
    sale.archive(ACTOR_ID, 'بایگانی');
    sale.unarchive(ACTOR_ID);

    expect(sale.status).toBe(SaleStatus.CLOSED);
    expect(sale.archivedAt).toBeNull();
  });

  it('canExtend requires active status and later due date', () => {
    const sale = activeSale();
    const lastDue = futureUtcDate(30);
    const earlier = futureUtcDate(10);

    expect(sale.canExtend(lastDue, futureUtcDate(60))).toBe(true);
    expect(sale.canExtend(lastDue, earlier)).toBe(false);
  });

  it('canCopy false when archived', () => {
    const sale = activeSale();
    expect(sale.canCopy()).toBe(true);
    sale.close(ACTOR_ID, 'بستن');
    sale.archive(ACTOR_ID, 'بایگانی');
    expect(sale.canCopy()).toBe(false);
  });

  it('archived forbids further archive', () => {
    const sale = activeSale();
    sale.close(ACTOR_ID, 'بستن');
    sale.archive(ACTOR_ID, 'بایگانی');

    expect(() => sale.archive(ACTOR_ID, 'دوباره')).toThrow(
      new DomainError(SaleDomainErrorCode.SALE_ARCHIVED_READONLY),
    );
  });
});
