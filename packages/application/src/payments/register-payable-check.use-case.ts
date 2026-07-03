import { jalaliInputToIso, parseJalaliDateToIso, toWesternDigits } from '@hivork/i18n';
import {
  Check,
  CheckTransitionError,
  compareTehranDates,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapCheckToRegisterResponse } from './check.mapper.js';

export type RegisterPayableCheckInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  checkNumber: string;
  bankName: string;
  amountRial: bigint;
  dueDate: string;
  payeeName: string;
  bankBranchCode?: string;
  sayadId?: string;
  note?: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type RegisterPayableCheckResult = ReturnType<typeof mapCheckToRegisterResponse>;

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

export class RegisterPayableCheckUseCase
  implements UseCase<RegisterPayableCheckInput, RegisterPayableCheckResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RegisterPayableCheckInput): Promise<RegisterPayableCheckResult> {
    const dueDate = parseJalaliDueDate(input.dueDate);
    if (!dueDate) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid Jalali due date in request.', 400);
    }

    await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

    const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments');
    const checkSettings = resolveCheckRegistrationSettings(settings);

    if (!checkSettings.allowPastDueDate && compareTehranDates(dueDate, new Date()) < 0) {
      throw new ApplicationError(
        'DUE_DATE_INVALID',
        'Check due date cannot be in the past.',
        400,
      );
    }

    const bankName = input.bankName.trim();
    const checkNumber = input.checkNumber.trim();
    const payeeName = input.payeeName.trim();

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

    let checkEntity: Check;
    try {
      checkEntity = Check.registerPayable({
        tenantId: input.tenantId,
        branchId: input.branchId,
        checkNumber,
        bankName,
        amountRial: input.amountRial,
        dueDate,
        payeeName,
        bankBranchCode: input.bankBranchCode,
        sayadId: input.sayadId,
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
          checkType: 'PAYABLE',
          status: 'REGISTERED',
          checkNumber,
          bankName,
          bankBranchCode: input.bankBranchCode ?? null,
          amountRial: input.amountRial,
          dueDate,
          drawerName: payeeName,
          payeeName,
          sayadId: input.sayadId ?? null,
          trackingNotes: input.note ?? null,
          createdById: input.staffId,
          metadata: { source: 'standalone' },
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'check.register.payable',
          entityType: 'check',
          entityId: created.id,
          newValue: {
            checkType: 'payable',
            status: 'registered',
            checkNumber,
            bankName,
            payeeName,
            amountRial: input.amountRial.toString(),
            dueDate: dueDate.toISOString(),
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
