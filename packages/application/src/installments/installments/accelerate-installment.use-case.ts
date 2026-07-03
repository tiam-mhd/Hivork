import {
  InstallmentOperationErrorCode,
  InstallmentOperationsService,
  InstallmentStatus,
  ReschedulePolicy,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentOperationLogRepository } from '../../ports/installment-operation-log.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ITenantSettingsRepository } from '../../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import { parseDateOnlyUtc } from '../sales/contract-version-snapshot.helper.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import {
  installmentRecordToOperationSnapshot,
  serializeOperationSnapshots,
} from '../installment-operation-snapshot.helper.js';

export type AccelerateInstallmentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  newDueDate: string;
  reason?: string;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type AccelerateInstallmentResult = {
  installment: {
    id: string;
    dueDate: Date;
    status: string;
    version: number;
  };
  operationLogId: string;
  previousDueDate: Date;
};

function mapValidationError(code: string): ApplicationError {
  switch (code) {
    case InstallmentOperationErrorCode.ACCELERATE_DATE_INVALID:
      return new ApplicationError(
        'DUE_DATE_INVALID',
        'New due date cannot be after the current due date.',
        400,
      );
    case InstallmentOperationErrorCode.DUE_DATE_IN_PAST:
      return new ApplicationError(
        'DUE_DATE_TOO_OLD',
        'New due date is too far in the past.',
        400,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED,
        'Waived installments cannot be accelerated.',
        409,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
        'Only pending or overdue installments can be accelerated.',
        409,
      );
    default:
      return new ApplicationError(code, 'Installment accelerate is not allowed.', 409);
  }
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

function mapDomainStatusToPrisma(status: InstallmentStatus): 'PENDING' | 'OVERDUE' {
  return status === InstallmentStatus.OVERDUE ? 'OVERDUE' : 'PENDING';
}

export class AccelerateInstallmentUseCase
  implements UseCase<AccelerateInstallmentInput, AccelerateInstallmentResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: AccelerateInstallmentInput): Promise<AccelerateInstallmentResult> {
    const newDueDate = parseDateOnlyUtc(input.newDueDate);
    const trimmedReason = input.reason?.trim();

    if (trimmedReason !== undefined && trimmedReason.length > 0 && trimmedReason.length < 3) {
      throw new ApplicationError(
        'FIELD_REQUIRED',
        'Accelerate reason must be at least 3 characters.',
        400,
      );
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

      if (installment.version !== input.expectedVersion) {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);
      const policy = ReschedulePolicy.fromSettings({
        allow_past_reschedule:
          settings.allow_past_reschedule === true || settings.allow_past_reschedule === 'true',
      });

      const previousSnapshot = installmentRecordToOperationSnapshot(installment);
      const validation = InstallmentOperationsService.validateAccelerate({
        installment: previousSnapshot,
        newDueDate,
        policy,
      });

      if (!validation.ok) {
        throw mapValidationError(validation.error);
      }

      const resolvedStatus = InstallmentOperationsService.resolveAccelerateStatus(
        previousSnapshot.status,
        newDueDate,
      );
      const prismaStatus = mapDomainStatusToPrisma(resolvedStatus);

      const updateResult = await this.installments.rescheduleDueDate(
        {
          tenantId: input.tenantId,
          installmentId: input.installmentId,
          newDueDate,
          expectedVersion: input.expectedVersion,
          updatedById: input.staffId,
          status: prismaStatus,
        },
        tx,
      );

      if (updateResult.outcome === 'not_found') {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment was not found.', 404);
      }

      if (updateResult.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Installment was updated by another user. Refresh and try again.',
          409,
        );
      }

      const updated = updateResult.installment;
      const newSnapshot = installmentRecordToOperationSnapshot(updated);

      const operationLog = await this.operationLogs.append(
        {
          tenantId: input.tenantId,
          saleId: sale.id,
          operationType: 'accelerate',
          installmentIds: [updated.id],
          previousSnapshot: serializeOperationSnapshots([previousSnapshot]),
          newSnapshot: serializeOperationSnapshots([newSnapshot]),
          reason: trimmedReason || undefined,
          performedById: input.staffId,
          createdById: input.staffId,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'installment.accelerate',
          entityType: 'installment',
          entityId: updated.id,
          oldValue: {
            dueDate: previousSnapshot.dueDate.toISOString(),
            status: installment.status,
            version: installment.version,
          },
          newValue: {
            dueDate: newSnapshot.dueDate.toISOString(),
            status: updated.status,
            version: updated.version,
            reason: trimmedReason ?? null,
            operationLogId: operationLog.id,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        installment: {
          id: updated.id,
          dueDate: updated.dueDate,
          status: updated.status,
          version: updated.version,
        },
        operationLogId: operationLog.id,
        previousDueDate: installment.dueDate,
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
