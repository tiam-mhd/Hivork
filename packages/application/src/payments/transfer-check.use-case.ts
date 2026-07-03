import { CheckTransitionError } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapCheckToSummary } from './check.mapper.js';
import { reconstituteCheckFromRecord } from './check-record.mapper.js';

export type TransferCheckInput = {
  tenantId: string;
  staffId: string;
  checkId: string;
  transferredTo: string;
  transferReason?: string;
  transferredAt?: Date;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type TransferCheckResult = {
  check: ReturnType<typeof mapCheckToSummary>;
};

function mapTransferDomainError(error: CheckTransitionError): ApplicationError {
  const mapped = mapDomainError(error);
  if (error.code === 'CHECK_ALREADY_COLLECTED') {
    return new ApplicationError(error.code, mapped.message, 409);
  }
  if (error.code === 'CHECK_INVALID_STATE') {
    return new ApplicationError(error.code, mapped.message, 409);
  }
  return mapped;
}

export class TransferCheckUseCase implements UseCase<TransferCheckInput, TransferCheckResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
  ) {}

  async execute(input: TransferCheckInput): Promise<TransferCheckResult> {
    const record = await this.checks.findById(input.tenantId, input.checkId);
    if (!record) {
      throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
    }

    await this.assertBranchAccess(input.tenantId, record.branchId, input.staffContext);

    const checkEntity = reconstituteCheckFromRecord(record);
    const transferredAt = input.transferredAt ?? new Date();

    try {
      checkEntity.transfer(input.staffId, input.transferredTo, transferredAt);
    } catch (error) {
      if (error instanceof CheckTransitionError) {
        throw mapTransferDomainError(error);
      }
      throw error;
    }

    const metadata: Record<string, unknown> = {
      ...(record.metadata ?? {}),
      ...(input.transferReason ? { transferReason: input.transferReason.trim() } : {}),
    };

    return this.unitOfWork.transaction(async (tx) => {
      const result = await this.checks.markTransferred(
        {
          tenantId: input.tenantId,
          id: record.id,
          expectedVersion: record.version,
          transferredTo: checkEntity.transferredTo ?? input.transferredTo.trim(),
          transferredAt,
          updatedById: input.staffId,
          metadata,
        },
        tx,
      );

      if (result.outcome === 'not_found') {
        throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
      }

      if (result.outcome === 'version_conflict') {
        throw new ApplicationError(
          'VERSION_CONFLICT',
          'Check was updated by another request.',
          409,
        );
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'check.transfer',
          entityType: 'check',
          entityId: result.check.id,
          newValue: {
            status: 'transferred',
            transferredTo: result.check.transferredTo,
            transferredAt: transferredAt.toISOString(),
            ...(input.transferReason ? { transferReason: input.transferReason.trim() } : {}),
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return { check: mapCheckToSummary(result.check) };
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
