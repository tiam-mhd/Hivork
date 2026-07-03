import { randomUUID } from 'node:crypto';

import {
  generateRegeneratedInstallmentSchedule,
  InstallmentOperationErrorCode,
  InstallmentOperationsService,
  InstallmentStatus,
  MergeSplitPolicy,
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
import { parseDateOnlyUtc } from '../sales/contract-version-snapshot.helper.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import { isSaleInScope } from '../sales/sale-data-scope.js';
import {
  installmentRecordToOperationSnapshot,
  serializeOperationSnapshots,
} from '../installment-operation-snapshot.helper.js';

export type SplitInstallmentExplicitPart = {
  amountRial: string;
  dueDate: string;
};

export type SplitInstallmentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  reason: string;
  expectedVersion: number;
  parts?: SplitInstallmentExplicitPart[];
  partCount?: number;
  firstDueDate?: string;
  intervalDays?: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SplitInstallmentResult = {
  originalInstallmentId: string;
  newInstallments: Array<{
    id: string;
    sequenceNumber: number;
    dueDate: Date;
    amountRial: bigint;
    status: string;
  }>;
  operationLogId: string;
};

type ResolvedSplitPart = {
  amountRial: bigint;
  dueDate: Date;
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
    case InstallmentOperationErrorCode.SPLIT_INVALID_PARTS:
      return new ApplicationError(
        InstallmentOperationErrorCode.SPLIT_INVALID_PARTS,
        'At least two split parts are required.',
        400,
      );
    case InstallmentOperationErrorCode.AMOUNT_MISMATCH:
      return new ApplicationError(
        InstallmentOperationErrorCode.AMOUNT_MISMATCH,
        'Split part amounts must sum to the original installment amount.',
        400,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_ALREADY_WAIVED,
        'Waived installments cannot be split.',
        409,
      );
    case InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID:
      return new ApplicationError(
        InstallmentOperationErrorCode.INSTALLMENT_STATUS_INVALID,
        'Only pending or overdue installments can be split.',
        409,
      );
    case InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE:
      return new ApplicationError(
        InstallmentOperationErrorCode.SEQUENCE_NUMBER_DUPLICATE,
        'Split would create duplicate installment sequence numbers.',
        409,
      );
    default:
      return new ApplicationError(code, 'Installment split is not allowed.', 409);
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

function resolvePartStatus(sourceStatus: string, dueDate: Date): 'PENDING' | 'OVERDUE' {
  const source =
    sourceStatus === 'OVERDUE' ? InstallmentStatus.OVERDUE : InstallmentStatus.PENDING;
  const resolved = InstallmentOperationsService.resolveAccelerateStatus(source, dueDate);
  return resolved === InstallmentStatus.OVERDUE ? 'OVERDUE' : 'PENDING';
}

function resolveSplitParts(input: SplitInstallmentInput, originalAmountRial: bigint): ResolvedSplitPart[] {
  if (input.parts) {
    return input.parts.map((part) => ({
      amountRial: BigInt(part.amountRial),
      dueDate: parseDateOnlyUtc(part.dueDate),
    }));
  }

  if (
    input.partCount === undefined ||
    input.firstDueDate === undefined ||
    input.intervalDays === undefined
  ) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      'Either explicit parts or equal-split parameters are required.',
      400,
    );
  }

  const schedule = generateRegeneratedInstallmentSchedule({
    totalAmountRial: originalAmountRial,
    installmentCount: input.partCount,
    startSequenceNumber: 1,
    roundingPolicy: 'last_installment_absorbs_remainder',
    firstDueDate: parseDateOnlyUtc(input.firstDueDate),
    intervalDays: input.intervalDays,
  });

  return schedule.map((item) => ({
    amountRial: item.amountRial,
    dueDate: item.dueDate,
  }));
}

export class SplitInstallmentUseCase implements UseCase<SplitInstallmentInput, SplitInstallmentResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly installments: IInstallmentRepository,
    private readonly operationLogs: IInstallmentOperationLogRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SplitInstallmentInput): Promise<SplitInstallmentResult> {
    const trimmedReason = input.reason.trim();
    if (trimmedReason.length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Split reason is required.', 400);
    }

    const hasExplicitParts = input.parts !== undefined;
    const hasEqualSplit = input.partCount !== undefined;
    if (hasExplicitParts === hasEqualSplit) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Provide either explicit parts or equal-split parameters.',
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
      const policy = resolveMergeSplitPolicy(settings);
      const previousSnapshot = installmentRecordToOperationSnapshot(installment);
      const resolvedParts = resolveSplitParts(input, installment.amountRial);
      const partAmountsRial = resolvedParts.map((part) => part.amountRial);

      for (const partAmount of partAmountsRial) {
        if (partAmount < policy.minPartRial) {
          throw new ApplicationError(
            'SPLIT_PART_TOO_SMALL',
            'Each split part must meet the minimum amount.',
            400,
          );
        }
      }

      const validation = InstallmentOperationsService.validateSplit({
        installment: previousSnapshot,
        partAmountsRial,
        policy,
      });

      if (!validation.ok) {
        throw mapValidationError(validation.error);
      }

      const saleInstallments = await this.installments.findBySaleId(input.tenantId, sale.id, tx);
      const otherSequenceNumbers = saleInstallments
        .filter((item) => item.id !== installment.id)
        .map((item) => item.sequenceNumber);
      const newSequenceNumbers = resolvedParts.map(
        (_, index) => installment.sequenceNumber + index,
      );

      const sequenceValidation = InstallmentOperationsService.validateUniqueSequenceNumbers({
        sequenceNumbers: [...otherSequenceNumbers, ...newSequenceNumbers],
      });

      if (!sequenceValidation.ok) {
        throw mapValidationError(sequenceValidation.error);
      }

      const deletedCount = await this.installments.softDeleteForMerge(
        {
          tenantId: input.tenantId,
          installmentIds: [installment.id],
          deletedById: input.staffId,
          deleteReason: 'split',
        },
        tx,
      );

      if (deletedCount !== 1) {
        throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Installment could not be split.', 404);
      }

      const newInstallmentInputs = resolvedParts.map((part, index) => ({
        id: randomUUID(),
        saleId: sale.id,
        tenantId: input.tenantId,
        sequenceNumber: installment.sequenceNumber + index,
        dueDate: part.dueDate,
        amountRial: part.amountRial,
        status: resolvePartStatus(installment.status, part.dueDate),
        createdById: input.staffId,
      }));

      const created = await this.installments.saveMany(newInstallmentInputs, tx);
      const newSnapshots = created.map(installmentRecordToOperationSnapshot);

      const operationLog = await this.operationLogs.append(
        {
          tenantId: input.tenantId,
          saleId: sale.id,
          operationType: 'split',
          installmentIds: [installment.id, ...created.map((item) => item.id)],
          previousSnapshot: serializeOperationSnapshots([previousSnapshot]),
          newSnapshot: serializeOperationSnapshots(newSnapshots),
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
          action: 'installment.split',
          entityType: 'sale',
          entityId: sale.id,
          oldValue: {
            originalInstallmentId: installment.id,
            amountRial: installment.amountRial.toString(),
            sequenceNumber: installment.sequenceNumber,
          },
          newValue: {
            newInstallmentIds: created.map((item) => item.id),
            partCount: created.length,
            totalAmountRial: partAmountsRial
              .reduce((total, amount) => total + amount, 0n)
              .toString(),
            reason: trimmedReason,
            operationLogId: operationLog.id,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        originalInstallmentId: installment.id,
        newInstallments: created.map((item) => ({
          id: item.id,
          sequenceNumber: item.sequenceNumber,
          dueDate: item.dueDate,
          amountRial: item.amountRial,
          status: item.status,
        })),
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
