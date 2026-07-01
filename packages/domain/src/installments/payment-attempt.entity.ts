import { randomUUID } from 'node:crypto';

import {
  InstallmentDomainErrorCode,
  PaymentAttemptDomainErrorCode,
  SaleDomainErrorCode,
} from './errors.js';
import { InstallmentStatus } from './installment.types.js';
import {
  AutoConfirmInput,
  PaymentAttemptProps,
  PaymentAttemptStatus,
  ReportedByType,
  ReportPaymentInput,
} from './payment-attempt.types.js';
import { DomainError } from '../errors/domain.error.js';

export class PaymentAttempt {
  private constructor(private props: PaymentAttemptProps) {}

  static report(input: ReportPaymentInput, installmentStatus: InstallmentStatus): PaymentAttempt {
    if (installmentStatus === InstallmentStatus.PAID) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID);
    }
    if (installmentStatus === InstallmentStatus.WAIVED) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED);
    }

    if (input.amountRial <= 0n) {
      throw new DomainError(SaleDomainErrorCode.AMOUNT_MUST_BE_POSITIVE);
    }

    const reportedById = input.reportedById.trim();
    if (!reportedById || !input.installmentId.trim() || !input.tenantId.trim()) {
      throw new DomainError('FIELD_REQUIRED');
    }

    const now = new Date();
    return new PaymentAttempt({
      id: randomUUID(),
      installmentId: input.installmentId,
      tenantId: input.tenantId,
      reportedByType: input.reportedByType,
      reportedById,
      amountRial: input.amountRial,
      status: PaymentAttemptStatus.PENDING,
      evidenceFileId: input.evidenceFileId ?? null,
      note: input.note?.trim() ?? null,
      confirmedByStaffId: null,
      rejectedReason: null,
      idempotencyKey: input.idempotencyKey ?? null,
      confirmedAt: null,
      rejectedAt: null,
      version: 1,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: PaymentAttemptProps): PaymentAttempt {
    return new PaymentAttempt(props);
  }

  /**
   * BR-014 / state-machines.md — staff report auto-confirms only when seller confirmation is off.
   * Customer reports always require manual confirm.
   */
  static shouldAutoConfirm(input: AutoConfirmInput): boolean {
    return (
      !input.requireSellerConfirmation && input.reportedByType === ReportedByType.STAFF
    );
  }

  confirm(staffId: string): void {
    if (this.props.status === PaymentAttemptStatus.CONFIRMED) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED);
    }
    if (this.props.status === PaymentAttemptStatus.REJECTED) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED);
    }
    if (this.props.status !== PaymentAttemptStatus.PENDING) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED);
    }

    const confirmedByStaffId = staffId.trim();
    if (!confirmedByStaffId) {
      throw new DomainError('FIELD_REQUIRED');
    }

    const confirmedAt = new Date();
    this.props.status = PaymentAttemptStatus.CONFIRMED;
    this.props.confirmedByStaffId = confirmedByStaffId;
    this.props.confirmedAt = confirmedAt;
    this.props.updatedAt = confirmedAt;
  }

  reject(staffId: string, reason: string): void {
    if (this.props.status === PaymentAttemptStatus.CONFIRMED) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED);
    }
    if (this.props.status === PaymentAttemptStatus.REJECTED) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED);
    }
    if (this.props.status !== PaymentAttemptStatus.PENDING) {
      throw new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED);
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new DomainError(PaymentAttemptDomainErrorCode.REJECT_REASON_REQUIRED);
    }

    if (!staffId.trim()) {
      throw new DomainError('FIELD_REQUIRED');
    }

    const rejectedAt = new Date();
    this.props.status = PaymentAttemptStatus.REJECTED;
    this.props.rejectedReason = trimmedReason;
    this.props.rejectedAt = rejectedAt;
    this.props.updatedAt = rejectedAt;
  }

  isPending(): boolean {
    return this.props.status === PaymentAttemptStatus.PENDING;
  }

  isTerminal(): boolean {
    return (
      this.props.status === PaymentAttemptStatus.CONFIRMED ||
      this.props.status === PaymentAttemptStatus.REJECTED
    );
  }

  toProps(): PaymentAttemptProps {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get installmentId(): string {
    return this.props.installmentId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get reportedByType(): ReportedByType {
    return this.props.reportedByType;
  }

  get reportedById(): string {
    return this.props.reportedById;
  }

  get amountRial(): bigint {
    return this.props.amountRial;
  }

  get status(): PaymentAttemptStatus {
    return this.props.status;
  }

  get evidenceFileId(): string | null {
    return this.props.evidenceFileId;
  }

  get note(): string | null {
    return this.props.note;
  }

  get confirmedByStaffId(): string | null {
    return this.props.confirmedByStaffId;
  }

  get rejectedReason(): string | null {
    return this.props.rejectedReason;
  }

  get idempotencyKey(): string | null {
    return this.props.idempotencyKey;
  }

  get confirmedAt(): Date | null {
    return this.props.confirmedAt;
  }

  get rejectedAt(): Date | null {
    return this.props.rejectedAt;
  }

  get version(): number {
    return this.props.version;
  }

  get metadata(): Record<string, unknown> | null {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
