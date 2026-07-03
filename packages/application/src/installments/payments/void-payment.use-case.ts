import {
  DomainError,
  Installment,
  InstallmentStatus,
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentAttemptDomainErrorCode,
  PaymentVoidedEvent,
  ReportedByType,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository, InstallmentRecord } from '../../ports/installment.repository.port.js';
import type { IOutboxPublisher } from '../../ports/outbox.port.js';
import type {
  IPaymentAttemptRepository,
  PaymentAttemptRecord,
} from '../../ports/payment-attempt.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import { resolvePaymentRecordingSettings } from './record-payment.helper.js';

export type VoidPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  paymentAttemptId: string;
  voidReason: string;
  expectedAttemptVersion: number;
  expectedInstallmentVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type VoidPaymentResult = {
  paymentAttempt: {
    id: string;
    status: 'voided';
    voidReason: string;
    voidedAt: Date;
    version: number;
  };
  installment: {
    id: string;
    status: string;
    paidAt: Date | null;
    version: number;
  };
};

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

function isFeePayment(metadata: Record<string, unknown> | null): boolean {
  return metadata?.method === 'fee';
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

function assertNotSettlementLocked(metadata: Record<string, unknown> | null): void {
  if (metadata?.settlementBatchClosed === true) {
    throw new ApplicationError(
      'SETTLEMENT_LOCKED',
      'Payment is locked by a closed settlement batch.',
      409,
    );
  }
}

function mapVoidPaymentError(error: unknown): ApplicationError {
  if (error instanceof DomainError) {
    if (error.code === PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_VOIDED) {
      return new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_VOIDED,
        'Payment attempt is already voided.',
        409,
      );
    }

    if (error.code === PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED) {
      return new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
        'Only confirmed payment attempts can be voided.',
        409,
      );
    }

    return mapDomainError(error);
  }

  throw error;
}

export class VoidPaymentUseCase implements UseCase<VoidPaymentInput, VoidPaymentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: VoidPaymentInput): Promise<VoidPaymentResult> {
    const voidReason = input.voidReason.trim();
    const attempt = await this.paymentAttempts.findById(input.tenantId, input.paymentAttemptId);

    if (!attempt) {
      throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
    }

    if (attempt.status === 'VOIDED') {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_VOIDED,
        'Payment attempt is already voided.',
        409,
      );
    }

    if (attempt.status !== 'CONFIRMED') {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
        'Only confirmed payment attempts can be voided.',
        409,
      );
    }

    if (attempt.version !== input.expectedAttemptVersion) {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Payment attempt version conflict.',
        409,
        { currentVersion: attempt.version },
      );
    }

    if (!attempt.confirmedAt) {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
        'Only confirmed payment attempts can be voided.',
        409,
      );
    }

    assertNotSettlementLocked(attempt.metadata);

    return this.unitOfWork.transaction(async (tx) => {
      await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

      const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);
      const paymentSettings = resolvePaymentRecordingSettings(settings);
      assertWithinVoidWindow(attempt.confirmedAt!, paymentSettings.voidWindowDays);

      const loaded = await this.installments.findByIdWithSale(
        input.tenantId,
        attempt.installmentId,
        tx,
      );

      if (!loaded) {
        throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
      }

      const { installment: installmentRecord, sale } = loaded;

      if (!isSaleInScope(sale as SaleRecord, input.staffId, input.staffContext)) {
        throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
      }

      if (sale.branchId !== input.branchId) {
        throw new ApplicationError(
          'BRANCH_ACCESS_DENIED',
          'Branch is not in scope for this payment.',
          403,
        );
      }

      if (installmentRecord.version !== input.expectedInstallmentVersion) {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment version conflict.',
          409,
          { currentVersion: installmentRecord.version },
        );
      }

      const feePayment = isFeePayment(attempt.metadata);
      const installmentEntity = installmentRecordToEntity(installmentRecord);
      const voidedAt = new Date();

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
        throw mapVoidPaymentError(error);
      }

      const voidResult = await this.paymentAttempts.void(
        {
          tenantId: input.tenantId,
          id: attempt.id,
          expectedVersion: input.expectedAttemptVersion,
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
          voidResult.status === 'VOIDED'
            ? PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_VOIDED
            : PaymentAttemptDomainErrorCode.PAYMENT_NOT_CONFIRMED,
          voidResult.status === 'VOIDED'
            ? 'Payment attempt is already voided.'
            : 'Only confirmed payment attempts can be voided.',
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
          expectedVersion: input.expectedInstallmentVersion,
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

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'payment.void',
          entityType: 'payment_attempt',
          entityId: voidResult.attempt.id,
          newValue: {
            installmentId: installmentRecord.id,
            amountRial: attempt.amountRial.toString(),
            method: attempt.metadata?.method ?? 'cash',
            voidReason,
            installmentStatus: installmentUpdate.installment.status,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      const voidedAtFromMetadata =
        typeof voidResult.attempt.metadata?.voidedAt === 'string'
          ? new Date(voidResult.attempt.metadata.voidedAt)
          : voidedAt;

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

      return {
        paymentAttempt: {
          id: voidResult.attempt.id,
          status: 'voided',
          voidReason:
            typeof voidResult.attempt.metadata?.voidReason === 'string'
              ? voidResult.attempt.metadata.voidReason
              : voidReason,
          voidedAt: voidedAtFromMetadata,
          version: voidResult.attempt.version,
        },
        installment: {
          id: installmentUpdate.installment.id,
          status: mapInstallmentStatusForResponse(installmentProps.status),
          paidAt: installmentUpdate.installment.paidAt,
          version: installmentUpdate.installment.version,
        },
      };
    });
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
