import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import { InstallmentDomainErrorCode } from '../errors.js';
import { Installment } from '../installment.entity.js';
import { InstallmentStatus, type InstallmentDraft } from '../installment.types.js';

function baseDraft(overrides: Partial<InstallmentDraft> = {}): InstallmentDraft {
  return {
    saleId: '00000000-0000-0000-0000-000000000010',
    tenantId: '00000000-0000-0000-0000-000000000001',
    sequenceNumber: 1,
    dueDate: new Date('2026-07-01T12:00:00.000Z'),
    amountRial: 3_333_334n,
    status: InstallmentStatus.PENDING,
    ...overrides,
  };
}

describe('Installment entity (TASK-066)', () => {
  describe('markOverdue', () => {
    it('Installment.markOverdue_from_pending', () => {
      const installment = Installment.create(baseDraft());

      installment.markOverdue();

      expect(installment.status).toBe(InstallmentStatus.OVERDUE);
    });

    it('rejects markOverdue when already overdue', () => {
      const installment = Installment.create(baseDraft());
      installment.markOverdue();

      expect(() => installment.markOverdue()).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID),
      );
    });

    it('rejects markOverdue from paid', () => {
      const installment = Installment.create(baseDraft());
      installment.markPaid('staff-1');

      expect(() => installment.markOverdue()).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID),
      );
    });
  });

  describe('markPaid', () => {
    it('Installment.markPaid_from_pending_and_overdue', () => {
      const fromPending = Installment.create(baseDraft({ sequenceNumber: 1 }));
      const paidAt = new Date('2026-08-01T10:00:00.000Z');
      fromPending.markPaid('staff-confirm-1', paidAt);

      expect(fromPending.status).toBe(InstallmentStatus.PAID);
      expect(fromPending.paidAt).toEqual(paidAt);
      expect(fromPending.confirmedByStaffId).toBe('staff-confirm-1');

      const fromOverdue = Installment.create(baseDraft({ sequenceNumber: 2 }));
      fromOverdue.markOverdue();
      fromOverdue.markPaid('staff-confirm-2');

      expect(fromOverdue.status).toBe(InstallmentStatus.PAID);
      expect(fromOverdue.confirmedByStaffId).toBe('staff-confirm-2');
      expect(fromOverdue.paidAt).toBeInstanceOf(Date);
    });

    it('Installment.markPaid_rejects_when_already_paid', () => {
      const installment = Installment.create(baseDraft());
      installment.markPaid('staff-1');

      expect(() => installment.markPaid('staff-2')).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID),
      );
    });

    it('Installment.markPaid_rejects_when_waived', () => {
      const installment = Installment.create(baseDraft());
      installment.waive('staff-1', 'بخشودگی');

      expect(() => installment.markPaid('staff-2')).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED),
      );
    });
  });

  describe('waive', () => {
    it('Installment.waive_from_pending_and_overdue', () => {
      const fromPending = Installment.create(baseDraft({ sequenceNumber: 1 }));
      fromPending.waive('staff-waive-1', '  توافق با مشتری  ');

      expect(fromPending.status).toBe(InstallmentStatus.WAIVED);
      expect(fromPending.waivedByStaffId).toBe('staff-waive-1');
      expect(fromPending.waiveReason).toBe('توافق با مشتری');

      const fromOverdue = Installment.create(baseDraft({ sequenceNumber: 2 }));
      fromOverdue.markOverdue();
      fromOverdue.waive('staff-waive-2', 'بخشش مدیر');

      expect(fromOverdue.status).toBe(InstallmentStatus.WAIVED);
    });

    it('rejects waive without reason', () => {
      const installment = Installment.create(baseDraft());

      expect(() => installment.waive('staff-1', '   ')).toThrow(
        new DomainError(InstallmentDomainErrorCode.WAIVE_REASON_REQUIRED),
      );
    });

    it('rejects waive when already paid', () => {
      const installment = Installment.create(baseDraft());
      installment.markPaid('staff-1');

      expect(() => installment.waive('staff-2', 'دلیل')).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID),
      );
    });
  });

  describe('assertCanDelete', () => {
    it('Installment.assertCanDelete_always_throws', () => {
      const installment = Installment.create(baseDraft());

      expect(() => installment.assertCanDelete()).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_CANNOT_DELETE),
      );

      installment.markPaid('staff-1');
      expect(() => installment.assertCanDelete()).toThrow(
        new DomainError(InstallmentDomainErrorCode.INSTALLMENT_CANNOT_DELETE),
      );
    });
  });

  describe('isTerminal', () => {
    it('Installment.isTerminal_paid_and_waived', () => {
      const paid = Installment.create(baseDraft({ sequenceNumber: 1 }));
      expect(paid.isTerminal()).toBe(false);
      paid.markPaid('staff-1');
      expect(paid.isTerminal()).toBe(true);

      const waived = Installment.create(baseDraft({ sequenceNumber: 2 }));
      waived.waive('staff-1', 'دلیل');
      expect(waived.isTerminal()).toBe(true);

      const pending = Installment.create(baseDraft({ sequenceNumber: 3 }));
      expect(pending.isTerminal()).toBe(false);
      pending.markOverdue();
      expect(pending.isTerminal()).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('reflects allowed transition matrix', () => {
      const installment = Installment.create(baseDraft());

      expect(installment.canTransitionTo(InstallmentStatus.OVERDUE)).toBe(true);
      expect(installment.canTransitionTo(InstallmentStatus.PAID)).toBe(true);
      expect(installment.canTransitionTo(InstallmentStatus.WAIVED)).toBe(true);
      expect(installment.canTransitionTo(InstallmentStatus.PENDING)).toBe(false);

      installment.markOverdue();
      expect(installment.canTransitionTo(InstallmentStatus.PAID)).toBe(true);
      expect(installment.canTransitionTo(InstallmentStatus.OVERDUE)).toBe(false);

      installment.markPaid('staff-1');
      expect(installment.canTransitionTo(InstallmentStatus.WAIVED)).toBe(false);
    });
  });

  describe('create / reconstitute', () => {
    it('creates from draft with zero amount (BR-004)', () => {
      const installment = Installment.create(baseDraft({ amountRial: 0n }));

      expect(installment.amountRial).toBe(0n);
      expect(installment.status).toBe(InstallmentStatus.PENDING);
    });

    it('round-trips via toProps', () => {
      const created = Installment.create(baseDraft());
      created.markPaid('staff-1');
      const restored = Installment.reconstitute(created.toProps());

      expect(restored.id).toBe(created.id);
      expect(restored.status).toBe(InstallmentStatus.PAID);
      expect(restored.confirmedByStaffId).toBe('staff-1');
    });
  });
});
