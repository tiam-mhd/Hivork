import { randomUUID } from 'node:crypto';

import { CheckTransitionError } from './errors/check-transition.error.js';
import { CheckDomainErrorCode } from './errors/check.errors.js';
import {
  CheckProps,
  CheckStatus,
  CheckType,
  MarkDueOptions,
  RegisterCheckInput,
  RegisterPayableCheckInput,
  BounceCheckOptions,
} from './check.types.js';

const TERMINAL_STATUSES = new Set<CheckStatus>([
  CheckStatus.COLLECTED,
  CheckStatus.BOUNCED,
  CheckStatus.TRANSFERRED,
  CheckStatus.CANCELLED,
]);

export function assertPositiveCheckAmountRial(amountRial: bigint): void {
  if (amountRial <= 0n) {
    throw new CheckTransitionError(CheckDomainErrorCode.CHECK_AMOUNT_INVALID);
  }
}

export class Check {
  private constructor(private props: CheckProps) {}

  static register(input: RegisterCheckInput): Check {
    assertPositiveCheckAmountRial(input.amountRial);

    const tenantId = input.tenantId.trim();
    const branchId = input.branchId.trim();
    const checkNumber = input.checkNumber.trim();
    const bankName = input.bankName.trim();
    const drawerName = input.drawerName.trim();

    if (!tenantId || !branchId || !checkNumber || !bankName || !drawerName) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    const now = new Date();
    return new Check({
      id: input.id ?? randomUUID(),
      tenantId,
      branchId,
      checkType: input.checkType,
      status: CheckStatus.REGISTERED,
      checkNumber,
      bankName,
      bankBranchCode: input.bankBranchCode?.trim() ?? null,
      amountRial: input.amountRial,
      dueDate: input.dueDate,
      drawerName,
      payeeName: input.payeeName?.trim() ?? null,
      sayadId: input.sayadId?.trim() ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      ledgerEntryId: null,
      installmentId: input.installmentId ?? null,
      saleId: input.saleId ?? null,
      imageFileId: input.imageFileId ?? null,
      collectedAt: null,
      collectedByStaffId: null,
      bouncedAt: null,
      bounceReason: null,
      transferredTo: null,
      transferredAt: null,
      transferredByStaffId: null,
      cancelledAt: null,
      cancelledByStaffId: null,
      trackingNotes: null,
      version: 1,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      createdById: input.createdById?.trim() ?? null,
    });
  }

  static registerPayable(input: RegisterPayableCheckInput): Check {
    assertPositiveCheckAmountRial(input.amountRial);

    const tenantId = input.tenantId.trim();
    const branchId = input.branchId.trim();
    const checkNumber = input.checkNumber.trim();
    const bankName = input.bankName.trim();
    const payeeName = input.payeeName.trim();
    const drawerName = (input.drawerName?.trim() || payeeName).trim();

    if (!tenantId || !branchId || !checkNumber || !bankName || !payeeName) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    const now = new Date();
    return new Check({
      id: input.id ?? randomUUID(),
      tenantId,
      branchId,
      checkType: CheckType.PAYABLE,
      status: CheckStatus.REGISTERED,
      checkNumber,
      bankName,
      bankBranchCode: input.bankBranchCode?.trim() ?? null,
      amountRial: input.amountRial,
      dueDate: input.dueDate,
      drawerName,
      payeeName,
      sayadId: input.sayadId?.trim() ?? null,
      paymentAttemptId: null,
      ledgerEntryId: null,
      installmentId: null,
      saleId: null,
      imageFileId: null,
      collectedAt: null,
      collectedByStaffId: null,
      bouncedAt: null,
      bounceReason: null,
      transferredTo: null,
      transferredAt: null,
      transferredByStaffId: null,
      cancelledAt: null,
      cancelledByStaffId: null,
      trackingNotes: null,
      version: 1,
      metadata: null,
      createdAt: now,
      updatedAt: now,
      createdById: input.createdById?.trim() ?? null,
    });
  }

  static reconstitute(props: CheckProps): Check {
    return new Check(props);
  }

  /** True when scheduler may call markDue (registered and due date reached). */
  isEligibleForMarkDue(asOf: Date): boolean {
    return (
      this.props.status === CheckStatus.REGISTERED && this.props.dueDate.getTime() <= asOf.getTime()
    );
  }

  markDue(at: Date = new Date(), options: MarkDueOptions = {}): void {
    if (this.props.status !== CheckStatus.REGISTERED) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID);
    }

    if (!options.manual && this.props.dueDate.getTime() > at.getTime()) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_NOT_DUE);
    }

    this.props.status = CheckStatus.DUE;
    this.props.updatedAt = at;
  }

  collect(staffId: string, at: Date): void {
    if (this.props.status === CheckStatus.COLLECTED) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_COLLECTED);
    }

    if (
      this.props.status === CheckStatus.BOUNCED ||
      this.props.status === CheckStatus.TRANSFERRED ||
      this.props.status === CheckStatus.CANCELLED
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_INVALID_STATE);
    }

    if (
      this.props.status !== CheckStatus.REGISTERED &&
      this.props.status !== CheckStatus.DUE
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID);
    }

    const collectedByStaffId = staffId.trim();
    if (!collectedByStaffId) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    this.props.status = CheckStatus.COLLECTED;
    this.props.collectedAt = at;
    this.props.collectedByStaffId = collectedByStaffId;
    this.props.updatedAt = at;
  }

  bounce(
    staffId: string,
    reason: string,
    at: Date,
    options: BounceCheckOptions = {},
  ): void {
    if (this.props.checkType !== CheckType.RECEIVED) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_TYPE_NOT_RECEIVABLE);
    }

    if (this.props.status === CheckStatus.BOUNCED) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_BOUNCED);
    }

    if (this.props.status === CheckStatus.COLLECTED) {
      if (!options.allowBounceAfterCollect) {
        throw new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_COLLECTED);
      }
    } else if (
      this.props.status !== CheckStatus.REGISTERED &&
      this.props.status !== CheckStatus.DUE
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID);
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new CheckTransitionError(CheckDomainErrorCode.BOUNCE_REASON_REQUIRED);
    }

    const bouncedByStaffId = staffId.trim();
    if (!bouncedByStaffId) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    this.props.status = CheckStatus.BOUNCED;
    this.props.bounceReason = trimmedReason;
    this.props.bouncedAt = at;
    this.props.updatedAt = at;
  }

  transfer(staffId: string, transferredTo: string, at: Date): void {
    if (this.props.status === CheckStatus.COLLECTED) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_ALREADY_COLLECTED);
    }

    if (
      this.props.status === CheckStatus.BOUNCED ||
      this.props.status === CheckStatus.TRANSFERRED ||
      this.props.status === CheckStatus.CANCELLED
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_INVALID_STATE);
    }

    if (
      this.props.status !== CheckStatus.REGISTERED &&
      this.props.status !== CheckStatus.DUE
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID);
    }

    const target = transferredTo.trim();
    if (!target) {
      throw new CheckTransitionError(CheckDomainErrorCode.TRANSFER_TARGET_REQUIRED);
    }

    const transferredByStaffId = staffId.trim();
    if (!transferredByStaffId) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    this.props.status = CheckStatus.TRANSFERRED;
    this.props.transferredTo = target;
    this.props.transferredAt = at;
    this.props.transferredByStaffId = transferredByStaffId;
    this.props.updatedAt = at;
  }

  cancel(staffId: string, at: Date): void {
    if (
      this.props.status !== CheckStatus.REGISTERED &&
      this.props.status !== CheckStatus.DUE
    ) {
      throw new CheckTransitionError(CheckDomainErrorCode.CHECK_STATUS_INVALID);
    }

    const cancelledByStaffId = staffId.trim();
    if (!cancelledByStaffId) {
      throw new CheckTransitionError(CheckDomainErrorCode.FIELD_REQUIRED);
    }

    this.props.status = CheckStatus.CANCELLED;
    this.props.cancelledAt = at;
    this.props.cancelledByStaffId = cancelledByStaffId;
    this.props.updatedAt = at;
  }

  isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.props.status);
  }

  toProps(): CheckProps {
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

  get checkType(): CheckType {
    return this.props.checkType;
  }

  get status(): CheckStatus {
    return this.props.status;
  }

  get checkNumber(): string {
    return this.props.checkNumber;
  }

  get bankName(): string {
    return this.props.bankName;
  }

  get amountRial(): bigint {
    return this.props.amountRial;
  }

  get dueDate(): Date {
    return this.props.dueDate;
  }

  get collectedAt(): Date | null {
    return this.props.collectedAt;
  }

  get bouncedAt(): Date | null {
    return this.props.bouncedAt;
  }

  get bounceReason(): string | null {
    return this.props.bounceReason;
  }

  get transferredTo(): string | null {
    return this.props.transferredTo;
  }

  get transferredAt(): Date | null {
    return this.props.transferredAt;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  get installmentId(): string | null {
    return this.props.installmentId;
  }

  get paymentAttemptId(): string | null {
    return this.props.paymentAttemptId;
  }

  get saleId(): string | null {
    return this.props.saleId;
  }

  get ledgerEntryId(): string | null {
    return this.props.ledgerEntryId;
  }
}
