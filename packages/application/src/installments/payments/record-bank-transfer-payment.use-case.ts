import { PartialPaymentSchema } from '@hivork/contracts/installments';
import {
  DomainError,
  InstallmentDomainErrorCode,
  InstallmentStatus,
  PaymentAttempt,
  PaymentReportedEvent,
  ReportedByType,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IOutboxPublisher } from '../../ports/outbox.port.js';
import type { IPaymentAttemptRepository } from '../../ports/payment-attempt.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import {
  assertIdempotentBankTransferMatch,
  assertTransferDateNotFuture,
  buildBankTransferMetadata,
  computeRemainingAmountRial,
  hashRecordBankTransferRequest,
  mapPaymentAttemptToDetail,
  resolvePaymentRecordingSettings,
  type PaymentAttemptDetailResult,
} from './record-payment.helper.js';

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

export type RecordBankTransferPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  amountRial: bigint;
  bankName: string;
  referenceNumber: string;
  transferDate: string;
  accountLast4?: string;
  note?: string;
  evidenceFileId?: string | null;
  paidAt?: Date;
  idempotencyKey?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RecordBankTransferPaymentResult = {
  paymentAttempt: PaymentAttemptDetailResult;
  idempotentReplay: boolean;
};

function assertSaleActive(status: string, archivedAt: Date | null): void {
  if (status !== 'ACTIVE' || archivedAt) {
    throw new ApplicationError(
      'SALE_NOT_ACTIVE',
      'Sale is not active for payment recording.',
      409,
    );
  }
}

function mapInstallmentReportError(error: unknown): ApplicationError {
  if (error instanceof DomainError) {
    if (error.code === InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED) {
      return new ApplicationError(
        InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID,
        'Installment is already paid or waived.',
        409,
      );
    }

    return mapDomainError(error);
  }

  throw error;
}

function validatePartialPayment(
  amountRial: bigint,
  remainingAmountRial: bigint,
  allowPartial: boolean,
): void {
  const parsed = PartialPaymentSchema.safeParse({
    amountRial: amountRial.toString(),
    remainingAmountRial: remainingAmountRial.toString(),
    allowPartial,
  });

  if (parsed.success) {
    return;
  }

  const issue = parsed.error.issues[0];
  const code = issue?.message ?? 'VALIDATION_ERROR';
  throw new ApplicationError(code, issue?.message ?? 'Payment amount is invalid.', 400);
}

function validateTransferDate(transferDate: string): void {
  try {
    assertTransferDateNotFuture(transferDate);
  } catch {
    throw new ApplicationError(
      'TRANSFER_DATE_INVALID',
      'Transfer date cannot be in the future.',
      400,
    );
  }
}

export class RecordBankTransferPaymentUseCase
  implements UseCase<RecordBankTransferPaymentInput, RecordBankTransferPaymentResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: RecordBankTransferPaymentInput): Promise<RecordBankTransferPaymentResult> {
    validateTransferDate(input.transferDate);

    const bankName = input.bankName.trim();
    const referenceNumber = input.referenceNumber.trim();

    if (input.idempotencyKey) {
      const existing = await this.paymentAttempts.findByIdempotencyKey(
        input.tenantId,
        input.idempotencyKey,
      );

      if (existing) {
        if (
          !assertIdempotentBankTransferMatch(existing, {
            installmentId: input.installmentId,
            amountRial: input.amountRial,
            bankName,
            referenceNumber,
          })
        ) {
          throw new ApplicationError(
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key was already used with a different request body.',
            409,
          );
        }

        return {
          paymentAttempt: mapPaymentAttemptToDetail(existing),
          idempotentReplay: true,
        };
      }
    }

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

      const { installment, sale } = loaded;

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

      const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);
      const paymentSettings = resolvePaymentRecordingSettings(settings);

      if (input.paidAt && !paymentSettings.allowBackdate) {
        throw new ApplicationError(
          'BACKDATE_NOT_ALLOWED',
          'Backdated payment date is not allowed for this tenant.',
          403,
        );
      }

      if (input.idempotencyKey) {
        const existing = await this.paymentAttempts.findByIdempotencyKey(
          input.tenantId,
          input.idempotencyKey,
          tx,
        );

        if (existing) {
          if (
            !assertIdempotentBankTransferMatch(existing, {
              installmentId: input.installmentId,
              amountRial: input.amountRial,
              bankName,
              referenceNumber,
            })
          ) {
            throw new ApplicationError(
              'IDEMPOTENCY_CONFLICT',
              'Idempotency key was already used with a different request body.',
              409,
            );
          }

          return {
            paymentAttempt: mapPaymentAttemptToDetail(existing),
            idempotentReplay: true,
          };
        }
      }

      const duplicateReference = await this.paymentAttempts.findByBankReference(
        input.tenantId,
        bankName,
        referenceNumber,
        tx,
      );

      if (duplicateReference) {
        if (
          input.idempotencyKey &&
          duplicateReference.idempotencyKey === input.idempotencyKey
        ) {
          return {
            paymentAttempt: mapPaymentAttemptToDetail(duplicateReference),
            idempotentReplay: true,
          };
        }

        throw new ApplicationError(
          'PAYMENT_REFERENCE_DUPLICATE',
          'A payment with the same bank reference already exists.',
          409,
        );
      }

      const allocatedAmountRial = await this.paymentAttempts.sumAllocatedAmountByInstallmentId(
        input.tenantId,
        input.installmentId,
        tx,
      );
      const remainingAmountRial = computeRemainingAmountRial(
        installment.amountRial,
        allocatedAmountRial,
      );

      validatePartialPayment(
        input.amountRial,
        remainingAmountRial,
        paymentSettings.allowPartial,
      );

      let attemptEntity: PaymentAttempt;
      try {
        attemptEntity = PaymentAttempt.report(
          {
            installmentId: input.installmentId,
            tenantId: input.tenantId,
            reportedByType: ReportedByType.STAFF,
            reportedById: input.staffId,
            amountRial: input.amountRial,
            note: input.note,
            evidenceFileId: input.evidenceFileId ?? undefined,
            idempotencyKey: input.idempotencyKey,
          },
          toDomainInstallmentStatus(installment.status),
        );
      } catch (error) {
        throw mapInstallmentReportError(error);
      }

      const requestHash = hashRecordBankTransferRequest({
        installmentId: input.installmentId,
        amountRial: input.amountRial,
        bankName,
        referenceNumber,
        transferDate: input.transferDate,
        accountLast4: input.accountLast4 ?? null,
        note: input.note,
        evidenceFileId: input.evidenceFileId,
        paidAt: input.paidAt ?? null,
      });

      const metadata = buildBankTransferMetadata({
        bankName,
        referenceNumber,
        transferDate: input.transferDate,
        accountLast4: input.accountLast4,
        requestHash,
      });

      if (input.paidAt) {
        metadata.paidAt = input.paidAt.toISOString();
      }

      const created = await this.paymentAttempts.create(
        {
          id: attemptEntity.id,
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          reportedByType: 'STAFF',
          reportedById: input.staffId,
          amountRial: input.amountRial,
          note: attemptEntity.note,
          evidenceFileId: input.evidenceFileId ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          createdById: input.staffId,
          metadata,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'payment.report',
          entityType: 'payment_attempt',
          entityId: created.id,
          newValue: {
            installmentId: input.installmentId,
            amountRial: input.amountRial.toString(),
            method: 'bank_transfer',
            bankName,
            referenceNumber,
            transferDate: input.transferDate,
            status: 'pending',
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new PaymentReportedEvent(created.id, {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          paymentAttemptId: created.id,
          amountRial: input.amountRial.toString(),
          method: 'bank_transfer',
          reportedByType: 'staff',
        }),
        { tenantId: input.tenantId, aggregateType: 'payment_attempt' },
        tx,
      );

      return {
        paymentAttempt: mapPaymentAttemptToDetail(created),
        idempotentReplay: false,
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
