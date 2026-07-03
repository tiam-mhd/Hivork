import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IPaymentLedgerRepository } from '../ports/payment-ledger.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveSaleListScope } from '../installments/sales/sale-data-scope.js';
import {
  decodePaymentLedgerCursor,
  encodePaymentLedgerCursor,
} from './payment-ledger-cursor.js';
import {
  mapPaymentTransactionListItemToSummary,
  type PaymentTransactionSummary,
} from './payment-transaction.mapper.js';

export type ListPaymentTransactionsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  cursor?: string;
  limit: number;
  status?: 'posted' | 'voided';
  entryType?:
    | 'payment_in'
    | 'payment_out'
    | 'refund'
    | 'fee'
    | 'penalty'
    | 'discount'
    | 'adjustment'
    | 'settlement';
  paymentMethod?: string;
  branchId?: string;
  saleId?: string;
  tenantCustomerId?: string;
  occurredFrom?: Date;
  occurredTo?: Date;
  search?: string;
  activeBranchId?: string;
};

export type ListPaymentTransactionsOutput = {
  items: PaymentTransactionSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

const STATUS_TO_PRISMA = {
  posted: 'POSTED',
  voided: 'VOIDED',
} as const;

const ENTRY_TYPE_TO_PRISMA = {
  payment_in: 'PAYMENT_IN',
  payment_out: 'PAYMENT_OUT',
  refund: 'REFUND',
  fee: 'FEE',
  penalty: 'PENALTY',
  discount: 'DISCOUNT',
  adjustment: 'ADJUSTMENT',
  settlement: 'SETTLEMENT',
} as const;

export class ListPaymentTransactionsUseCase
  implements UseCase<ListPaymentTransactionsInput, ListPaymentTransactionsOutput>
{
  constructor(private readonly ledger: IPaymentLedgerRepository) {}

  async execute(input: ListPaymentTransactionsInput): Promise<ListPaymentTransactionsOutput> {
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    if (input.occurredFrom && input.occurredTo && input.occurredFrom > input.occurredTo) {
      throw new ApplicationError(
        'DATE_RANGE_INVALID',
        'occurredFrom must be on or before occurredTo.',
        400,
      );
    }

    const scope = resolveSaleListScope(input.staffContext, input.actorId, {
      branchId: input.branchId,
      activeBranchId: input.activeBranchId,
    });

    const cursorPayload = input.cursor ? decodePaymentLedgerCursor(input.cursor) : undefined;

    const result = await this.ledger.list(input.tenantId, {
      cursor: cursorPayload
        ? {
            id: cursorPayload.id,
            occurredAt: new Date(cursorPayload.occurredAt),
          }
        : undefined,
      limit: input.limit,
      status: input.status ? STATUS_TO_PRISMA[input.status] : undefined,
      entryType: input.entryType ? ENTRY_TYPE_TO_PRISMA[input.entryType] : undefined,
      paymentMethod: input.paymentMethod,
      branchIds: scope.branchIds,
      createdByStaffId: scope.createdByStaffId,
      saleId: input.saleId,
      tenantCustomerId: input.tenantCustomerId,
      occurredFrom: input.occurredFrom,
      occurredTo: input.occurredTo,
      search: input.search?.trim() || undefined,
    });

    const lastItem = result.items[result.items.length - 1];
    const nextCursor =
      result.hasMore && lastItem
        ? encodePaymentLedgerCursor(lastItem.entry.occurredAt, lastItem.entry.id)
        : null;

    return {
      items: result.items.map(mapPaymentTransactionListItemToSummary),
      nextCursor,
      hasMore: result.hasMore,
    };
  }
}
