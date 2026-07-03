import {
  DomainError,
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentAttemptDomainErrorCode,
  PaymentRejectedEvent,
  ReportedByType,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
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

export type RejectPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  paymentAttemptId: string;
  rejectedReason: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RejectPaymentResult = {
  paymentAttempt: {
    id: string;
    status: 'rejected';
    rejectedReason: string;
    rejectedAt: Date;
    version: number;
  };
};

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

function mapRejectPaymentError(error: unknown): ApplicationError {
  if (error instanceof DomainError) {
    if (error.code === PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED) {
      return new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED,
        'Payment attempt is already confirmed.',
        409,
      );
    }

    if (error.code === PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED) {
      return new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED,
        'Payment attempt is already rejected.',
        409,
      );
    }

    return mapDomainError(error);
  }

  throw error;
}

export class RejectPaymentUseCase implements UseCase<RejectPaymentInput, RejectPaymentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: RejectPaymentInput): Promise<RejectPaymentResult> {
    const rejectedReason = input.rejectedReason.trim();

    const attempt = await this.paymentAttempts.findById(input.tenantId, input.paymentAttemptId);
    if (!attempt) {
      throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
    }

    if (attempt.status === 'CONFIRMED') {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED,
        'Payment attempt is already confirmed.',
        409,
      );
    }

    if (attempt.status === 'REJECTED') {
      throw new ApplicationError(
        PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED,
        'Payment attempt is already rejected.',
        409,
      );
    }

    if (attempt.version !== input.expectedVersion) {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Payment attempt version conflict.',
        409,
        { currentVersion: attempt.version },
      );
    }

    return this.unitOfWork.transaction(async (tx) => {
      await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

      const loaded = await this.installments.findByIdWithSale(
        input.tenantId,
        attempt.installmentId,
        tx,
      );

      if (!loaded) {
        throw new ApplicationError('PAYMENT_NOT_FOUND', 'Payment attempt was not found.', 404);
      }

      const { installment, sale } = loaded;

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

      const attemptEntity = paymentAttemptRecordToEntity(attempt);
      try {
        attemptEntity.reject(input.staffId, rejectedReason);
      } catch (error) {
        throw mapRejectPaymentError(error);
      }

      const rejectResult = await this.paymentAttempts.reject(
        {
          tenantId: input.tenantId,
          id: attempt.id,
          expectedVersion: input.expectedVersion,
          rejectedReason,
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
          rejectResult.status === 'CONFIRMED'
            ? 'Payment attempt is already confirmed.'
            : 'Payment attempt is already rejected.',
          409,
        );
      }

      if (rejectResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Payment attempt version conflict.',
          409,
          { currentVersion: rejectResult.currentVersion },
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'payment.reject',
          entityType: 'payment_attempt',
          entityId: rejectResult.attempt.id,
          newValue: {
            installmentId: installment.id,
            amountRial: attempt.amountRial.toString(),
            method: attempt.metadata?.method ?? 'cash',
            rejectedReason,
            status: 'rejected',
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new PaymentRejectedEvent(rejectResult.attempt.id, {
          tenantId: input.tenantId,
          tenantCustomerId: sale.tenantCustomerId,
          installmentId: installment.id,
          paymentAttemptId: rejectResult.attempt.id,
          rejectedReason,
        }),
        { tenantId: input.tenantId, aggregateType: 'payment_attempt' },
        tx,
      );

      return {
        paymentAttempt: {
          id: rejectResult.attempt.id,
          status: 'rejected',
          rejectedReason: rejectResult.attempt.rejectedReason ?? rejectedReason,
          rejectedAt: rejectResult.attempt.rejectedAt ?? new Date(),
          version: rejectResult.attempt.version,
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
