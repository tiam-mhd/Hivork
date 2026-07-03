import { jalaliInputToIso, parseJalaliDateToIso, toWesternDigits } from '@hivork/i18n';
import {
  Check,
  CheckTransitionError,
  CheckType,
  compareTehranDates,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { IInstallmentRepository } from '../ports/installment.repository.port.js';
import type { IPaymentAttemptRepository } from '../ports/payment-attempt.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import type { SaleRecord } from '../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from '../installments/sales/sale-data-scope.js';
import { mapCheckToRegisterResponse } from './check.mapper.js';

export type RegisterReceivedCheckInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  checkNumber: string;
  bankName: string;
  amountRial: bigint;
  dueDate: string;
  drawerName: string;
  bankBranchCode?: string;
  sayadId?: string;
  installmentId?: string;
  paymentAttemptId?: string;
  note?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RegisterReceivedCheckResult = ReturnType<typeof mapCheckToRegisterResponse>;

function parseJalaliDueDate(value: string): Date | null {
  const normalized = toWesternDigits(value).trim();
  const dashMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(normalized);
  const iso = dashMatch
    ? jalaliInputToIso(Number(dashMatch[1]), Number(dashMatch[2]), Number(dashMatch[3]))
    : parseJalaliDateToIso(normalized);

  if (!iso) {
    return null;
  }

  return new Date(`${iso}T00:00:00.000Z`);
}

function resolveCheckRegistrationSettings(settings: Record<string, unknown>) {
  return {
    allowPastDueDate:
      settings.check_allow_past_due_date === true ||
      settings.check_allow_past_due_date === 'true',
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export class RegisterReceivedCheckUseCase
  implements UseCase<RegisterReceivedCheckInput, RegisterReceivedCheckResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly installments: IInstallmentRepository,
    private readonly paymentAttempts: IPaymentAttemptRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RegisterReceivedCheckInput): Promise<RegisterReceivedCheckResult> {
    const dueDate = parseJalaliDueDate(input.dueDate);
    if (!dueDate) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid Jalali due date in request.', 400);
    }

    await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

    const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments');
    const checkSettings = resolveCheckRegistrationSettings(settings);

    if (
      !checkSettings.allowPastDueDate &&
      compareTehranDates(dueDate, new Date()) < 0
    ) {
      throw new ApplicationError(
        'DUE_DATE_INVALID',
        'Check due date cannot be in the past.',
        400,
      );
    }

    const bankName = input.bankName.trim();
    const checkNumber = input.checkNumber.trim();

    const duplicate = await this.checks.findActiveByCheckNumber(
      input.tenantId,
      bankName,
      checkNumber,
    );
    if (duplicate) {
      throw new ApplicationError(
        'CHECK_NUMBER_DUPLICATE',
        'A check with the same number and bank already exists.',
        409,
      );
    }

    let installmentId = input.installmentId;
    let saleId: string | undefined;
    let paymentAttemptId = input.paymentAttemptId;
    let checkId: string | undefined;
    let bankBranchCode = input.bankBranchCode;
    let sayadId = input.sayadId;
    let drawerName = input.drawerName;
    let amountRial = input.amountRial;
    let dueDateInput = input.dueDate;
    let note = input.note;

    if (paymentAttemptId) {
      const attempt = await this.paymentAttempts.findById(input.tenantId, paymentAttemptId);
      if (!attempt) {
        throw new ApplicationError(
          'PAYMENT_ATTEMPT_NOT_FOUND',
          'Payment attempt was not found.',
          404,
        );
      }

      const metadata = attempt.metadata ?? {};
      if (metadata.method !== 'check') {
        throw new ApplicationError(
          'PAYMENT_METHOD_MISMATCH',
          'Payment attempt is not a check payment.',
          400,
        );
      }

      if (metadata.registeredCheckId) {
        throw new ApplicationError(
          'CHECK_ALREADY_REGISTERED',
          'Payment attempt is already linked to a registered check.',
          409,
        );
      }

      if (installmentId && installmentId !== attempt.installmentId) {
        throw new ApplicationError(
          'INSTALLMENT_MISMATCH',
          'installmentId does not match the linked payment attempt.',
          400,
        );
      }

      installmentId = attempt.installmentId;
      checkId = asString(metadata.checkId);
      bankBranchCode = bankBranchCode ?? asString(metadata.branchCode);
      sayadId = sayadId ?? asString(metadata.sayadId);
      drawerName = drawerName || asString(metadata.drawerName) || drawerName;
      dueDateInput = dueDateInput || asString(metadata.dueDate) || dueDateInput;

      const metadataCheckNumber = asString(metadata.checkNumber);
      const metadataBankName = asString(metadata.bankName);
      if (metadataCheckNumber && metadataCheckNumber !== checkNumber) {
        throw new ApplicationError(
          'CHECK_DETAILS_MISMATCH',
          'checkNumber does not match the linked payment attempt.',
          400,
        );
      }
      if (metadataBankName && metadataBankName !== bankName) {
        throw new ApplicationError(
          'CHECK_DETAILS_MISMATCH',
          'bankName does not match the linked payment attempt.',
          400,
        );
      }

      if (attempt.amountRial !== amountRial) {
        throw new ApplicationError(
          'CHECK_DETAILS_MISMATCH',
          'amountRial does not match the linked payment attempt.',
          400,
        );
      }

      note = note ?? attempt.note ?? undefined;
    }

    if (installmentId) {
      const loaded = await this.installments.findByIdWithSale(
        input.tenantId,
        installmentId,
      );

      if (!loaded) {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      const { sale } = loaded;

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

      saleId = sale.id;
    }

    const parsedDueDate = parseJalaliDueDate(dueDateInput);
    if (!parsedDueDate) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid Jalali due date in request.', 400);
    }

    let checkEntity: Check;
    try {
      checkEntity = Check.register({
        id: checkId,
        tenantId: input.tenantId,
        branchId: input.branchId,
        checkType: CheckType.RECEIVED,
        checkNumber,
        bankName,
        amountRial,
        dueDate: parsedDueDate,
        drawerName,
        bankBranchCode,
        sayadId,
        paymentAttemptId: paymentAttemptId ?? null,
        installmentId: installmentId ?? null,
        saleId: saleId ?? null,
        createdById: input.staffId,
      });
    } catch (error) {
      if (error instanceof CheckTransitionError) {
        throw mapDomainError(error);
      }
      throw error;
    }

    return this.unitOfWork.transaction(async (tx) => {
      const duplicateInTx = await this.checks.findActiveByCheckNumber(
        input.tenantId,
        bankName,
        checkNumber,
        tx,
      );
      if (duplicateInTx) {
        throw new ApplicationError(
          'CHECK_NUMBER_DUPLICATE',
          'A check with the same number and bank already exists.',
          409,
        );
      }

      const created = await this.checks.create(
        {
          id: checkEntity.id,
          tenantId: input.tenantId,
          branchId: input.branchId,
          checkType: 'RECEIVED',
          status: 'REGISTERED',
          checkNumber,
          bankName,
          bankBranchCode: bankBranchCode ?? null,
          amountRial,
          dueDate: parsedDueDate,
          drawerName,
          sayadId: sayadId ?? null,
          paymentAttemptId: paymentAttemptId ?? null,
          installmentId: installmentId ?? null,
          saleId: saleId ?? null,
          trackingNotes: note ?? null,
          createdById: input.staffId,
          metadata: {
            source: paymentAttemptId ? 'payment_attempt' : 'standalone',
          },
        },
        tx,
      );

      if (paymentAttemptId) {
        await this.paymentAttempts.updateMetadata(
          {
            tenantId: input.tenantId,
            id: paymentAttemptId,
            metadataPatch: {
              checkPendingRegistration: false,
              registeredCheckId: created.id,
            },
            updatedById: input.staffId,
          },
          tx,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'check.register',
          entityType: 'check',
          entityId: created.id,
          newValue: {
            checkType: 'received',
            status: 'registered',
            checkNumber,
            bankName,
            amountRial: amountRial.toString(),
            dueDate: parsedDueDate.toISOString(),
            installmentId: installmentId ?? null,
            paymentAttemptId: paymentAttemptId ?? null,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return mapCheckToRegisterResponse(created);
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
