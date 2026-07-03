import { randomUUID } from 'node:crypto';

import {
  InstallmentOperationErrorCode,
  InstallmentOperationsService,
  InstallmentStatus,
  MergeSplitPolicy,
  sumAmountsRial,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { IInstallmentOperationLogRepository } from '../ports/installment-operation-log.repository.port.js';
import type { IInstallmentRepository } from '../ports/installment.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sales/sale-data-scope.js';
import { parseDateOnlyUtc } from './sales/contract-version-snapshot.helper.js';
import {
  installmentRecordToOperationSnapshot,
  serializeOperationSnapshots,
} from './installment-operation-snapshot.helper.js';

export type MergeInstallmentsInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  saleId: string;
  installmentIds: string[];
  targetDueDate: string;
  reason: string;
  expectedVersions: Record<string, number>;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type MergeInstallmentsResult = {
  mergedInstallment: {
    id: string;
    sequenceNumber: number;
    dueDate: Date;
    amountRial: bigint;
    status: string;
  };
  removedInstallmentIds: string[];
  operationLogId: string;
};

function resolveMergeSplitPolicy(settings: Record<string, unknown>): MergeSplitPolicy {
  return MergeSplitPolicy.fromSettings({
    split_min_part_rial:
      typeof settings.split_min_part_rial === 'string' ? settings.split_min_part_rial : undefined,
    rounding_mode:
      typeof settings.rounding_mode === 'string'
        ? (settings.rounding_mode as 'none' | 'floor' | 'ceil' | 'nearest')
        : undefined,
    rounding_unit_rial:
      typeof settings.rounding_unit_rial === 'string' ? settings.rounding_unit_rial : undefined,
  });
}

function mapValidationError(code: string): ApplicationError {
  switch (code) {
    case InstallmentOperationErrorCode.MERGE_MIN_COUNT:
      return new ApplicationError(
        InstallmentOperationErrorCode.MERGE_MIN_COUNT,
        'At least two installments are required to merge.',
        400,
      );
    case InstallmentOperationErrorCode.INSTALLMENTS_SALE_MISMATCH:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENTS_SALE_MISMATCH,
        'All installments must belong to the same sale.',
        400,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED,
        'Waived installments cannot be merged.',
        409,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
        'Only pending or overdue installments can be merged.',
        409,
      );
    case InstallmentOperationErrorCode.AMOUNT_MISMATCH:
      return new ApplicationError(
        InstallmentOperationErrorCode.AMOUNT_MISMATCH,
        'Merged amount does not match the sum of source installments.',
        500,
      );
    default:
      return new ApplicationError(code, 'Installment merge is not allowed.', 409);
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

function resolveMergedStatus(
  sources: Array<{ status: string }>,
  targetDueDate: Date,
): 'PENDING' | 'OVERDUE' {
  const worstSource = sources.some((source) => source.status === 'OVERDUE')
    ? InstallmentStatus.OVERDUE
    : InstallmentStatus.PENDING;
  const resolved = InstallmentOperationsService.resolveAccelerateStatus(
    worstSource,
    targetDueDate,
  );
  return resolved === InstallmentStatus.OVERDUE ? 'OVERDUE' : 'PENDING';
}

export class MergeInstallmentsUseCase implements UseCase<MergeInstallmentsInput, MergeInstallmentsResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: MergeInstallmentsInput): Promise<MergeInstallmentsResult> {
    const trimmedReason = input.reason.trim();
    if (trimmedReason.length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Merge reason is required.', 400);
    }

    const uniqueIds = [...new Set(input.installmentIds)];
    if (uniqueIds.length !== input.installmentIds.length) {
      throw new ApplicationError('VALIDATION_ERROR', 'Duplicate installment ids are not allowed.', 400);
    }

    const targetDueDate = parseDateOnlyUtc(input.targetDueDate);

    return this.unitOfWork.transaction(async (tx) => {
      await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

      const sale = await this.sales.findById(input.tenantId, input.saleId, tx);
      if (!sale || sale.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      if (!isSaleInScope(sale, input.staffId, input.staffContext)) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      if (sale.branchId !== input.branchId) {
        throw new ApplicationError(
          'BRANCH_ACCESS_DENIED',
          'Branch is not in scope for this sale.',
          403,
        );
      }

      assertSaleActive(sale.status, sale.archivedAt);

      const sourceInstallments = await this.installments.findByIdsForSale(
        input.tenantId,
        input.saleId,
        uniqueIds,
        tx,
      );

      if (sourceInstallments.length !== uniqueIds.length) {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'One or more installments were not found.', 404);
      }

      for (const installment of sourceInstallments) {
        const expectedVersion = input.expectedVersions[installment.id];
        if (expectedVersion === undefined) {
          throw new ApplicationError(
            'FIELD_REQUIRED',
            `Expected version is required for installment ${installment.id}.`,
            400,
          );
        }

        if (installment.version !== expectedVersion) {
          throw new ApplicationError(
            'VERSION_CONFLICT',
            'Installment was updated by another user. Refresh and try again.',
            409,
          );
        }
      }

      const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments', tx);
      const policy = resolveMergeSplitPolicy(settings);
      const sourceSnapshots = sourceInstallments.map(installmentRecordToOperationSnapshot);
      const mergedAmountRial = sumAmountsRial(sourceSnapshots.map((item) => item.amountRial));

      const validation = InstallmentOperationsService.validateMerge({
        saleId: input.saleId,
        installments: sourceSnapshots,
        mergedAmountRial,
        policy,
      });

      if (!validation.ok) {
        throw mapValidationError(validation.error);
      }

      const mergedSequenceNumber = Math.min(
        ...sourceInstallments.map((installment) => installment.sequenceNumber),
      );
      const mergedStatus = resolveMergedStatus(sourceInstallments, targetDueDate);
      const mergedId = randomUUID();

      const deletedCount = await this.installments.softDeleteForMerge(
        {
          tenantId: input.tenantId,
          installmentIds: uniqueIds,
          deletedById: input.staffId,
          deleteReason: 'merge',
        },
        tx,
      );

      if (deletedCount !== uniqueIds.length) {
        throw new ApplicationError(
          'INSTALLMENT_NOT_FOUND',
          'One or more installments could not be merged.',
          404,
        );
      }

      const [created] = await this.installments.saveMany(
        [
          {
            id: mergedId,
            saleId: input.saleId,
            tenantId: input.tenantId,
            sequenceNumber: mergedSequenceNumber,
            dueDate: targetDueDate,
            amountRial: mergedAmountRial,
            status: mergedStatus,
            createdById: input.staffId,
          },
        ],
        tx,
      );

      const newSnapshot = installmentRecordToOperationSnapshot(created!);

      const operationLog = await this.operationLogs.append(
        {
          tenantId: input.tenantId,
          saleId: input.saleId,
          operationType: 'merge',
          installmentIds: [...uniqueIds, created!.id],
          previousSnapshot: serializeOperationSnapshots(sourceSnapshots),
          newSnapshot: serializeOperationSnapshots([newSnapshot]),
          reason: trimmedReason,
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
          action: 'installment.merge',
          entityType: 'sale',
          entityId: input.saleId,
          oldValue: {
            removedInstallmentIds: uniqueIds,
            totalAmountRial: mergedAmountRial.toString(),
          },
          newValue: {
            mergedInstallmentId: created!.id,
            sequenceNumber: mergedSequenceNumber,
            dueDate: targetDueDate.toISOString(),
            totalAmountRial: mergedAmountRial.toString(),
            reason: trimmedReason,
            operationLogId: operationLog.id,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        mergedInstallment: {
          id: created!.id,
          sequenceNumber: created!.sequenceNumber,
          dueDate: created!.dueDate,
          amountRial: created!.amountRial,
          status: created!.status,
        },
        removedInstallmentIds: uniqueIds,
        operationLogId: operationLog.id,
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
