import type { VoidLedgerTransactionResponseDto } from '@hivork/contracts/payments';
import {
  Installment,
  InstallmentStatus,
  PaymentAttempt,
  PaymentAttemptDomainErrorCode,
  PaymentAttemptStatus,
  PaymentVoidedEvent,
  ReportedByType,
  type PaymentLedgerEntryProps,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import { resolvePaymentRecordingSettings } from '../installments/payments/record-payment.helper.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IInstallmentRepository, InstallmentRecord } from '../ports/installment.repository.port.js';
import type { IOutboxPublisher } from '../ports/outbox.port.js';
import type {
  IPaymentAttemptRepository,
  PaymentAttemptRecord,
} from '../ports/payment-attempt.repository.port.js';
import type { IPaymentLedgerRepository } from '../ports/payment-ledger.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { SaleRecord } from '../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../installments/sales/sale-data-scope.js';
import {
  mapLedgerDirectionToApi,
  mapLedgerEntryTypeToApi,
  mapRecordToLedgerEntity,
} from './ledger-entry.mapper.js';

export type VoidLedgerTransactionInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  ledgerEntryId: string;
  voidReason: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type VoidLedgerTransactionResult = VoidLedgerTransactionResponseDto;

function toDomainInstallmentStatus(status: string): InstallmentStatus {
  switch (status) {
    case 'OVERDUE':
      return InstallmentStatus.OVERDUE;
    case 'PAID':
      return InstallmentStatus.PAID;
    case 'WAIVED':
      return InstallmentStatus.WAIVED;
    default:
      return InstallmentStatus.PENDING;
  }
}

function toPrismaInstallmentStatus(status: InstallmentStatus): InstallmentRecord['status'] {
  switch (status) {
    case InstallmentStatus.OVERDUE:
      return 'OVERDUE';
    case InstallmentStatus.PAID:
      return 'PAID';
    case InstallmentStatus.WAIVED:
      return 'WAIVED';
    default:
      return 'PENDING';
  }
}

function installmentRecordToEntity(record: InstallmentRecord): Installment {
  return Installment.reconstitute({
    id: record.id,
    saleId: record.saleId,
    tenantId: record.tenantId,
    sequenceNumber: record.sequenceNumber,
    dueDate: record.dueDate,
    amountRial: record.amountRial,
    status: toDomainInstallmentStatus(record.status),
    paidAt: record.paidAt,
    confirmedByStaffId: record.confirmedByStaffId,
    waivedByStaffId: record.waivedByStaffId,
    waiveReason: record.waiveReason,
    version: record.version,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function paymentAttemptRecordToEntity(record: PaymentAttemptRecord): PaymentAttempt {
  return PaymentAttempt.reconstitute({
    id: record.id,
    installmentId: record.installmentId,
    tenantId: record.tenantId,
    reportedByType:
      record.reportedByType === 'CUSTOMER' ? ReportedByType.CUSTOMER : ReportedByType.STAFF,
    reportedById: record.reportedById,
    amountRial: record.amountRial,
    status:
      record.status === 'CONFIRMED'
        ? PaymentAttemptStatus.CONFIRMED
        : record.status === 'REJECTED'
          ? PaymentAttemptStatus.REJECTED
          : record.status === 'VOIDED'
            ? PaymentAttemptStatus.VOIDED
            : PaymentAttemptStatus.PENDING,
    evidenceFileId: record.evidenceFileId,
    note: record.note,
    confirmedByStaffId: record.confirmedByStaffId,
    rejectedReason: record.rejectedReason,
    idempotencyKey: record.idempotencyKey,
    confirmedAt: record.confirmedAt,
    rejectedAt: record.rejectedAt,
    version: record.version,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function isFeePayment(paymentMethod: string | null): boolean {
  return paymentMethod === 'fee';
}

function assertNotSettlementLocked(input: {
  settlementBatchId: string | null;
  paymentAttemptMetadata: Record<string, unknown> | null;
}): void {
  if (input.settlementBatchId) {
    throw new ApplicationError(
      'SETTLEMENT_LOCKED',
      'Ledger entry is locked by a settlement batch.',
      409,
    );
  }

  if (input.paymentAttemptMetadata?.settlementBatchClosed === true) {
    throw new ApplicationError(
      'SETTLEMENT_LOCKED',
      'Payment is locked by a closed settlement batch.',
      409,
    );
  }
}

function assertWithinVoidWindow(confirmedAt: Date, voidWindowDays: number, now = new Date()): void {
  const elapsedMs = now.getTime() - confirmedAt.getTime();
  const windowMs = voidWindowDays * 24 * 60 * 60 * 1000;

  if (elapsedMs > windowMs) {
    throw new ApplicationError(
      'VOID_WINDOW_EXPIRED',
      'Payment void window has expired for this attempt.',
      403,
    );
  }
}

function mapReversalResponse(reversal: PaymentLedgerEntryProps): VoidLedgerTransactionResponseDto['reversalEntry'] {
  return {
    id: reversal.id,
    entryType: mapLedgerEntryTypeToApi(reversal.entryType) as VoidLedgerTransactionResponseDto['reversalEntry']['entryType'],
    direction: mapLedgerDirectionToApi(reversal.direction) as VoidLedgerTransactionResponseDto['reversalEntry']['direction'],
    amountRial: reversal.amountRial.toString(),
    status: 'posted',
  };
}

export class VoidLedgerTransactionUseCase
  implements UseCase<VoidLedgerTransactionInput, VoidLedgerTransactionResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly ledger: IPaymentLedgerRepository,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: VoidLedgerTransactionInput): Promise<VoidLedgerTransactionResult> {
    const voidReason = input.voidReason.trim();
    if (!voidReason) {
      throw new ApplicationError('VALIDATION_ERROR', 'Void reason is required.', 400);
    }

    const sourceEntry = await this.ledger.findById(input.tenantId, input.ledgerEntryId);
    if (!sourceEntry) {
      throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
    }

    if (sourceEntry.status === 'VOIDED') {
      throw new ApplicationError(
        'LEDGER_ALREADY_VOIDED',
        'Ledger entry is already voided.',
        409,
      );
    }

    if (sourceEntry.reversesEntryId) {
      throw new ApplicationError(
        'LEDGER_ALREADY_VOIDED',
        'Reversal ledger entries cannot be voided.',
        409,
      );
    }

    if (sourceEntry.status !== 'POSTED') {
      throw new ApplicationError(
        'LEDGER_ENTRY_NOT_VOIDABLE',
        'Only posted ledger entries can be voided.',
        409,
      );
    }

    if (sourceEntry.entryType === 'REFUND') {
      throw new ApplicationError(
        'VOID_NOT_ALLOWED_ON_REFUND',
        'Refund ledger entries cannot be voided.',
        403,
      );
    }

    if (sourceEntry.version !== input.expectedVersion) {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Ledger entry version conflict.',
        409,
        { currentVersion: sourceEntry.version },
      );
    }

    const priorRefunds = await this.ledger.sumPostedRefundsForEntry(
      input.tenantId,
      sourceEntry.id,
    );
    if (priorRefunds > 0n) {
      throw new ApplicationError(
        'LEDGER_HAS_REFUNDS',
        'Ledger entries with posted refunds cannot be voided.',
        409,
        { priorRefundsRial: priorRefunds.toString() },
      );
    }

    await this.assertBranchAccess(input.tenantId, sourceEntry.branchId, input.staffContext);
    await this.assertEntryInScope(input, sourceEntry);

    let paymentAttempt: PaymentAttemptRecord | null = null;
    if (sourceEntry.paymentAttemptId) {
      paymentAttempt = await this.paymentAttempts.findById(
        input.tenantId,
        sourceEntry.paymentAttemptId,
      );
    }

    assertNotSettlementLocked({
      settlementBatchId: sourceEntry.settlementBatchId,
      paymentAttemptMetadata: paymentAttempt?.metadata ?? null,
    });

    const voidedAt = new Date();
    let voidResult: { original: PaymentLedgerEntryProps; reversal: PaymentLedgerEntryProps };

    try {
      voidResult = mapRecordToLedgerEntity(sourceEntry).void(
        input.staffId,
        voidReason,
        voidedAt,
      );
    } catch (error) {
      throw mapDomainError(error);
    }

    let paymentAttemptVoided = false;

    return this.unitOfWork.transaction(async (tx) => {
      const markResult = await this.ledger.markVoided(
        {
          tenantId: input.tenantId,
          id: sourceEntry.id,
          expectedVersion: input.expectedVersion,
          voidedAt,
          voidedById: input.staffId,
          voidReason,
          updatedById: input.staffId,
        },
        tx,
      );

      if (markResult.outcome === 'not_found') {
        throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
      }

      if (markResult.outcome === 'already_voided') {
        throw new ApplicationError(
          'LEDGER_ALREADY_VOIDED',
          'Ledger entry is already voided.',
          409,
        );
      }

      if (markResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Ledger entry version conflict.',
          409,
          { currentVersion: markResult.currentVersion },
        );
      }

      await this.ledger.create(
        {
          id: voidResult.reversal.id,
          tenantId: voidResult.reversal.tenantId,
          branchId: voidResult.reversal.branchId,
          entryType: voidResult.reversal.entryType,
          direction: voidResult.reversal.direction,
          amountRial: voidResult.reversal.amountRial,
          status: voidResult.reversal.status,
          occurredAt: voidResult.reversal.occurredAt,
          recordedAt: voidResult.reversal.recordedAt,
          paymentMethod: voidResult.reversal.paymentMethod,
          description: voidResult.reversal.description,
          paymentAttemptId: voidResult.reversal.paymentAttemptId,
          installmentId: voidResult.reversal.installmentId,
          saleId: voidResult.reversal.saleId,
          settlementBatchId: voidResult.reversal.settlementBatchId,
          reversesEntryId: voidResult.reversal.reversesEntryId,
          metadata: voidResult.reversal.metadata,
          createdById: input.staffId,
        },
        tx,
      );

      if (
        paymentAttempt &&
        paymentAttempt.status === 'CONFIRMED' &&
        sourceEntry.paymentAttemptId === paymentAttempt.id
      ) {
        paymentAttemptVoided = await this.chainVoidConfirmedPayment(
          {
            input,
            voidReason,
            voidedAt,
            attempt: paymentAttempt,
            sourceEntry,
          },
          tx,
        );
      } else if (sourceEntry.installmentId && sourceEntry.entryType === 'PAYMENT_IN') {
        await this.revertInstallmentForLedgerVoid(
          {
            tenantId: input.tenantId,
            staffId: input.staffId,
            installmentId: sourceEntry.installmentId,
            amountRial: sourceEntry.amountRial,
            isFeePayment: isFeePayment(sourceEntry.paymentMethod),
            voidedAt,
          },
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'payment.void',
          entityType: 'PaymentLedgerEntry',
          entityId: sourceEntry.id,
          oldValue: {
            status: 'posted',
            amountRial: sourceEntry.amountRial.toString(),
          },
          newValue: {
            status: 'voided',
            reversalEntryId: voidResult.reversal.id,
            voidReason,
            paymentAttemptVoided,
          },
          metadata: {
            context: 'ledger',
            paymentAttemptId: sourceEntry.paymentAttemptId,
            installmentId: sourceEntry.installmentId,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        originalEntry: {
          id: sourceEntry.id,
          status: 'voided',
        },
        reversalEntry: mapReversalResponse(voidResult.reversal),
        ...(paymentAttemptVoided ? { paymentAttemptVoided: true } : {}),
      };
    });
  }

  private async chainVoidConfirmedPayment(
    params: {
      input: VoidLedgerTransactionInput;
      voidReason: string;
      voidedAt: Date;
      attempt: PaymentAttemptRecord;
      sourceEntry: { installmentId: string | null; amountRial: bigint; paymentMethod: string | null };
    },
    tx: Parameters<Parameters<IUnitOfWork['transaction']>[0]>[0],
  ): Promise<boolean> {
    const { input, voidReason, voidedAt, attempt, sourceEntry } = params;

    if (!sourceEntry.installmentId) {
      throw new ApplicationError(
        'INSTALLMENT_NOT_FOUND',
        'Linked installment was not found for payment void.',
        404,
      );
    }

    const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);
    const paymentSettings = resolvePaymentRecordingSettings(settings);

    if (!attempt.confirmedAt) {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
        'Only confirmed payment attempts can be voided.',
        409,
      );
    }

    assertWithinVoidWindow(attempt.confirmedAt, paymentSettings.voidWindowDays, voidedAt);

    const loaded = await this.installments.findByIdWithSale(
      input.tenantId,
      sourceEntry.installmentId,
      tx,
    );

    if (!loaded) {
      throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
    }

    const { installment: installmentRecord, sale } = loaded;

    if (!isSaleInScope(sale as SaleRecord, input.staffId, input.staffContext)) {
      throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
    }

    const feePayment = isFeePayment(sourceEntry.paymentMethod);
    const installmentEntity = installmentRecordToEntity(installmentRecord);

    try {
      installmentEntity.revertPayment({
        amountRial: attempt.amountRial,
        isFeePayment: feePayment,
        voidedAt,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const attemptEntity = paymentAttemptRecordToEntity(attempt);
    try {
      attemptEntity.void(input.staffId, voidReason, voidedAt);
    } catch (error) {
      throw mapDomainError(error);
    }

    const voidResult = await this.paymentAttempts.void(
      {
        tenantId: input.tenantId,
        id: attempt.id,
        expectedVersion: attempt.version,
        metadata: attemptEntity.toProps().metadata ?? {},
        updatedById: input.staffId,
      },
      tx,
    );

    if (voidResult.outcome === 'not_found') {
      throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
    }

    if (voidResult.outcome === 'status_invalid') {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_VOIDED,
        'Payment attempt is already voided.',
        409,
      );
    }

    if (voidResult.outcome === 'version_conflict') {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Payment attempt version conflict.',
        409,
        { currentVersion: voidResult.currentVersion },
      );
    }

    const installmentProps = installmentEntity.toProps();
    const installmentUpdate = await this.installments.applyPaymentConfirm(
      {
        tenantId: input.tenantId,
        installmentId: installmentRecord.id,
        expectedVersion: installmentRecord.version,
        status: toPrismaInstallmentStatus(installmentProps.status),
        paidAt: installmentProps.paidAt,
        confirmedByStaffId: installmentProps.confirmedByStaffId,
        metadata: installmentProps.metadata,
        updatedById: input.staffId,
      },
      tx,
    );

    if (installmentUpdate.outcome === 'not_found') {
      throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
    }

    if (installmentUpdate.outcome === 'version_conflict') {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Installment version conflict.',
        409,
        { currentVersion: installmentUpdate.currentVersion },
      );
    }

    await this.outbox.publish(
      new PaymentVoidedEvent(voidResult.attempt.id, {
        tenantId: input.tenantId,
        tenantCustomerId: sale.tenantCustomerId,
        installmentId: installmentRecord.id,
        paymentAttemptId: voidResult.attempt.id,
        voidReason,
        amountRial: attempt.amountRial.toString(),
      }),
      { tenantId: input.tenantId, aggregateType: 'payment_attempt' },
      tx,
    );

    return true;
  }

  private async revertInstallmentForLedgerVoid(
    input: {
      tenantId: string;
      staffId: string;
      installmentId: string;
      amountRial: bigint;
      isFeePayment: boolean;
      voidedAt: Date;
    },
    tx: Parameters<Parameters<IUnitOfWork['transaction']>[0]>[0],
  ): Promise<void> {
    const loaded = await this.installments.findByIdWithSale(
      input.tenantId,
      input.installmentId,
      tx,
    );

    if (!loaded) {
      return;
    }

    const installmentEntity = installmentRecordToEntity(loaded.installment);

    try {
      installmentEntity.revertPayment({
        amountRial: input.amountRial,
        isFeePayment: input.isFeePayment,
        voidedAt: input.voidedAt,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const installmentProps = installmentEntity.toProps();
    await this.installments.applyPaymentConfirm(
      {
        tenantId: input.tenantId,
        installmentId: loaded.installment.id,
        expectedVersion: loaded.installment.version,
        status: toPrismaInstallmentStatus(installmentProps.status),
        paidAt: installmentProps.paidAt,
        confirmedByStaffId: installmentProps.confirmedByStaffId,
        metadata: installmentProps.metadata,
        updatedById: input.staffId,
      },
      tx,
    );
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not available for this tenant.',
        403,
      );
    }

    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_ACCESS_DENIED',
        'Branch is not assigned to this staff.',
        403,
      );
    }
  }

  private async assertEntryInScope(
    input: VoidLedgerTransactionInput,
    entry: { installmentId: string | null; saleId: string | null },
  ): Promise<void> {
    if (entry.installmentId) {
      const loaded = await this.installments.findByIdWithSale(
        input.tenantId,
        entry.installmentId,
      );

      if (!loaded) {
        throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
      }

      if (!isSaleInScope(loaded.sale as SaleRecord, input.staffId, input.staffContext)) {
        throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
      }

      return;
    }

    if (entry.saleId) {
      const installments = await this.installments.findBySaleId(input.tenantId, entry.saleId);
      const first = installments[0];
      if (!first) {
        throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
      }

      const loaded = await this.installments.findByIdWithSale(input.tenantId, first.id);
      if (!loaded || !isSaleInScope(loaded.sale as SaleRecord, input.staffId, input.staffContext)) {
        throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
      }
    }
  }
}
