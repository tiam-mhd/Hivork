import {
  CheckTransitionError,
  Installment,
  InstallmentStatus,
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentLedgerService,
  ReportedByType,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository, CheckRecord } from '../ports/check.repository.port.js';
import type {
  IInstallmentRepository,
  InstallmentRecord,
} from '../ports/installment.repository.port.js';
import type {
  IPaymentAttemptRepository,
  PaymentAttemptRecord,
} from '../ports/payment-attempt.repository.port.js';
import type { IPaymentLedgerRepository } from '../ports/payment-ledger.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapCheckToSummary } from './check.mapper.js';
import { reconstituteCheckFromRecord } from './check-record.mapper.js';

export type CollectCheckInput = {
  tenantId: string;
  staffId: string;
  checkId: string;
  collectedAt?: Date;
  bankDepositRef?: string;
  confirmInstallment?: boolean;
  idempotencyKey?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CollectCheckResult = {
  check: ReturnType<typeof mapCheckToSummary>;
  ledgerEntryId?: string;
  installment?: {
    id: string;
    status: string;
    paidAt: string | null;
  };
  idempotentReplay: boolean;
};

const ledgerService = new PaymentLedgerService();

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

function mapInstallmentStatusForResponse(status: InstallmentStatus): string {
  switch (status) {
    case InstallmentStatus.OVERDUE:
      return 'overdue';
    case InstallmentStatus.PAID:
      return 'paid';
    case InstallmentStatus.WAIVED:
      return 'waived';
    default:
      return 'pending';
  }
}

function mapCollectDomainError(error: CheckTransitionError): ApplicationError {
  const mapped = mapDomainError(error);
  if (
    error.code === 'CHECK_ALREADY_COLLECTED' ||
    error.code === 'CHECK_INVALID_STATE'
  ) {
    return new ApplicationError(error.code, mapped.message, 409);
  }
  return mapped;
}

function buildCollectResult(
  check: CheckRecord,
  idempotentReplay: boolean,
  installment?: CollectCheckResult['installment'],
): CollectCheckResult {
  return {
    check: mapCheckToSummary(check),
    ...(check.ledgerEntryId ? { ledgerEntryId: check.ledgerEntryId } : {}),
    ...(installment ? { installment } : {}),
    idempotentReplay,
  };
}

export class CollectCheckUseCase implements UseCase<CollectCheckInput, CollectCheckResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly ledger: IPaymentLedgerRepository,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CollectCheckInput): Promise<CollectCheckResult> {
    if (input.idempotencyKey) {
      const replay = await this.checks.findByCollectIdempotencyKey(
        input.tenantId,
        input.idempotencyKey,
      );
      if (replay) {
        return buildCollectResult(replay, true);
      }
    }

    const record = await this.checks.findById(input.tenantId, input.checkId);
    if (!record) {
      throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
    }

    if (record.status === 'COLLECTED') {
      const storedKey = record.metadata?.collectIdempotencyKey;
      if (input.idempotencyKey && storedKey === input.idempotencyKey) {
        return buildCollectResult(record, true);
      }
      throw new ApplicationError(
        'CHECK_ALREADY_COLLECTED',
        'Check is already collected.',
        409,
      );
    }

    await this.assertBranchAccess(input.tenantId, record.branchId, input.staffContext);

    const checkEntity = reconstituteCheckFromRecord(record);
    const collectedAt = input.collectedAt ?? new Date();

    try {
      checkEntity.collect(input.staffId, collectedAt);
    } catch (error) {
      if (error instanceof CheckTransitionError) {
        throw mapCollectDomainError(error);
      }
      throw error;
    }

    const ledgerDescription = input.bankDepositRef
      ? `Check collection ${record.checkNumber} (${input.bankDepositRef})`
      : `Check collection ${record.checkNumber}`;

    const ledgerEntity = ledgerService.postPaymentIn({
      tenantId: record.tenantId,
      branchId: record.branchId,
      amountRial: record.amountRial,
      occurredAt: collectedAt,
      recordedAt: collectedAt,
      paymentMethod: 'check',
      description: ledgerDescription,
      paymentAttemptId: record.paymentAttemptId,
      installmentId: record.installmentId,
      saleId: record.saleId,
      checkId: record.id,
      createdById: input.staffId,
    });

    const metadata: Record<string, unknown> = {
      ...(record.metadata ?? {}),
      ...(input.bankDepositRef ? { bankDepositRef: input.bankDepositRef } : {}),
      ...(input.idempotencyKey ? { collectIdempotencyKey: input.idempotencyKey } : {}),
    };

    return this.unitOfWork.transaction(async (tx) => {
      const ledgerEntry = await this.ledger.create(
        {
          id: ledgerEntity.id,
          tenantId: record.tenantId,
          branchId: record.branchId,
          entryType: 'PAYMENT_IN',
          direction: 'CREDIT',
          amountRial: record.amountRial,
          status: 'POSTED',
          occurredAt: collectedAt,
          recordedAt: collectedAt,
          paymentMethod: 'check',
          description: ledgerDescription,
          paymentAttemptId: record.paymentAttemptId,
          installmentId: record.installmentId,
          saleId: record.saleId,
          checkId: record.id,
          metadata: input.idempotencyKey
            ? { collectIdempotencyKey: input.idempotencyKey }
            : null,
          createdById: input.staffId,
        },
        tx,
      );

      const collectResult = await this.checks.markCollected(
        {
          tenantId: input.tenantId,
          id: record.id,
          expectedVersion: record.version,
          collectedAt,
          ledgerEntryId: ledgerEntry.id,
          updatedById: input.staffId,
          metadata,
        },
        tx,
      );

      if (collectResult.outcome === 'not_found') {
        throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
      }

      if (collectResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Check was updated by another request.',
          409,
        );
      }

      let installmentResponse: CollectCheckResult['installment'];

      if (record.paymentAttemptId) {
        await this.confirmLinkedPaymentAttempt(
          input,
          record.paymentAttemptId,
          collectedAt,
          tx,
        );
      }

      if (record.installmentId && input.confirmInstallment !== false) {
        installmentResponse = await this.applyInstallmentPayment(
          input,
          record,
          collectedAt,
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'check.collect',
          entityType: 'check',
          entityId: collectResult.check.id,
          newValue: {
            status: 'collected',
            ledgerEntryId: ledgerEntry.id,
            collectedAt: collectedAt.toISOString(),
            installmentId: record.installmentId,
            confirmInstallment: input.confirmInstallment !== false,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return buildCollectResult(collectResult.check, false, installmentResponse);
    });
  }

  private async confirmLinkedPaymentAttempt(
    input: CollectCheckInput,
    paymentAttemptId: string,
    _confirmedAt: Date,
    tx: Parameters<Parameters<IUnitOfWork['transaction']>[0]>[0],
  ): Promise<void> {
    const attempt = await this.paymentAttempts.findById(input.tenantId, paymentAttemptId, tx);
    if (!attempt || attempt.status !== 'PENDING') {
      return;
    }

    const attemptEntity = paymentAttemptRecordToEntity(attempt);
    attemptEntity.confirm(input.staffId);

    await this.paymentAttempts.confirm(
      {
        tenantId: input.tenantId,
        id: attempt.id,
        expectedVersion: attempt.version,
        confirmedByStaffId: input.staffId,
        updatedById: input.staffId,
      },
      tx,
    );
  }

  private async applyInstallmentPayment(
    input: CollectCheckInput,
    check: CheckRecord,
    confirmedAt: Date,
    tx: Parameters<Parameters<IUnitOfWork['transaction']>[0]>[0],
  ): Promise<CollectCheckResult['installment']> {
    const loaded = await this.installments.findByIdWithSale(
      input.tenantId,
      check.installmentId!,
      tx,
    );

    if (!loaded) {
      return undefined;
    }

    const { installment: installmentRecord } = loaded;

    if (installmentRecord.status === 'WAIVED' || installmentRecord.status === 'PAID') {
      return undefined;
    }

    const confirmedPrincipalBefore =
      await this.paymentAttempts.sumConfirmedPrincipalAmountByInstallmentId(
        input.tenantId,
        installmentRecord.id,
        tx,
      );

    const installmentEntity = installmentRecordToEntity(installmentRecord);

    if (check.amountRial + confirmedPrincipalBefore > installmentRecord.amountRial) {
      return undefined;
    }

    try {
      installmentEntity.applyPayment({
        amountRial: check.amountRial,
        isFeePayment: false,
        confirmedByStaffId: input.staffId,
        confirmedPrincipalRialBefore: confirmedPrincipalBefore,
        confirmedAt,
      });
    } catch {
      return undefined;
    }

    const installmentProps = installmentEntity.toProps();
    const updateResult = await this.installments.applyPaymentConfirm(
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

    if (updateResult.outcome !== 'updated') {
      return undefined;
    }

    return {
      id: updateResult.installment.id,
      status: mapInstallmentStatusForResponse(toDomainInstallmentStatus(updateResult.installment.status)),
      paidAt: updateResult.installment.paidAt?.toISOString() ?? null,
    };
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
}
