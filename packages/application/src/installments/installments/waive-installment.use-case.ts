import {
  DomainError,
  Installment,
  InstallmentDomainErrorCode,
  InstallmentStatus,
  InstallmentWaivedEvent,
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentRejectedEvent,
  PaymentAttemptDomainErrorCode,
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
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';

export type WaiveInstallmentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  waiveReason: string;
  expectedVersion: number;
  rejectPendingPayments: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type WaiveInstallmentResult = {
  installment: {
    id: string;
    status: 'waived';
    waiveReason: string;
    waivedByStaffId: string;
    version: number;
  };
  rejectedPaymentAttemptIds: string[];
  remainingRial: string;
};

function installmentRecordToEntity(record: InstallmentRecord): Installment {
  return Installment.reconstitute({
    id: record.id,
    saleId: record.saleId,
    tenantId: record.tenantId,
    sequenceNumber: record.sequenceNumber,
    dueDate: record.dueDate,
    amountRial: record.amountRial,
    status:
      record.status === 'OVERDUE'
        ? InstallmentStatus.OVERDUE
        : record.status === 'PAID'
          ? InstallmentStatus.PAID
          : record.status === 'WAIVED'
            ? InstallmentStatus.WAIVED
            : InstallmentStatus.PENDING,
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

function mapWaiveDomainError(error: unknown): ApplicationError {
  if (error instanceof DomainError) {
    if (error.code === InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID) {
      return new ApplicationError(
        InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID,
        'Installment is already paid and cannot be waived.',
        409,
      );
    }

    if (error.code === InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED) {
      return new ApplicationError(
        InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED,
        'Installment is already waived.',
        409,
      );
    }

    return mapDomainError(error);
  }

  throw error;
}

function assertSaleActive(status: string, archivedAt: Date | null): void {
  if (status !== 'ACTIVE' || archivedAt) {
    throw new ApplicationError(
      'SALE_NOT_ACTIVE',
      'Sale is not active for installment operations.',
      409,
    );
  }
}

export class WaiveInstallmentUseCase implements UseCase<WaiveInstallmentInput, WaiveInstallmentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: WaiveInstallmentInput): Promise<WaiveInstallmentResult> {
    const waiveReason = input.waiveReason.trim();

    return this.unitOfWork.transaction(async (tx) => {
      await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

      const loaded = await this.installments.findByIdWithSale(
        input.tenantId,
        input.installmentId,
        tx,
      );

      if (!loaded) {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      const { installment: installmentRecord, sale } = loaded;

      if (!isSaleInScope(sale as SaleRecord, input.staffId, input.staffContext)) {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      if (sale.branchId !== input.branchId) {
        throw new ApplicationError(
          'BRANCH_ACCESS_DENIED',
          'Branch is not in scope for this installment.',
          403,
        );
      }

      assertSaleActive(sale.status, sale.archivedAt);

      if (installmentRecord.version !== input.expectedVersion) {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      const pendingAttempts = await this.paymentAttempts.listPendingByInstallmentId(
        input.tenantId,
        input.installmentId,
        tx,
      );

      if (pendingAttempts.length > 0 && !input.rejectPendingPayments) {
        throw new ApplicationError(
          'PENDING_PAYMENTS_EXIST',
          'Installment has pending payment attempts. Enable rejectPendingPayments or resolve them first.',
          409,
        );
      }

      const installmentEntity = installmentRecordToEntity(installmentRecord);
      try {
        installmentEntity.waive(input.staffId, waiveReason);
      } catch (error) {
        throw mapWaiveDomainError(error);
      }

      const rejectedPaymentAttemptIds: string[] = [];
      const autoRejectReason = `بخشودگی قسط — ${waiveReason}`;

      for (const attemptRecord of pendingAttempts) {
        const attemptEntity = paymentAttemptRecordToEntity(attemptRecord);
        try {
          attemptEntity.reject(input.staffId, autoRejectReason);
        } catch (error) {
          throw mapDomainError(error);
        }

        const rejectResult = await this.paymentAttempts.reject(
          {
            tenantId: input.tenantId,
            id: attemptRecord.id,
            expectedVersion: attemptRecord.version,
            rejectedReason: autoRejectReason,
            updatedById: input.staffId,
          },
          tx,
        );

        if (rejectResult.outcome === 'not_found') {
          throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
        }

        if (rejectResult.outcome === 'status_invalid') {
          throw new ApplicationError(
            rejectResult.status === 'CONFIRMED'
              ? PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED
              : PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED,
            'Pending payment could not be rejected during waive.',
            409,
          );
        }

        if (rejectResult.outcome === 'version_conflict') {
          throw new ApplicationError(
            'VERSION_CONFLICT',
            'Payment attempt version conflict during waive.',
            409,
            { currentVersion: rejectResult.currentVersion },
          );
        }

        rejectedPaymentAttemptIds.push(rejectResult.attempt.id);

        await this.outbox.publish(
          new PaymentRejectedEvent(rejectResult.attempt.id, {
            tenantId: input.tenantId,
            tenantCustomerId: sale.tenantCustomerId,
            installmentId: installmentRecord.id,
            paymentAttemptId: rejectResult.attempt.id,
            rejectedReason: autoRejectReason,
          }),
          { tenantId: input.tenantId, aggregateType: 'payment_attempt' },
          tx,
        );
      }

      const waiveResult = await this.installments.waive(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          expectedVersion: input.expectedVersion,
          waivedByStaffId: input.staffId,
          waiveReason,
          updatedById: input.staffId,
        },
        tx,
      );

      if (waiveResult.outcome === 'not_found') {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      if (waiveResult.outcome === 'status_invalid') {
        throw new ApplicationError(
          waiveResult.status === 'PAID'
            ? InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID
            : InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED,
          waiveResult.status === 'PAID'
            ? 'Installment is already paid and cannot be waived.'
            : 'Installment is already waived.',
          409,
        );
      }

      if (waiveResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      const remainingRial = await this.installments.syncSaleOutstandingRial(
        input.tenantId,
        sale.id,
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'installment.waive',
          entityType: 'installment',
          entityId: waiveResult.installment.id,
          newValue: {
            waiveReason,
            rejectedPaymentAttemptIds,
            remainingRial: remainingRial.toString(),
            version: waiveResult.installment.version,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new InstallmentWaivedEvent(waiveResult.installment.id, {
          tenantId: input.tenantId,
          tenantCustomerId: sale.tenantCustomerId,
          saleId: sale.id,
          installmentId: waiveResult.installment.id,
          waiveReason,
          amountRial: waiveResult.installment.amountRial.toString(),
          remainingRial: remainingRial.toString(),
        }),
        { tenantId: input.tenantId, aggregateType: 'installment' },
        tx,
      );

      return {
        installment: {
          id: waiveResult.installment.id,
          status: 'waived',
          waiveReason,
          waivedByStaffId: input.staffId,
          version: waiveResult.installment.version,
        },
        rejectedPaymentAttemptIds,
        remainingRial: remainingRial.toString(),
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
