import { PartialPaymentSchema } from '@hivork/contracts/installments';
import { describe, expect, it } from 'vitest';

import {
  assertIdempotentBankTransferMatch,
  assertIdempotentCheckMatch,
  assertIdempotentFeeMatch,
  assertIdempotentPaymentMatch,
  assertIdempotentPosMatch,
  assertTransferDateNotFuture,
  buildBankTransferMetadata,
  buildCheckMetadata,
  buildFeeMetadata,
  buildPosMetadata,
  computeRemainingAmountRial,
  resolvePaymentRecordingSettings,
} from './record-payment.helper.js';

describe('record-payment.helper', () => {
  it('computes remaining amount after allocations', () => {
    expect(computeRemainingAmountRial(5_000_000n, 2_000_000n)).toBe(3_000_000n);
    expect(computeRemainingAmountRial(5_000_000n, 6_000_000n)).toBe(0n);
  });

  it('parses payment recording settings', () => {
    expect(
      resolvePaymentRecordingSettings({
        payment_allow_partial: 'true',
        payment_allow_backdate: false,
      }),
    ).toEqual({
      allowPartial: true,
      allowBackdate: false,
      autoConfirmOnline: false,
      onlineSessionTtlMinutes: 15,
      voidWindowDays: 7,
    });
  });

  it('matches idempotent payment attempts', () => {
    expect(
      assertIdempotentPaymentMatch(
        {
          id: 'pay-1',
          installmentId: 'inst-1',
          tenantId: 'tenant-1',
          reportedByType: 'STAFF',
          reportedById: 'staff-1',
          amountRial: 5_000_000n,
          status: 'PENDING',
          evidenceFileId: null,
          note: null,
          confirmedByStaffId: null,
          rejectedReason: null,
          idempotencyKey: 'key-1',
          confirmedAt: null,
          rejectedAt: null,
          version: 1,
          metadata: { method: 'cash' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          installmentId: 'inst-1',
          amountRial: 5_000_000n,
          method: 'cash',
        },
      ),
    ).toBe(true);
  });
});

describe('PartialPaymentSchema integration', () => {
  it('allows partial amount when enabled', () => {
    expect(
      PartialPaymentSchema.parse({
        amountRial: '1000000',
        remainingAmountRial: '5000000',
        allowPartial: true,
      }),
    ).toBeTruthy();
  });
});

describe('bank transfer helpers', () => {
  it('rejects future transfer dates', () => {
    expect(() =>
      assertTransferDateNotFuture('2099-01-01', new Date('2026-07-01T12:00:00.000Z')),
    ).toThrow('TRANSFER_DATE_INVALID');
  });

  it('builds bank transfer metadata', () => {
    expect(
      buildBankTransferMetadata({
        bankName: 'ملت',
        referenceNumber: '1234567890',
        transferDate: '2026-07-14',
        accountLast4: '4521',
        requestHash: 'abc',
      }),
    ).toEqual({
      method: 'bank_transfer',
      bankName: 'ملت',
      referenceNumber: '1234567890',
      transferDate: '2026-07-14',
      accountLast4: '4521',
      requestHash: 'abc',
    });
  });

  it('matches idempotent bank transfer attempts', () => {
    expect(
      assertIdempotentBankTransferMatch(
        {
          id: 'pay-1',
          installmentId: 'inst-1',
          tenantId: 'tenant-1',
          reportedByType: 'STAFF',
          reportedById: 'staff-1',
          amountRial: 10_000_000n,
          status: 'PENDING',
          evidenceFileId: null,
          note: null,
          confirmedByStaffId: null,
          rejectedReason: null,
          idempotencyKey: 'key-1',
          confirmedAt: null,
          rejectedAt: null,
          version: 1,
          metadata: {
            method: 'bank_transfer',
            bankName: 'ملت',
            referenceNumber: '1234567890',
            transferDate: '2026-07-14',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          installmentId: 'inst-1',
          amountRial: 10_000_000n,
          bankName: 'ملت',
          referenceNumber: '1234567890',
        },
      ),
    ).toBe(true);
  });
});

describe('POS helpers', () => {
  it('builds POS metadata', () => {
    expect(
      buildPosMetadata({
        terminalId: 'TERM-001',
        traceNumber: '987654',
        cardLast4: '1234',
        batchNumber: 'B20250714',
        requestHash: 'abc',
      }),
    ).toEqual({
      method: 'pos',
      terminalId: 'TERM-001',
      traceNumber: '987654',
      cardLast4: '1234',
      batchNumber: 'B20250714',
      requestHash: 'abc',
    });
  });

  it('matches idempotent POS attempts', () => {
    expect(
      assertIdempotentPosMatch(
        {
          id: 'pay-1',
          installmentId: 'inst-1',
          tenantId: 'tenant-1',
          reportedByType: 'STAFF',
          reportedById: 'staff-1',
          amountRial: 7_500_000n,
          status: 'PENDING',
          evidenceFileId: null,
          note: null,
          confirmedByStaffId: null,
          rejectedReason: null,
          idempotencyKey: 'key-1',
          confirmedAt: null,
          rejectedAt: null,
          version: 1,
          metadata: {
            method: 'pos',
            terminalId: 'TERM-001',
            traceNumber: '987654',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          installmentId: 'inst-1',
          amountRial: 7_500_000n,
          terminalId: 'TERM-001',
          traceNumber: '987654',
        },
      ),
    ).toBe(true);
  });
});

describe('check helpers', () => {
  it('builds check metadata with pending registration stub', () => {
    expect(
      buildCheckMetadata({
        checkId: 'check-uuid',
        checkNumber: '1234567',
        bankName: 'صادرات',
        dueDate: '1405-12-01',
        drawerName: 'علی احمدی',
        sayadId: '1234567890123456',
        requestHash: 'abc',
      }),
    ).toEqual({
      method: 'check',
      checkId: 'check-uuid',
      checkNumber: '1234567',
      bankName: 'صادرات',
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      sayadId: '1234567890123456',
      checkPendingRegistration: true,
      requestHash: 'abc',
    });
  });

  it('matches idempotent check attempts', () => {
    expect(
      assertIdempotentCheckMatch(
        {
          id: 'pay-1',
          installmentId: 'inst-1',
          tenantId: 'tenant-1',
          reportedByType: 'STAFF',
          reportedById: 'staff-1',
          amountRial: 20_000_000n,
          status: 'PENDING',
          evidenceFileId: null,
          note: null,
          confirmedByStaffId: null,
          rejectedReason: null,
          idempotencyKey: 'key-1',
          confirmedAt: null,
          rejectedAt: null,
          version: 1,
          metadata: {
            method: 'check',
            bankName: 'صادرات',
            checkNumber: '1234567',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          installmentId: 'inst-1',
          amountRial: 20_000_000n,
          bankName: 'صادرات',
          checkNumber: '1234567',
        },
      ),
    ).toBe(true);
  });
});

describe('fee helpers', () => {
  it('builds fee metadata', () => {
    expect(
      buildFeeMetadata({
        feeType: 'late_fee',
        feeDescription: 'جریمه دیرکرد',
        requestHash: 'abc',
      }),
    ).toEqual({
      method: 'fee',
      feeType: 'late_fee',
      feeDescription: 'جریمه دیرکرد',
      requestHash: 'abc',
    });
  });

  it('matches idempotent fee attempts', () => {
    expect(
      assertIdempotentFeeMatch(
        {
          id: 'pay-1',
          installmentId: 'inst-1',
          tenantId: 'tenant-1',
          reportedByType: 'STAFF',
          reportedById: 'staff-1',
          amountRial: 500_000n,
          status: 'PENDING',
          evidenceFileId: null,
          note: null,
          confirmedByStaffId: null,
          rejectedReason: null,
          idempotencyKey: 'key-1',
          confirmedAt: null,
          rejectedAt: null,
          version: 1,
          metadata: {
            method: 'fee',
            feeType: 'late_fee',
            feeDescription: 'جریمه',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          installmentId: 'inst-1',
          amountRial: 500_000n,
          feeType: 'late_fee',
          feeDescription: 'جریمه',
        },
      ),
    ).toBe(true);
  });
});
