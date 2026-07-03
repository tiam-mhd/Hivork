import { randomUUID } from 'node:crypto';

import { DomainError } from '../errors/domain.error.js';
import { LedgerDomainErrorCode } from './errors/ledger.errors.js';
import {
  PaymentLedgerDirection,
  PaymentLedgerEntryStatus,
  PaymentLedgerEntryType,
  type PaymentLedgerEntryProps,
  type PostLedgerEntryInput,
  type VoidLedgerResult,
} from './payment-ledger.types.js';

const ENTRY_TYPE_DEFAULT_DIRECTION: Record<
  PaymentLedgerEntryType,
  PaymentLedgerDirection | null
> = {
  [PaymentLedgerEntryType.PAYMENT_IN]: PaymentLedgerDirection.CREDIT,
  [PaymentLedgerEntryType.PAYMENT_OUT]: PaymentLedgerDirection.DEBIT,
  [PaymentLedgerEntryType.REFUND]: PaymentLedgerDirection.DEBIT,
  [PaymentLedgerEntryType.FEE]: PaymentLedgerDirection.CREDIT,
  [PaymentLedgerEntryType.PENALTY]: PaymentLedgerDirection.CREDIT,
  [PaymentLedgerEntryType.DISCOUNT]: PaymentLedgerDirection.DEBIT,
  [PaymentLedgerEntryType.ADJUSTMENT]: null,
  [PaymentLedgerEntryType.SETTLEMENT]: null,
};

export function assertPositiveAmountRial(amountRial: bigint): void {
  if (amountRial <= 0n) {
    throw new DomainError(LedgerDomainErrorCode.AMOUNT_INVALID);
  }
}

export function oppositeDirection(
  direction: PaymentLedgerDirection,
): PaymentLedgerDirection {
  return direction === PaymentLedgerDirection.CREDIT
    ? PaymentLedgerDirection.DEBIT
    : PaymentLedgerDirection.CREDIT;
}

export class PaymentLedgerEntry {
  private constructor(private props: PaymentLedgerEntryProps) {}

  static post(input: PostLedgerEntryInput): PaymentLedgerEntry {
    assertPositiveAmountRial(input.amountRial);

    const tenantId = input.tenantId.trim();
    const branchId = input.branchId.trim();
    if (!tenantId || !branchId) {
      throw new DomainError(LedgerDomainErrorCode.FIELD_REQUIRED);
    }

    const expectedDirection = ENTRY_TYPE_DEFAULT_DIRECTION[input.entryType];
    if (expectedDirection !== null && expectedDirection !== input.direction) {
      throw new DomainError(LedgerDomainErrorCode.ENTRY_TYPE_DIRECTION_MISMATCH);
    }

    const now = input.recordedAt ?? new Date();
    return new PaymentLedgerEntry({
      id: randomUUID(),
      tenantId,
      branchId,
      entryType: input.entryType,
      direction: input.direction,
      amountRial: input.amountRial,
      status: PaymentLedgerEntryStatus.POSTED,
      occurredAt: input.occurredAt,
      recordedAt: now,
      paymentMethod: input.paymentMethod?.trim() ?? null,
      description: input.description?.trim() ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      installmentId: input.installmentId ?? null,
      saleId: input.saleId ?? null,
      checkId: input.checkId ?? null,
      settlementBatchId: input.settlementBatchId ?? null,
      reversesEntryId: input.reversesEntryId ?? null,
      voidedAt: null,
      voidedById: null,
      voidReason: null,
      version: 1,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      createdById: input.createdById?.trim() ?? null,
    });
  }

  static reconstitute(props: PaymentLedgerEntryProps): PaymentLedgerEntry {
    return new PaymentLedgerEntry(props);
  }

  static createReversal(
    original: PaymentLedgerEntry,
    input: { amountRial: bigint; occurredAt: Date; createdById?: string | null },
  ): PaymentLedgerEntry {
    assertPositiveAmountRial(input.amountRial);

    if (input.amountRial !== original.amountRial) {
      throw new DomainError(LedgerDomainErrorCode.REVERSAL_AMOUNT_MISMATCH);
    }

    if (original.status !== PaymentLedgerEntryStatus.POSTED) {
      throw new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED);
    }

    const recordedAt = input.occurredAt;
    const originalProps = original.toProps();

    return new PaymentLedgerEntry({
      id: randomUUID(),
      tenantId: originalProps.tenantId,
      branchId: originalProps.branchId,
      entryType: originalProps.entryType,
      direction: oppositeDirection(originalProps.direction),
      amountRial: originalProps.amountRial,
      status: PaymentLedgerEntryStatus.POSTED,
      occurredAt: input.occurredAt,
      recordedAt,
      paymentMethod: originalProps.paymentMethod,
      description: originalProps.description,
      paymentAttemptId: originalProps.paymentAttemptId,
      installmentId: originalProps.installmentId,
      saleId: originalProps.saleId,
      checkId: originalProps.checkId,
      settlementBatchId: originalProps.settlementBatchId,
      reversesEntryId: originalProps.id,
      voidedAt: null,
      voidedById: null,
      voidReason: null,
      version: 1,
      metadata: null,
      createdAt: recordedAt,
      updatedAt: recordedAt,
      createdById: input.createdById?.trim() ?? null,
    });
  }

  void(voidedById: string, reason: string, at: Date = new Date()): VoidLedgerResult {
    if (this.props.status === PaymentLedgerEntryStatus.VOIDED) {
      throw new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED);
    }

    if (this.props.reversesEntryId !== null) {
      throw new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED);
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new DomainError(LedgerDomainErrorCode.VOID_REASON_REQUIRED);
    }

    const staffId = voidedById.trim();
    if (!staffId) {
      throw new DomainError(LedgerDomainErrorCode.FIELD_REQUIRED);
    }

    const original: PaymentLedgerEntryProps = {
      ...this.props,
      status: PaymentLedgerEntryStatus.VOIDED,
      voidedAt: at,
      voidedById: staffId,
      voidReason: trimmedReason,
      updatedAt: at,
    };

    const reversal = PaymentLedgerEntry.createReversal(
      PaymentLedgerEntry.reconstitute(this.props),
      {
        amountRial: this.props.amountRial,
        occurredAt: at,
        createdById: staffId,
      },
    );

    this.props = original;

    return {
      original,
      reversal: reversal.toProps(),
    };
  }

  toProps(): PaymentLedgerEntryProps {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get branchId(): string {
    return this.props.branchId;
  }

  get entryType(): PaymentLedgerEntryType {
    return this.props.entryType;
  }

  get direction(): PaymentLedgerDirection {
    return this.props.direction;
  }

  get amountRial(): bigint {
    return this.props.amountRial;
  }

  get status(): PaymentLedgerEntryStatus {
    return this.props.status;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get recordedAt(): Date {
    return this.props.recordedAt;
  }

  get reversesEntryId(): string | null {
    return this.props.reversesEntryId;
  }

  get paymentAttemptId(): string | null {
    return this.props.paymentAttemptId;
  }
}
