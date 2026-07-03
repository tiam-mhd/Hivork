import type { RefundPaymentResponseDto } from '@hivork/contracts/payments';
import {
  Installment,
  InstallmentStatus,
  PaymentLedgerEntry,
  PaymentLedgerService,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IInstallmentRepository, InstallmentRecord } from '../ports/installment.repository.port.js';
import type { IPaymentAttemptRepository } from '../ports/payment-attempt.repository.port.js';
import type { IPaymentGatewayRegistry } from '../ports/payment-gateway.port.js';
import type { IPaymentLedgerRepository } from '../ports/payment-ledger.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { SaleRecord } from '../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../installments/sales/sale-data-scope.js';
import { mapRecordToLedgerEntity } from './ledger-entry.mapper.js';

export type RefundPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  ledgerEntryId: string;
  refundAmountRial: bigint;
  reason: string;
  idempotencyKey?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RefundPaymentResult = RefundPaymentResponseDto & {
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

function mapRefundEntryResponse(entry: {
  id: string;
  amountRial: bigint;
}): RefundPaymentResponseDto['refundEntry'] {
  return {
    id: entry.id,
    entryType: 'refund',
    direction: 'debit',
    amountRial: entry.amountRial.toString(),
    status: 'posted',
  };
}

function assertIdempotentRefundMatch(
  existing: { reversesEntryId: string | null; amountRial: bigint },
  input: { ledgerEntryId: string; refundAmountRial: bigint },
): boolean {
  return (
    existing.reversesEntryId === input.ledgerEntryId &&
    existing.amountRial === input.refundAmountRial
  );
}

export class RefundPaymentUseCase implements UseCase<RefundPaymentInput, RefundPaymentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly ledger: IPaymentLedgerRepository,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly gateways: IPaymentGatewayRegistry,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new ApplicationError('VALIDATION_ERROR', 'Refund reason is required.', 400);
    }

    if (input.idempotencyKey) {
      const existing = await this.ledger.findRefundByIdempotencyKey(
        input.tenantId,
        input.idempotencyKey,
      );

      if (existing) {
        if (
          !assertIdempotentRefundMatch(existing, {
            ledgerEntryId: input.ledgerEntryId,
            refundAmountRial: input.refundAmountRial,
          })
        ) {
          throw new ApplicationError(
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key was already used with a different request body.',
            409,
          );
        }

        return {
          refundEntry: mapRefundEntryResponse(existing),
          idempotentReplay: true,
        };
      }
    }

    const sourceEntry = await this.ledger.findById(input.tenantId, input.ledgerEntryId);
    if (!sourceEntry) {
      throw new ApplicationError('LEDGER_ENTRY_NOT_FOUND', 'Ledger entry was not found.', 404);
    }

    if (sourceEntry.status === 'VOIDED') {
      throw new ApplicationError(
        'LEDGER_ENTRY_VOIDED',
        'Voided ledger entries cannot be refunded.',
        409,
      );
    }

    if (sourceEntry.entryType !== 'PAYMENT_IN' || sourceEntry.status !== 'POSTED') {
      throw new ApplicationError(
        'LEDGER_ENTRY_NOT_REFUNDABLE',
        'Only posted payment-in entries can be refunded.',
        409,
      );
    }

    await this.assertBranchAccess(input.tenantId, sourceEntry.branchId, input.staffContext);
    await this.assertEntryInScope(input, sourceEntry);

    const priorRefunds = await this.ledger.sumPostedRefundsForEntry(
      input.tenantId,
      sourceEntry.id,
    );
    const remainingRefundable = sourceEntry.amountRial - priorRefunds;

    if (input.refundAmountRial > remainingRefundable) {
      throw new ApplicationError(
        'REFUND_AMOUNT_EXCEEDS',
        'Refund amount exceeds the remaining refundable balance.',
        400,
        {
          originalAmountRial: sourceEntry.amountRial.toString(),
          priorRefundsRial: priorRefunds.toString(),
          remainingRefundableRial: remainingRefundable.toString(),
        },
      );
    }

    let paymentAttemptMetadata: Record<string, unknown> | null = null;
    if (sourceEntry.paymentAttemptId) {
      const attempt = await this.paymentAttempts.findById(
        input.tenantId,
        sourceEntry.paymentAttemptId,
      );
      paymentAttemptMetadata = attempt?.metadata ?? null;
    }

    assertNotSettlementLocked({
      settlementBatchId: sourceEntry.settlementBatchId,
      paymentAttemptMetadata,
    });

    let gatewayRefundId: string | undefined;
    if (sourceEntry.paymentMethod === 'online' && sourceEntry.paymentAttemptId) {
      gatewayRefundId = await this.refundViaGateway({
        tenantId: input.tenantId,
        paymentAttemptId: sourceEntry.paymentAttemptId,
        ledgerEntryId: sourceEntry.id,
        amountRial: input.refundAmountRial,
        reason,
        paymentAttemptMetadata,
      });
    }

    const occurredAt = new Date();
    let refundEntryEntity: PaymentLedgerEntry;

    try {
      refundEntryEntity = ledgerService.postRefundAgainstPaymentIn(
        mapRecordToLedgerEntity(sourceEntry),
        {
          amountRial: input.refundAmountRial,
          occurredAt,
          description: reason,
          createdById: input.staffId,
          metadata: {
            ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
            ...(gatewayRefundId ? { gatewayRefundId } : {}),
            refundMethod: 'original',
          },
        },
      );
    } catch (error) {
      throw mapDomainError(error);
    }

    const refundProps = refundEntryEntity.toProps();

    await this.unitOfWork.transaction(async (tx) => {
      await this.ledger.create(
        {
          id: refundProps.id,
          tenantId: refundProps.tenantId,
          branchId: refundProps.branchId,
          entryType: refundProps.entryType,
          direction: refundProps.direction,
          amountRial: refundProps.amountRial,
          status: refundProps.status,
          occurredAt: refundProps.occurredAt,
          recordedAt: refundProps.recordedAt,
          paymentMethod: refundProps.paymentMethod,
          description: refundProps.description,
          paymentAttemptId: refundProps.paymentAttemptId,
          installmentId: refundProps.installmentId,
          saleId: refundProps.saleId,
          settlementBatchId: refundProps.settlementBatchId,
          reversesEntryId: refundProps.reversesEntryId,
          metadata: refundProps.metadata,
          createdById: input.staffId,
        },
        tx,
      );

      if (sourceEntry.installmentId) {
        await this.revertInstallmentAfterRefund(
          {
            tenantId: input.tenantId,
            staffId: input.staffId,
            installmentId: sourceEntry.installmentId,
            refundAmountRial: input.refundAmountRial,
            isFeePayment: isFeePayment(sourceEntry.paymentMethod),
            voidedAt: occurredAt,
          },
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'payment.refund',
          entityType: 'PaymentLedgerEntry',
          entityId: refundProps.id,
          oldValue: {
            sourceLedgerEntryId: sourceEntry.id,
            priorRefundsRial: priorRefunds.toString(),
          },
          newValue: {
            refundEntryId: refundProps.id,
            refundAmountRial: input.refundAmountRial.toString(),
            reason,
            gatewayRefundId: gatewayRefundId ?? null,
          },
          metadata: {
            reversesEntryId: sourceEntry.id,
            installmentId: sourceEntry.installmentId,
            paymentAttemptId: sourceEntry.paymentAttemptId,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );
    });

    return {
      refundEntry: mapRefundEntryResponse({
        id: refundProps.id,
        amountRial: refundProps.amountRial,
      }),
      ...(gatewayRefundId ? { gatewayRefundId } : {}),
      idempotentReplay: false,
    };
  }

  private async refundViaGateway(input: {
    tenantId: string;
    paymentAttemptId: string;
    ledgerEntryId: string;
    amountRial: bigint;
    reason: string;
    paymentAttemptMetadata: Record<string, unknown> | null;
  }): Promise<string> {
    const provider =
      typeof input.paymentAttemptMetadata?.gateway === 'string'
        ? input.paymentAttemptMetadata.gateway
        : 'mock';

    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new ApplicationError(
        'GATEWAY_REFUND_FAILED',
        'Payment gateway is not available for refund.',
        502,
      );
    }

    try {
      const result = await gateway.refundPayment({
        tenantId: input.tenantId,
        paymentAttemptId: input.paymentAttemptId,
        ledgerEntryId: input.ledgerEntryId,
        amountRial: input.amountRial,
        reason: input.reason,
      });

      return result.gatewayRefundId;
    } catch {
      throw new ApplicationError(
        'GATEWAY_REFUND_FAILED',
        'Payment gateway refund failed.',
        502,
      );
    }
  }

  private async revertInstallmentAfterRefund(
    input: {
      tenantId: string;
      staffId: string;
      installmentId: string;
      refundAmountRial: bigint;
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
      throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
    }

    const installmentEntity = installmentRecordToEntity(loaded.installment);

    try {
      installmentEntity.revertPayment({
        amountRial: input.refundAmountRial,
        isFeePayment: input.isFeePayment,
        voidedAt: input.voidedAt,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const installmentProps = installmentEntity.toProps();
    const updateResult = await this.installments.applyPaymentConfirm(
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

    if (updateResult.outcome === 'not_found') {
      throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
    }

    if (updateResult.outcome === 'version_conflict') {
      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Installment version conflict.',
        409,
        { currentVersion: updateResult.currentVersion },
      );
    }
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
    input: RefundPaymentInput,
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

      if (
        !isSaleInScope(loaded.sale as SaleRecord, input.staffId, input.staffContext)
      ) {
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
