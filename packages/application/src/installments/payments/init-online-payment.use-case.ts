import { PartialPaymentSchema } from '@hivork/contracts/installments';
import {
  DomainError,
  InstallmentDomainErrorCode,
  InstallmentStatus,
  PaymentAttempt,
  ReportedByType,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IPaymentGatewayRegistry } from '../../ports/payment-gateway.port.js';
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
  assertIdempotentOnlineInitMatch,
  buildOnlinePaymentMetadata,
  computeRemainingAmountRial,
  isOnlinePaymentSessionExpired,
  resolvePaymentRecordingSettings,
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

export type InitOnlinePaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  amountRial: bigint;
  returnUrl: string;
  gatewayProvider?: string;
  idempotencyKey?: string;
  staffContext: DataScopeStaffContext;
};

export type InitOnlinePaymentResult = {
  paymentAttemptId: string;
  redirectUrl: string;
  gatewayToken: string;
  expiresAt: Date;
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

function mapInitResponse(record: {
  id: string;
  metadata: Record<string, unknown> | null;
}): InitOnlinePaymentResult {
  const metadata = record.metadata ?? {};

  return {
    paymentAttemptId: record.id,
    redirectUrl: String(metadata.redirectUrl ?? ''),
    gatewayToken: String(metadata.gatewayToken ?? ''),
    expiresAt: new Date(String(metadata.expiresAt ?? Date.now())),
    idempotentReplay: true,
  };
}

export class InitOnlinePaymentUseCase implements UseCase<InitOnlinePaymentInput, InitOnlinePaymentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly gateways: IPaymentGatewayRegistry,
  ) {}

  async execute(input: InitOnlinePaymentInput): Promise<InitOnlinePaymentResult> {
    const gatewayProvider = input.gatewayProvider ?? 'mock';
    const gateway = this.gateways.get(gatewayProvider);

    if (!gateway) {
      throw new ApplicationError(
        'GATEWAY_UNAVAILABLE',
        'Payment gateway is not configured.',
        502,
      );
    }

    if (input.idempotencyKey) {
      const existing = await this.paymentAttempts.findByIdempotencyKey(
        input.tenantId,
        input.idempotencyKey,
      );

      if (existing) {
        if (
          !assertIdempotentOnlineInitMatch(existing, {
            installmentId: input.installmentId,
            amountRial: input.amountRial,
            returnUrl: input.returnUrl,
          })
        ) {
          throw new ApplicationError(
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key was already used with a different request body.',
            409,
          );
        }

        if (isOnlinePaymentSessionExpired(existing.metadata)) {
          throw new ApplicationError(
            'PAYMENT_SESSION_EXPIRED',
            'Online payment session has expired. Start a new payment.',
            410,
          );
        }

        return mapInitResponse(existing);
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

      if (input.idempotencyKey) {
        const existing = await this.paymentAttempts.findByIdempotencyKey(
          input.tenantId,
          input.idempotencyKey,
          tx,
        );

        if (existing) {
          if (
            !assertIdempotentOnlineInitMatch(existing, {
              installmentId: input.installmentId,
              amountRial: input.amountRial,
              returnUrl: input.returnUrl,
            })
          ) {
            throw new ApplicationError(
              'IDEMPOTENCY_CONFLICT',
              'Idempotency key was already used with a different request body.',
              409,
            );
          }

          if (isOnlinePaymentSessionExpired(existing.metadata)) {
            throw new ApplicationError(
              'PAYMENT_SESSION_EXPIRED',
              'Online payment session has expired. Start a new payment.',
              410,
            );
          }

          return mapInitResponse(existing);
        }
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
            idempotencyKey: input.idempotencyKey,
          },
          toDomainInstallmentStatus(installment.status),
        );
      } catch (error) {
        throw mapInstallmentReportError(error);
      }

      let gatewayResult;
      try {
        gatewayResult = await gateway.createPayment({
          tenantId: input.tenantId,
          paymentAttemptId: attemptEntity.id,
          installmentId: input.installmentId,
          amountRial: input.amountRial,
          returnUrl: input.returnUrl,
        });
      } catch {
        throw new ApplicationError(
          'GATEWAY_UNAVAILABLE',
          'Payment gateway is temporarily unavailable.',
          502,
        );
      }

      const metadata = buildOnlinePaymentMetadata({
        referenceId: attemptEntity.id,
        gateway: gateway.provider,
        gatewayToken: gatewayResult.gatewayToken,
        redirectUrl: gatewayResult.redirectUrl,
        expiresAt: gatewayResult.expiresAt,
        returnUrl: input.returnUrl,
      });

      await this.paymentAttempts.create(
        {
          id: attemptEntity.id,
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          reportedByType: 'STAFF',
          reportedById: input.staffId,
          amountRial: input.amountRial,
          note: attemptEntity.note,
          idempotencyKey: input.idempotencyKey ?? null,
          createdById: input.staffId,
          metadata,
        },
        tx,
      );

      return {
        paymentAttemptId: attemptEntity.id,
        redirectUrl: gatewayResult.redirectUrl,
        gatewayToken: gatewayResult.gatewayToken,
        expiresAt: gatewayResult.expiresAt,
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
