import { DomainError } from '../errors/domain.error.js';
import { LedgerDomainErrorCode } from './errors/ledger.errors.js';
import { PaymentLedgerEntry } from './payment-ledger-entry.entity.js';
import {
  PaymentLedgerDirection,
  PaymentLedgerEntryStatus,
  PaymentLedgerEntryType,
  type PostPaymentInInput,
  type PostRefundInput,
} from './payment-ledger.types.js';

/** Factory helpers for common ledger entry types — IFP-102 */
export class PaymentLedgerService {
  postPaymentIn(input: PostPaymentInInput): PaymentLedgerEntry {
    return PaymentLedgerEntry.post({
      tenantId: input.tenantId,
      branchId: input.branchId,
      entryType: PaymentLedgerEntryType.PAYMENT_IN,
      direction: PaymentLedgerDirection.CREDIT,
      amountRial: input.amountRial,
      occurredAt: input.occurredAt,
      recordedAt: input.recordedAt,
      paymentMethod: input.paymentMethod,
      description: input.description,
      paymentAttemptId: input.paymentAttemptId,
      installmentId: input.installmentId,
      saleId: input.saleId,
      checkId: input.checkId ?? null,
      createdById: input.createdById,
    });
  }

  postRefund(input: PostRefundInput): PaymentLedgerEntry {
    return PaymentLedgerEntry.post({
      tenantId: input.tenantId,
      branchId: input.branchId,
      entryType: PaymentLedgerEntryType.REFUND,
      direction: PaymentLedgerDirection.DEBIT,
      amountRial: input.amountRial,
      occurredAt: input.occurredAt,
      recordedAt: input.recordedAt,
      paymentMethod: input.paymentMethod,
      description: input.description,
      paymentAttemptId: input.paymentAttemptId,
      installmentId: input.installmentId,
      saleId: input.saleId,
      reversesEntryId: input.reversesEntryId,
      metadata: input.metadata,
      createdById: input.createdById,
    });
  }

  postRefundAgainstPaymentIn(
    original: PaymentLedgerEntry,
    input: Omit<PostRefundInput, 'tenantId' | 'branchId' | 'reversesEntryId'> & {
      reversesEntryId?: string;
    },
  ): PaymentLedgerEntry {
    const originalProps = original.toProps();

    if (originalProps.entryType !== PaymentLedgerEntryType.PAYMENT_IN) {
      throw new DomainError(LedgerDomainErrorCode.LEDGER_ENTRY_NOT_REFUNDABLE);
    }

    if (originalProps.status !== PaymentLedgerEntryStatus.POSTED) {
      throw new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED);
    }

    return this.postRefund({
      tenantId: originalProps.tenantId,
      branchId: originalProps.branchId,
      amountRial: input.amountRial,
      occurredAt: input.occurredAt,
      recordedAt: input.recordedAt,
      paymentMethod: input.paymentMethod ?? originalProps.paymentMethod,
      description: input.description,
      paymentAttemptId: input.paymentAttemptId ?? originalProps.paymentAttemptId,
      installmentId: input.installmentId ?? originalProps.installmentId,
      saleId: input.saleId ?? originalProps.saleId,
      reversesEntryId: input.reversesEntryId ?? originalProps.id,
      metadata: input.metadata,
      createdById: input.createdById,
    });
  }
}
