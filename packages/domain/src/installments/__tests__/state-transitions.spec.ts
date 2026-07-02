import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import {
  InstallmentDomainErrorCode,
  PaymentAttemptDomainErrorCode,
  SaleDomainErrorCode,
} from '../errors.js';
import { Installment } from '../installment.entity.js';
import { InstallmentStatus, type InstallmentProps } from '../installment.types.js';
import { PaymentAttempt } from '../payment-attempt.entity.js';
import {
  PaymentAttemptStatus,
  ReportedByType,
  type PaymentAttemptProps,
} from '../payment-attempt.types.js';
import { Sale } from '../sale.entity.js';
import { SaleStatus, type SaleProps } from '../sale.types.js';

const STAFF_ID = '00000000-0000-0000-0000-000000000004';
const NOW = new Date('2026-06-15T12:00:00.000Z');

function baseInstallmentProps(overrides: Partial<InstallmentProps> = {}): InstallmentProps {
  return {
    id: '00000000-0000-0000-0000-000000000010',
    saleId: '00000000-0000-0000-0000-000000000011',
    tenantId: '00000000-0000-0000-0000-000000000001',
    sequenceNumber: 1,
    dueDate: new Date('2026-07-01T12:00:00.000Z'),
    amountRial: 3_333_334n,
    status: InstallmentStatus.PENDING,
    paidAt: null,
    confirmedByStaffId: null,
    waivedByStaffId: null,
    waiveReason: null,
    version: 1,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function basePaymentAttemptProps(
  overrides: Partial<PaymentAttemptProps> = {},
): PaymentAttemptProps {
  return {
    id: '00000000-0000-0000-0000-000000000020',
    installmentId: '00000000-0000-0000-0000-000000000010',
    tenantId: '00000000-0000-0000-0000-000000000001',
    reportedByType: ReportedByType.CUSTOMER,
    reportedById: '00000000-0000-0000-0000-000000000030',
    amountRial: 3_333_334n,
    status: PaymentAttemptStatus.PENDING,
    evidenceFileId: null,
    note: null,
    confirmedByStaffId: null,
    rejectedReason: null,
    idempotencyKey: null,
    confirmedAt: null,
    rejectedAt: null,
    version: 1,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseSaleProps(overrides: Partial<SaleProps> = {}): SaleProps {
  return {
    id: '00000000-0000-0000-0000-000000000040',
    tenantId: '00000000-0000-0000-0000-000000000001',
    branchId: '00000000-0000-0000-0000-000000000002',
    tenantCustomerId: '00000000-0000-0000-0000-000000000003',
    createdByStaffId: STAFF_ID,
    title: null,
    description: null,
    invoiceNumber: null,
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: null,
    installmentCount: 3,
    firstDueDate: new Date('2026-07-01T12:00:00.000Z'),
    intervalDays: 30,
    contractDate: new Date('2026-06-01T12:00:00.000Z'),
    status: SaleStatus.ACTIVE,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    terminatedAt: null,
    terminatedById: null,
    terminateReason: null,
    closedAt: null,
    closedById: null,
    closeReason: null,
    archivedAt: null,
    archivedById: null,
    archiveReason: null,
    version: 1,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('Installment state transitions (state-machines.md)', () => {
  it('pending → overdue via markOverdue()', () => {
    const installment = Installment.reconstitute(baseInstallmentProps());

    installment.markOverdue();

    expect(installment.status).toBe(InstallmentStatus.OVERDUE);
  });

  it('pending → paid via markPaid()', () => {
    const paidAt = new Date('2026-08-01T10:00:00.000Z');
    const installment = Installment.reconstitute(baseInstallmentProps());

    installment.markPaid(STAFF_ID, paidAt);

    expect(installment.status).toBe(InstallmentStatus.PAID);
    expect(installment.paidAt).toEqual(paidAt);
    expect(installment.confirmedByStaffId).toBe(STAFF_ID);
  });

  it('overdue → paid via markPaid()', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.OVERDUE }),
    );

    installment.markPaid(STAFF_ID);

    expect(installment.status).toBe(InstallmentStatus.PAID);
  });

  it('pending → waived via waive()', () => {
    const installment = Installment.reconstitute(baseInstallmentProps());

    installment.waive(STAFF_ID, 'توافق');

    expect(installment.status).toBe(InstallmentStatus.WAIVED);
    expect(installment.waiveReason).toBe('توافق');
  });

  it('overdue → waived via waive()', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.OVERDUE }),
    );

    installment.waive(STAFF_ID, 'بخشش مدیر');

    expect(installment.status).toBe(InstallmentStatus.WAIVED);
  });

  it('paid → waive forbidden', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.PAID }),
    );

    expect(() => installment.waive(STAFF_ID, 'دلیل')).toThrow(
      new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID),
    );
  });

  it('waived → markPaid forbidden', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.WAIVED }),
    );

    expect(() => installment.markPaid(STAFF_ID)).toThrow(
      new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED),
    );
  });

  it('paid → markOverdue forbidden', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.PAID }),
    );

    expect(() => installment.markOverdue()).toThrow(
      new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID),
    );
  });

  it('paid → markPaid forbidden', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.PAID }),
    );

    expect(() => installment.markPaid(STAFF_ID)).toThrow(
      new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID),
    );
  });

  it('waived → waive forbidden', () => {
    const installment = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.WAIVED }),
    );

    expect(() => installment.waive(STAFF_ID, 'دلیل')).toThrow(
      new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED),
    );
  });

  it('terminal states block all outgoing transitions via canTransitionTo()', () => {
    const paid = Installment.reconstitute(baseInstallmentProps({ status: InstallmentStatus.PAID }));
    const waived = Installment.reconstitute(
      baseInstallmentProps({ status: InstallmentStatus.WAIVED }),
    );

    for (const target of Object.values(InstallmentStatus)) {
      expect(paid.canTransitionTo(target)).toBe(false);
      expect(waived.canTransitionTo(target)).toBe(false);
    }
  });
});

describe('PaymentAttempt state transitions (state-machines.md)', () => {
  it('pending → confirmed', () => {
    const attempt = PaymentAttempt.reconstitute(basePaymentAttemptProps());

    attempt.confirm(STAFF_ID);

    expect(attempt.status).toBe(PaymentAttemptStatus.CONFIRMED);
    expect(attempt.confirmedByStaffId).toBe(STAFF_ID);
    expect(attempt.confirmedAt).toBeInstanceOf(Date);
  });

  it('pending → rejected', () => {
    const attempt = PaymentAttempt.reconstitute(basePaymentAttemptProps());

    attempt.reject(STAFF_ID, 'رسید نادرست');

    expect(attempt.status).toBe(PaymentAttemptStatus.REJECTED);
    expect(attempt.rejectedReason).toBe('رسید نادرست');
  });

  it('confirmed → reject forbidden', () => {
    const attempt = PaymentAttempt.reconstitute(
      basePaymentAttemptProps({ status: PaymentAttemptStatus.CONFIRMED }),
    );

    expect(() => attempt.reject(STAFF_ID, 'دلیل')).toThrow(
      new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED),
    );
  });

  it('rejected → confirm forbidden', () => {
    const attempt = PaymentAttempt.reconstitute(
      basePaymentAttemptProps({ status: PaymentAttemptStatus.REJECTED }),
    );

    expect(() => attempt.confirm(STAFF_ID)).toThrow(
      new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED),
    );
  });

  it('confirmed → confirm forbidden', () => {
    const attempt = PaymentAttempt.reconstitute(
      basePaymentAttemptProps({ status: PaymentAttemptStatus.CONFIRMED }),
    );

    expect(() => attempt.confirm(STAFF_ID)).toThrow(
      new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED),
    );
  });

  it('rejected → reject forbidden', () => {
    const attempt = PaymentAttempt.reconstitute(
      basePaymentAttemptProps({ status: PaymentAttemptStatus.REJECTED }),
    );

    expect(() => attempt.reject(STAFF_ID, 'دلیل دیگر')).toThrow(
      new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED),
    );
  });
});

describe('Sale state transitions (state-machines.md)', () => {
  it('active → cancelled when no paid installments', () => {
    const sale = Sale.reconstitute(baseSaleProps());

    sale.cancel('دیگر نیازی نیست', STAFF_ID, [
      { status: InstallmentStatus.PENDING },
      { status: InstallmentStatus.OVERDUE },
    ]);

    expect(sale.status).toBe(SaleStatus.CANCELLED);
    expect(sale.cancelReason).toBe('دیگر نیازی نیست');
    expect(sale.cancelledById).toBe(STAFF_ID);
  });

  it('active → completed when all installments terminal', () => {
    const sale = Sale.reconstitute(baseSaleProps());

    sale.markCompleted([
      { status: InstallmentStatus.PAID },
      { status: InstallmentStatus.WAIVED },
    ]);

    expect(sale.status).toBe(SaleStatus.COMPLETED);
  });

  it('cancel with paid installment forbidden — BR-011', () => {
    const sale = Sale.reconstitute(baseSaleProps());

    expect(() =>
      sale.cancel('لغو', STAFF_ID, [
        { status: InstallmentStatus.PAID },
        { status: InstallmentStatus.PENDING },
      ]),
    ).toThrow(new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT));
  });

  it('markCompleted with pending installment forbidden', () => {
    const sale = Sale.reconstitute(baseSaleProps());

    expect(() =>
      sale.markCompleted([
        { status: InstallmentStatus.PAID },
        { status: InstallmentStatus.PENDING },
      ]),
    ).toThrow(new DomainError(SaleDomainErrorCode.INSTALLMENT_STATUS_INVALID));
  });

  it('cancelled → cancel forbidden', () => {
    const sale = Sale.reconstitute(
      baseSaleProps({
        status: SaleStatus.CANCELLED,
        cancelledAt: NOW,
        cancelledById: STAFF_ID,
        cancelReason: 'قبلی',
      }),
    );

    expect(() => sale.cancel('دوباره', STAFF_ID, [])).toThrow(
      new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED),
    );
  });

  it('completed → cancel forbidden', () => {
    const sale = Sale.reconstitute(baseSaleProps({ status: SaleStatus.COMPLETED }));

    expect(() => sale.cancel('لغو', STAFF_ID, [])).toThrow(
      new DomainError(SaleDomainErrorCode.SALE_ALREADY_COMPLETED),
    );
  });

  it('completed → markCompleted is idempotent', () => {
    const sale = Sale.reconstitute(baseSaleProps({ status: SaleStatus.COMPLETED }));

    sale.markCompleted([{ status: InstallmentStatus.PAID }]);

    expect(sale.status).toBe(SaleStatus.COMPLETED);
  });
});

describe('PaymentAttempt auto-confirm rule (BR-014 / state-machines.md)', () => {
  it('auto-confirms staff report when requireSellerConfirmation=false', () => {
    expect(
      PaymentAttempt.shouldAutoConfirm({
        reportedByType: ReportedByType.STAFF,
        requireSellerConfirmation: false,
      }),
    ).toBe(true);
  });

  it('customer report always requires manual confirm', () => {
    expect(
      PaymentAttempt.shouldAutoConfirm({
        reportedByType: ReportedByType.CUSTOMER,
        requireSellerConfirmation: false,
      }),
    ).toBe(false);
  });

  it('staff report requires manual confirm when setting is on', () => {
    expect(
      PaymentAttempt.shouldAutoConfirm({
        reportedByType: ReportedByType.STAFF,
        requireSellerConfirmation: true,
      }),
    ).toBe(false);
  });
});
