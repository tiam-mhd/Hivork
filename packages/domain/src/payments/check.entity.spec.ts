import { describe, expect, it } from 'vitest';

import { Check, assertPositiveCheckAmountRial } from './check.entity.js';
import { CheckTransitionError } from './errors/check-transition.error.js';
import { CheckDomainErrorCode } from './errors/check.errors.js';
import { CheckStatus, CheckType, type RegisterCheckInput } from './check.types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const STAFF_ID = '00000000-0000-0000-0000-000000000010';

function baseRegisterInput(overrides: Partial<RegisterCheckInput> = {}): RegisterCheckInput {
  return {
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    checkType: CheckType.RECEIVED,
    checkNumber: '12345678',
    bankName: 'Melli',
    amountRial: 10_000_000n,
    dueDate: new Date('2026-08-01T00:00:00.000Z'),
    drawerName: 'Customer A',
    ...overrides,
  };
}

function registeredCheck(overrides: Partial<RegisterCheckInput> = {}): Check {
  return Check.register(baseRegisterInput(overrides));
}

function dueCheck(overrides: Partial<RegisterCheckInput> = {}): Check {
  const check = registeredCheck(overrides);
  check.markDue(new Date('2026-08-01T12:00:00.000Z'), { manual: true });
  return check;
}

describe('Check (IFP-112)', () => {
  describe('register / amount invariants', () => {
    it('rejects zero amount with CHECK_AMOUNT_INVALID', () => {
      expect(() => registeredCheck({ amountRial: 0n })).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_AMOUNT_INVALID),
      );
    });

    it('rejects negative amount with CHECK_AMOUNT_INVALID', () => {
      expect(() => registeredCheck({ amountRial: -1n })).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_AMOUNT_INVALID),
      );
    });

    it('assertPositiveCheckAmountRial rejects non-positive bigint', () => {
      expect(() => assertPositiveCheckAmountRial(0n)).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_AMOUNT_INVALID),
      );
    });

    it('registers with REGISTERED status', () => {
      const check = registeredCheck();

      expect(check.status).toBe(CheckStatus.REGISTERED);
      expect(check.amountRial).toBe(10_000_000n);
      expect(check.isTerminal()).toBe(false);
    });
  });

  describe('markDue', () => {
    it('transitions registered → due when due date reached', () => {
      const check = registeredCheck({
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
      });

      check.markDue(new Date('2026-07-01T12:00:00.000Z'));

      expect(check.status).toBe(CheckStatus.DUE);
    });

    it('rejects markDue before due date without manual flag', () => {
      const check = registeredCheck({
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      expect(() => check.markDue(new Date('2026-07-01T12:00:00.000Z'))).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_NOT_DUE),
      );
    });

    it('allows manual markDue before due date', () => {
      const check = registeredCheck({
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
      });

      check.markDue(new Date('2026-07-01T12:00:00.000Z'), { manual: true });

      expect(check.status).toBe(CheckStatus.DUE);
    });

    it('rejects markDue from non-registered status', () => {
      const check = dueCheck();

      expect(() => check.markDue(new Date('2026-08-02T00:00:00.000Z'))).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID),
      );
    });

    it('isEligibleForMarkDue is true only when registered and due date passed', () => {
      const check = registeredCheck({
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
      });

      expect(check.isEligibleForMarkDue(new Date('2026-07-02T00:00:00.000Z'))).toBe(true);
      expect(check.isEligibleForMarkDue(new Date('2026-06-30T00:00:00.000Z'))).toBe(false);
    });
  });

  describe('collect', () => {
    it('collects from registered', () => {
      const check = registeredCheck();
      const at = new Date('2026-07-15T10:00:00.000Z');

      check.collect(STAFF_ID, at);

      expect(check.status).toBe(CheckStatus.COLLECTED);
      expect(check.collectedAt).toEqual(at);
      expect(check.isTerminal()).toBe(true);
    });

    it('collects from due', () => {
      const check = dueCheck();
      const at = new Date('2026-08-02T10:00:00.000Z');

      check.collect(STAFF_ID, at);

      expect(check.status).toBe(CheckStatus.COLLECTED);
      expect(check.collectedAt).toEqual(at);
    });

    it('rejects collect from bounced', () => {
      const check = dueCheck();
      check.bounce(STAFF_ID, 'insufficient funds', new Date('2026-08-02T10:00:00.000Z'));

      expect(() => check.collect(STAFF_ID, new Date('2026-08-03T10:00:00.000Z'))).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_INVALID_STATE),
      );
    });
  });

  describe('bounce', () => {
    it('bounces from due', () => {
      const check = dueCheck();
      const at = new Date('2026-08-02T10:00:00.000Z');

      check.bounce(STAFF_ID, 'insufficient funds', at);

      expect(check.status).toBe(CheckStatus.BOUNCED);
      expect(check.bouncedAt).toEqual(at);
      expect(check.bounceReason).toBe('insufficient funds');
      expect(check.isTerminal()).toBe(true);
    });

    it('bounces from registered', () => {
      const check = registeredCheck();

      check.bounce(STAFF_ID, 'returned early', new Date('2026-08-02T10:00:00.000Z'));

      expect(check.status).toBe(CheckStatus.BOUNCED);
    });

    it('rejects bounce from collected without setting', () => {
      const check = dueCheck();
      check.collect(STAFF_ID, new Date('2026-08-02T10:00:00.000Z'));

      expect(() =>
        check.bounce(STAFF_ID, 'late bounce', new Date('2026-08-03T10:00:00.000Z')),
      ).toThrow(new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_COLLECTED));
    });

    it('allows bounce from collected when setting enabled', () => {
      const check = dueCheck();
      check.collect(STAFF_ID, new Date('2026-08-02T10:00:00.000Z'));

      check.bounce(STAFF_ID, 'bank reversal', new Date('2026-08-03T10:00:00.000Z'), {
        allowBounceAfterCollect: true,
      });

      expect(check.status).toBe(CheckStatus.BOUNCED);
    });

    it('rejects bounce on payable check', () => {
      const check = Check.registerPayable({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        checkNumber: 'PAY-001',
        bankName: 'Melli',
        amountRial: 1_000_000n,
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
        payeeName: 'Supplier Co',
      });

      expect(() =>
        check.bounce(STAFF_ID, 'invalid', new Date('2026-08-02T10:00:00.000Z')),
      ).toThrow(new CheckTransitionError(CheckDomainErrorCode.CHECK_TYPE_NOT_RECEIVABLE));
    });

    it('rejects duplicate bounce', () => {
      const check = dueCheck();
      check.bounce(STAFF_ID, 'first bounce', new Date('2026-08-02T10:00:00.000Z'));

      expect(() =>
        check.bounce(STAFF_ID, 'second bounce', new Date('2026-08-03T10:00:00.000Z')),
      ).toThrow(new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_BOUNCED));
    });

    it('requires bounce reason', () => {
      const check = dueCheck();

      expect(() => check.bounce(STAFF_ID, '  ', new Date('2026-08-02T10:00:00.000Z'))).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.BOUNCE_REASON_REQUIRED),
      );
    });
  });

  describe('registerPayable', () => {
    it('registers payable check with payeeName', () => {
      const check = Check.registerPayable({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        checkNumber: 'PAY-002',
        bankName: 'Melli',
        amountRial: 5_000_000n,
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
        payeeName: 'Supplier Ltd',
      });

      expect(check.checkType).toBe(CheckType.PAYABLE);
      expect(check.status).toBe(CheckStatus.REGISTERED);
    });
  });

  describe('transfer', () => {
    it('transfers from due', () => {
      const check = dueCheck();
      const at = new Date('2026-08-02T10:00:00.000Z');

      check.transfer(STAFF_ID, 'Partner Co', at);

      expect(check.status).toBe(CheckStatus.TRANSFERRED);
      expect(check.transferredTo).toBe('Partner Co');
      expect(check.transferredAt).toEqual(at);
      expect(check.isTerminal()).toBe(true);
    });

    it('transfers from registered', () => {
      const check = registeredCheck();
      const at = new Date('2026-07-20T10:00:00.000Z');

      check.transfer(STAFF_ID, 'Supplier Ltd', at);

      expect(check.status).toBe(CheckStatus.TRANSFERRED);
      expect(check.transferredTo).toBe('Supplier Ltd');
    });

    it('rejects transfer from collected', () => {
      const check = dueCheck();
      check.collect(STAFF_ID, new Date('2026-08-02T10:00:00.000Z'));

      expect(() =>
        check.transfer(STAFF_ID, 'Partner Co', new Date('2026-08-03T10:00:00.000Z')),
      ).toThrow(new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_COLLECTED));
    });
  });

  describe('cancel', () => {
    it('cancels from registered', () => {
      const check = registeredCheck();
      const at = new Date('2026-07-10T10:00:00.000Z');

      check.cancel(STAFF_ID, at);

      expect(check.status).toBe(CheckStatus.CANCELLED);
      expect(check.cancelledAt).toEqual(at);
      expect(check.isTerminal()).toBe(true);
    });

    it('cancels from due', () => {
      const check = dueCheck();

      check.cancel(STAFF_ID, new Date('2026-08-05T10:00:00.000Z'));

      expect(check.status).toBe(CheckStatus.CANCELLED);
    });

    it('rejects cancel from collected', () => {
      const check = dueCheck();
      check.collect(STAFF_ID, new Date('2026-08-02T10:00:00.000Z'));

      expect(() => check.cancel(STAFF_ID, new Date('2026-08-03T10:00:00.000Z'))).toThrow(
        new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID),
      );
    });
  });
});
