import { describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import type {
  IPaymentLedgerRepository,
  PaymentTransactionListItem,
} from '../ports/payment-ledger.repository.port.js';
import { ListPaymentTransactionsUseCase } from './list-payment-transactions.use-case.js';
import { encodePaymentLedgerCursor } from './payment-ledger-cursor.js';

function sampleItem(
  id: string,
  occurredAt: Date,
  paymentMethod: string | null = 'cash',
): PaymentTransactionListItem {
  return {
    entry: {
      id,
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      entryType: 'PAYMENT_IN',
      direction: 'CREDIT',
      amountRial: 1_000_000n,
      status: 'POSTED',
      occurredAt,
      recordedAt: occurredAt,
      paymentMethod,
      description: null,
      paymentAttemptId: null,
      installmentId: null,
      saleId: null,
      reversesEntryId: null,
      version: 1,
    },
    customer: null,
    sale: null,
    installment: null,
  };
}

describe('ListPaymentTransactionsUseCase', () => {
  it('rejects invalid date range', async () => {
    const ledger = { list: vi.fn() } satisfies IPaymentLedgerRepository;
    const useCase = new ListPaymentTransactionsUseCase(ledger);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
        limit: 20,
        occurredFrom: new Date('2026-07-10T00:00:00.000Z'),
        occurredTo: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'DATE_RANGE_INVALID',
      httpStatus: 400,
    });
  });

  it('rejects invalid cursor', async () => {
    const ledger = { list: vi.fn() } satisfies IPaymentLedgerRepository;
    const useCase = new ListPaymentTransactionsUseCase(ledger);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
        limit: 20,
        cursor: 'not-a-valid-cursor',
      }),
    ).rejects.toMatchObject({
      code: 'CURSOR_INVALID',
      httpStatus: 400,
    });
  });

  it('maps posted entries and returns next cursor when hasMore', async () => {
    const occurredAt = new Date('2026-07-01T12:00:00.000Z');
    const list = vi.fn().mockResolvedValue({
      items: [sampleItem('entry-1', occurredAt)],
      hasMore: true,
    });
    const useCase = new ListPaymentTransactionsUseCase({ list });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffContext: {
        staffId: 'staff-1',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
      limit: 20,
      status: 'posted',
      paymentMethod: 'cash',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.entryType).toBe('payment_in');
    expect(result.items[0]?.direction).toBe('credit');
    expect(result.items[0]?.status).toBe('posted');
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(encodePaymentLedgerCursor(occurredAt, 'entry-1'));
    expect(list).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        status: 'POSTED',
        paymentMethod: 'cash',
      }),
    );
  });

  it('denies branch outside data scope', async () => {
    const ledger = { list: vi.fn() } satisfies IPaymentLedgerRepository;
    const useCase = new ListPaymentTransactionsUseCase(ledger);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'branch',
          assignedBranchIds: ['branch-a'],
          activeBranchId: 'branch-a',
        },
        limit: 20,
        branchId: 'branch-b',
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
