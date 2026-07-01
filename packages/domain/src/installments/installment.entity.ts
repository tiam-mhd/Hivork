import { randomUUID } from 'node:crypto';

import { InstallmentDomainErrorCode } from './errors.js';
import {
  InstallmentDraft,
  InstallmentProps,
  InstallmentStatus,
} from './installment.types.js';
import { DomainError } from '../errors/domain.error.js';

const ALLOWED_TRANSITIONS: Record<InstallmentStatus, ReadonlySet<InstallmentStatus>> = {
  [InstallmentStatus.PENDING]: new Set([
    InstallmentStatus.OVERDUE,
    InstallmentStatus.PAID,
    InstallmentStatus.WAIVED,
  ]),
  [InstallmentStatus.OVERDUE]: new Set([InstallmentStatus.PAID, InstallmentStatus.WAIVED]),
  [InstallmentStatus.PAID]: new Set(),
  [InstallmentStatus.WAIVED]: new Set(),
};

export class Installment {
  private constructor(private props: InstallmentProps) {}

  static create(draft: InstallmentDraft): Installment {
    Installment.validateDraft(draft);

    const now = new Date();
    return new Installment({
      id: randomUUID(),
      saleId: draft.saleId,
      tenantId: draft.tenantId,
      sequenceNumber: draft.sequenceNumber,
      dueDate: draft.dueDate,
      amountRial: draft.amountRial,
      status: InstallmentStatus.PENDING,
      paidAt: null,
      confirmedByStaffId: null,
      waivedByStaffId: null,
      waiveReason: null,
      version: 1,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: InstallmentProps): Installment {
    return new Installment(props);
  }

  markOverdue(): void {
    if (this.props.status !== InstallmentStatus.PENDING) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID);
    }

    this.props.status = InstallmentStatus.OVERDUE;
    this.props.updatedAt = new Date();
  }

  markPaid(confirmedByStaffId: string, paidAt: Date = new Date()): void {
    if (this.props.status === InstallmentStatus.PAID) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID);
    }
    if (this.props.status === InstallmentStatus.WAIVED) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED);
    }
    if (
      this.props.status !== InstallmentStatus.PENDING &&
      this.props.status !== InstallmentStatus.OVERDUE
    ) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID);
    }

    const staffId = confirmedByStaffId.trim();
    if (!staffId) {
      throw new DomainError('FIELD_REQUIRED');
    }

    this.props.status = InstallmentStatus.PAID;
    this.props.paidAt = paidAt;
    this.props.confirmedByStaffId = staffId;
    this.props.updatedAt = new Date();
  }

  waive(staffId: string, reason: string): void {
    if (this.isTerminal()) {
      throw new DomainError(
        this.props.status === InstallmentStatus.PAID
          ? InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID
          : InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED,
      );
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new DomainError(InstallmentDomainErrorCode.WAIVE_REASON_REQUIRED);
    }

    const trimmedStaffId = staffId.trim();
    if (!trimmedStaffId) {
      throw new DomainError('FIELD_REQUIRED');
    }

    this.props.status = InstallmentStatus.WAIVED;
    this.props.waivedByStaffId = trimmedStaffId;
    this.props.waiveReason = trimmedReason;
    this.props.updatedAt = new Date();
  }

  assertCanDelete(): never {
    throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_CANNOT_DELETE);
  }

  isTerminal(): boolean {
    return (
      this.props.status === InstallmentStatus.PAID ||
      this.props.status === InstallmentStatus.WAIVED
    );
  }

  canTransitionTo(target: InstallmentStatus): boolean {
    return ALLOWED_TRANSITIONS[this.props.status].has(target);
  }

  toProps(): InstallmentProps {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get saleId(): string {
    return this.props.saleId;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get sequenceNumber(): number {
    return this.props.sequenceNumber;
  }

  get dueDate(): Date {
    return this.props.dueDate;
  }

  get amountRial(): bigint {
    return this.props.amountRial;
  }

  get status(): InstallmentStatus {
    return this.props.status;
  }

  get paidAt(): Date | null {
    return this.props.paidAt;
  }

  get confirmedByStaffId(): string | null {
    return this.props.confirmedByStaffId;
  }

  get waivedByStaffId(): string | null {
    return this.props.waivedByStaffId;
  }

  get waiveReason(): string | null {
    return this.props.waiveReason;
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

  private static validateDraft(draft: InstallmentDraft): void {
    if (draft.amountRial < 0n) {
      throw new DomainError('AMOUNT_MUST_BE_POSITIVE');
    }
    if (!Number.isInteger(draft.sequenceNumber) || draft.sequenceNumber < 1) {
      throw new DomainError('FIELD_INVALID_FORMAT');
    }
    if (!draft.saleId.trim() || !draft.tenantId.trim()) {
      throw new DomainError('FIELD_REQUIRED');
    }
    if (draft.status !== InstallmentStatus.PENDING) {
      throw new DomainError(InstallmentDomainErrorCode.INSTALLMENT_STATUS_INVALID);
    }
  }
}
