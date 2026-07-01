import { randomUUID } from 'node:crypto';

import { startOfUtcDay } from './date.utils.js';
import { calculateInstallmentSchedule } from './calculate-installment-schedule.js';
import { SaleDomainErrorCode } from './errors.js';
import {
  InstallmentDraft,
  InstallmentSnapshot,
  InstallmentStatus,
} from './installment.types.js';
import { CreateSaleInput, SaleProps, SaleStatus } from './sale.types.js';
import { DomainError } from '../errors/domain.error.js';

const MIN_INSTALLMENT_COUNT = 1;
const MAX_INSTALLMENT_COUNT = 120;
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 365;

const TERMINAL_INSTALLMENT_STATUSES = new Set<InstallmentStatus>([
  InstallmentStatus.PAID,
  InstallmentStatus.WAIVED,
]);

export class Sale {
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

  cancel(reason: string, staffId: string, installments: InstallmentSnapshot[]): void {
    if (this.props.status === SaleStatus.CANCELLED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED);
    }
    if (this.props.status === SaleStatus.COMPLETED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_COMPLETED);
    }
    if (installments.some((installment) => installment.status === InstallmentStatus.PAID)) {
      throw new DomainError(SaleDomainErrorCode.SALE_HAS_PAID_INSTALLMENT);
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new DomainError('FIELD_REQUIRED');
    }

    this.props.status = SaleStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.cancelledById = staffId;
    this.props.cancelReason = trimmedReason;
    this.props.updatedAt = new Date();
  }

  markCompleted(installments: InstallmentSnapshot[]): void {
    if (this.props.status === SaleStatus.COMPLETED) {
      return;
    }
    if (this.props.status === SaleStatus.CANCELLED) {
      throw new DomainError(SaleDomainErrorCode.SALE_ALREADY_CANCELLED);
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
    if (this.props.status === SaleStatus.COMPLETED) {
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
