import { randomUUID } from 'node:crypto';

import { DomainEvent } from '../events/domain-event.base.js';
import { DomainError } from '../errors/domain.error.js';
import { startOfUtcDay } from './date.utils.js';
import { calculateInstallmentSchedule } from './calculate-installment-schedule.js';
import { SaleDomainErrorCode } from './errors.js';
import {
  SaleArchivedEvent,
  SaleClosedEvent,
  SaleTerminatedEvent,
} from './events/sale-lifecycle.events.js';
import {
  InstallmentDraft,
  InstallmentSnapshot,
  InstallmentStatus,
} from './installment.types.js';
import {
  ARCHIVED_FROM_STATUS_METADATA_KEY,
  CreateSaleInput,
  SaleProps,
  SaleStatus,
} from './sale.types.js';
import { assertCanModifyFinancials as assertCanModifyFinancialsGuard } from './sale-totals.calculator.js';

const MIN_INSTALLMENT_COUNT = 1;
const MAX_INSTALLMENT_COUNT = 120;
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 365;
const MIN_REASON_LENGTH = 3;

const TERMINAL_INSTALLMENT_STATUSES = new Set<InstallmentStatus>([
  InstallmentStatus.PAID,
  InstallmentStatus.WAIVED,
]);

const ARCHIVABLE_STATUSES = new Set<SaleStatus>([
  SaleStatus.COMPLETED,
  SaleStatus.CANCELLED,
  SaleStatus.TERMINATED,
  SaleStatus.CLOSED,
]);

export class Sale {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(private props: SaleProps) {}

  static create(input: CreateSaleInput): { sale: Sale; installments: InstallmentDraft[] } {
    Sale.validateCreate(input);

    const now = new Date();
    const id = randomUUID();

    const sale = new Sale({
      id,
      tenantId: input.tenantId,
      branchId: input.branchId,
      tenantCustomerId: input.tenantCustomerId,
      createdByStaffId: input.createdByStaffId,
      title: input.title?.trim() ?? null,
      description: input.description?.trim() ?? null,
      invoiceNumber: input.invoiceNumber?.trim() ?? null,
      totalAmountRial: input.totalAmountRial,
      downPaymentRial: input.downPaymentRial,
      discountRial: input.discountRial ?? null,
      taxRial: input.taxRial ?? null,
      installmentCount: input.installmentCount,
      firstDueDate: input.firstDueDate,
      intervalDays: input.intervalDays,
      contractDate: input.contractDate,
      status: SaleStatus.ACTIVE,
      cancelledAt: null,
      cancelledById: null,
      cancelReason: null,
      terminatedAt: null,
      terminatedById: null,
      terminateReason: null,
      closedAt: null,
      closedById: null,
      closeReason: null,
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      version: 1,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const installments = sale.createInstallments();
    return { sale, installments };
  }

  static reconstitute(props: SaleProps): Sale {
    return new Sale(props);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  cancel(reason: string, staffId: string, installments: InstallmentSnapshot[]): void {
    this.assertNotArchivedReadonly();

    if (this.props.status === SaleStatus.CANCELLED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED);
    }
    if (this.props.status === SaleStatus.COMPLETED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_COMPLETED);
    }
    if (this.isNonCancellableLifecycleStatus()) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }
    if (installments.some((installment) => installment.status === InstallmentStatus.PAID)) {
      throw new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT);
    }

    const trimmedReason = this.assertReason(reason);

    this.props.status = SaleStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.cancelledById = staffId;
    this.props.cancelReason = trimmedReason;
    this.props.updatedAt = new Date();
  }

  terminate(actorId: string, reason: string, effectiveDate?: Date): void {
    this.assertNotArchivedReadonly();

    if (this.props.status !== SaleStatus.ACTIVE) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }

    const trimmedReason = this.assertReason(reason);
    const terminatedAt = effectiveDate ?? new Date();

    this.props.status = SaleStatus.TERMINATED;
    this.props.terminatedAt = terminatedAt;
    this.props.terminatedById = actorId;
    this.props.terminateReason = trimmedReason;
    this.props.updatedAt = new Date();

    this.recordEvent(
      new SaleTerminatedEvent(this.props.id, {
        saleId: this.props.id,
        tenantId: this.props.tenantId,
        actorId,
        reason: trimmedReason,
        effectiveDate: terminatedAt.toISOString(),
      }),
    );
  }

  close(
    actorId: string,
    reason: string,
    options?: { waiveRemaining?: boolean },
  ): void {
    this.assertNotArchivedReadonly();

    if (this.props.status !== SaleStatus.ACTIVE && this.props.status !== SaleStatus.TERMINATED) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }

    const trimmedReason = this.assertReason(reason);
    const closedAt = new Date();
    const waiveRemaining = options?.waiveRemaining ?? false;

    this.props.status = SaleStatus.CLOSED;
    this.props.closedAt = closedAt;
    this.props.closedById = actorId;
    this.props.closeReason = trimmedReason;
    this.props.updatedAt = new Date();

    this.recordEvent(
      new SaleClosedEvent(this.props.id, {
        saleId: this.props.id,
        tenantId: this.props.tenantId,
        actorId,
        reason: trimmedReason,
        waiveRemaining,
        closedAt: closedAt.toISOString(),
      }),
    );
  }

  archive(actorId: string, reason: string): void {
    if (this.props.status === SaleStatus.ARCHIVED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ARCHIVED_READONLY);
    }
    if (!ARCHIVABLE_STATUSES.has(this.props.status)) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }

    const trimmedReason = this.assertReason(reason);
    const archivedAt = new Date();
    const archivedFromStatus = this.props.status;

    this.props.metadata = {
      ...(this.props.metadata ?? {}),
      [ARCHIVED_FROM_STATUS_METADATA_KEY]: archivedFromStatus,
    };
    this.props.status = SaleStatus.ARCHIVED;
    this.props.archivedAt = archivedAt;
    this.props.archivedById = actorId;
    this.props.archiveReason = trimmedReason;
    this.props.updatedAt = new Date();

    this.recordEvent(
      new SaleArchivedEvent(this.props.id, {
        saleId: this.props.id,
        tenantId: this.props.tenantId,
        actorId,
        reason: trimmedReason,
        archivedFromStatus,
        archivedAt: archivedAt.toISOString(),
      }),
    );
  }

  unarchive(_actorId: string): void {
    if (this.props.status !== SaleStatus.ARCHIVED) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }

    const restoredStatus = this.readArchivedFromStatus();
    if (!restoredStatus) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }

    const metadata = { ...(this.props.metadata ?? {}) };
    delete metadata[ARCHIVED_FROM_STATUS_METADATA_KEY];

    this.props.status = restoredStatus;
    this.props.archivedAt = null;
    this.props.archivedById = null;
    this.props.archiveReason = null;
    this.props.metadata = Object.keys(metadata).length > 0 ? metadata : null;
    this.props.updatedAt = new Date();
  }

  canExtend(lastInstallmentDueDate: Date, newLastDueDate: Date): boolean {
    if (this.props.status !== SaleStatus.ACTIVE || this.isArchived()) {
      return false;
    }

    return startOfUtcDay(lastInstallmentDueDate) < startOfUtcDay(newLastDueDate);
  }

  canCopy(): boolean {
    return !this.isArchived();
  }

  canEditFinancials(installments: InstallmentSnapshot[]): boolean {
    if (this.props.status !== SaleStatus.ACTIVE || this.isArchived()) {
      return false;
    }

    return !installments.some((installment) => installment.status === InstallmentStatus.PAID);
  }

  assertCanModifyFinancials(installments: InstallmentSnapshot[]): void {
    assertCanModifyFinancialsGuard(this, installments);
  }

  markCompleted(installments: InstallmentSnapshot[]): void {
    if (this.props.status === SaleStatus.COMPLETED) {
      return;
    }
    if (this.props.status === SaleStatus.CANCELLED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED);
    }
    if (this.isArchived() || this.isNonCompletableLifecycleStatus()) {
      throw new DomainError(SaleDomainErrorCode.INVALID_STATUS_TRANSITION);
    }
    if (
      installments.length === 0 ||
      !installments.every((installment) => TERMINAL_INSTALLMENT_STATUSES.has(installment.status))
    ) {
      throw new DomainError(SaleDomainErrorCode.INSTALLMENT_STATUS_INVALID);
    }

    this.props.status = SaleStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }

  canSoftDelete(installments: InstallmentSnapshot[]): boolean {
    if (this.props.status === SaleStatus.COMPLETED || this.isArchived()) {
      return false;
    }
    return !installments.some((installment) => installment.status === InstallmentStatus.PAID);
  }

  createInstallments(): InstallmentDraft[] {
    const {
      totalAmountRial,
      downPaymentRial,
      installmentCount,
      firstDueDate,
      intervalDays,
      tenantId,
      id: saleId,
    } = this.props;

    const schedule = calculateInstallmentSchedule({
      totalAmountRial,
      downPaymentRial,
      installmentCount,
      firstDueDate,
      intervalDays,
    });

    const drafts: InstallmentDraft[] = schedule.map((item) => ({
      saleId,
      tenantId,
      sequenceNumber: item.sequenceNumber,
      dueDate: item.dueDate,
      amountRial: item.amountRial,
      status: InstallmentStatus.PENDING,
    }));

    const sum = drafts.reduce((acc, draft) => acc + draft.amountRial, 0n);
    if (sum + downPaymentRial !== totalAmountRial) {
      throw new DomainError(SaleDomainErrorCode.INSTALLMENT_SUM_MISMATCH);
    }

    return drafts;
  }

  toProps(): SaleProps {
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

  get tenantCustomerId(): string {
    return this.props.tenantCustomerId;
  }

  get createdByStaffId(): string {
    return this.props.createdByStaffId;
  }

  get title(): string | null {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get invoiceNumber(): string | null {
    return this.props.invoiceNumber;
  }

  get totalAmountRial(): bigint {
    return this.props.totalAmountRial;
  }

  get downPaymentRial(): bigint {
    return this.props.downPaymentRial;
  }

  get discountRial(): bigint | null {
    return this.props.discountRial;
  }

  get taxRial(): bigint | null {
    return this.props.taxRial;
  }

  get installmentCount(): number {
    return this.props.installmentCount;
  }

  get firstDueDate(): Date {
    return this.props.firstDueDate;
  }

  get intervalDays(): number {
    return this.props.intervalDays;
  }

  get contractDate(): Date {
    return this.props.contractDate;
  }

  get status(): SaleStatus {
    return this.props.status;
  }

  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }

  get cancelledById(): string | null {
    return this.props.cancelledById;
  }

  get cancelReason(): string | null {
    return this.props.cancelReason;
  }

  get terminatedAt(): Date | null {
    return this.props.terminatedAt;
  }

  get terminatedById(): string | null {
    return this.props.terminatedById;
  }

  get terminateReason(): string | null {
    return this.props.terminateReason;
  }

  get closedAt(): Date | null {
    return this.props.closedAt;
  }

  get closedById(): string | null {
    return this.props.closedById;
  }

  get closeReason(): string | null {
    return this.props.closeReason;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  get archivedById(): string | null {
    return this.props.archivedById;
  }

  get archiveReason(): string | null {
    return this.props.archiveReason;
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

  private recordEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  private isArchived(): boolean {
    return this.props.status === SaleStatus.ARCHIVED || this.props.archivedAt != null;
  }

  private assertNotArchivedReadonly(): void {
    if (this.isArchived()) {
      throw new DomainError(SaleDomainErrorCode.SALE_ARCHIVED_READONLY);
    }
  }

  private assertReason(reason: string): string {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      throw new DomainError('FIELD_REQUIRED');
    }
    return trimmedReason;
  }

  private isNonCancellableLifecycleStatus(): boolean {
    return (
      this.props.status === SaleStatus.TERMINATED ||
      this.props.status === SaleStatus.CLOSED ||
      this.props.status === SaleStatus.ARCHIVED
    );
  }

  private isNonCompletableLifecycleStatus(): boolean {
    return (
      this.props.status === SaleStatus.TERMINATED ||
      this.props.status === SaleStatus.CLOSED ||
      this.props.status === SaleStatus.ARCHIVED
    );
  }

  private readArchivedFromStatus(): SaleStatus | null {
    const value = this.props.metadata?.[ARCHIVED_FROM_STATUS_METADATA_KEY];
    if (
      typeof value !== 'string' ||
      !Object.values(SaleStatus).includes(value as SaleStatus) ||
      value === SaleStatus.ARCHIVED
    ) {
      return null;
    }
    return value as SaleStatus;
  }

  private static validateCreate(input: CreateSaleInput): void {
    if (input.totalAmountRial <= 0n) {
      throw new DomainError(SaleDomainErrorCode.AMOUNT_MUST_BE_POSITIVE);
    }

    if (input.downPaymentRial < 0n || input.downPaymentRial > input.totalAmountRial) {
      throw new DomainError(SaleDomainErrorCode.AMOUNT_EXCEEDS_TOTAL);
    }

    if (
      !Number.isInteger(input.installmentCount) ||
      input.installmentCount < MIN_INSTALLMENT_COUNT ||
      input.installmentCount > MAX_INSTALLMENT_COUNT
    ) {
      throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
    }

    const remaining = input.totalAmountRial - input.downPaymentRial;
    if (remaining === 0n && input.installmentCount !== 1) {
      throw new DomainError(SaleDomainErrorCode.INSTALLMENT_COUNT_INVALID);
    }

    if (startOfUtcDay(input.firstDueDate) <= startOfUtcDay(new Date())) {
      throw new DomainError(SaleDomainErrorCode.DUE_DATE_IN_PAST);
    }

    if (
      !Number.isInteger(input.intervalDays) ||
      input.intervalDays < MIN_INTERVAL_DAYS ||
      input.intervalDays > MAX_INTERVAL_DAYS
    ) {
      throw new DomainError(SaleDomainErrorCode.INTERVAL_INVALID);
    }

    if (!input.tenantId.trim() || !input.branchId.trim()) {
      throw new DomainError('FIELD_REQUIRED');
    }
  }
}
