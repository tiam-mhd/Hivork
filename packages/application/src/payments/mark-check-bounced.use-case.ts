import {
  CheckBouncedEvent,
  CheckTransitionError,
} from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import type { ICheckRepository } from '../ports/check.repository.port.js';
import type { IOutboxPublisher } from '../ports/outbox.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { IUnitOfWork } from '../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import { mapCheckToSummary } from './check.mapper.js';
import { reconstituteCheckFromRecord } from './check-record.mapper.js';

export type MarkCheckBouncedInput = {
  tenantId: string;
  staffId: string;
  checkId: string;
  bounceReason: string;
  bouncedAt?: Date;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type MarkCheckBouncedResult = {
  check: ReturnType<typeof mapCheckToSummary>;
};

function resolveCheckBounceSettings(settings: Record<string, unknown>) {
  return {
    allowBounceAfterCollect:
      settings.check_allow_bounce_after_collect === true ||
      settings.check_allow_bounce_after_collect === 'true',
  };
}

function mapCheckDomainError(error: CheckTransitionError): ApplicationError {
  const mapped = mapDomainError(error);
  if (error.code === 'CHECK_ALREADY_BOUNCED') {
    return new ApplicationError(error.code, mapped.message, 409);
  }
  if (error.code === 'CHECK_ALREADY_COLLECTED') {
    return new ApplicationError(error.code, mapped.message, 409);
  }
  if (error.code === 'CHECK_TYPE_NOT_RECEIVABLE') {
    return new ApplicationError(error.code, mapped.message, 400);
  }
  return mapped;
}

export class MarkCheckBouncedUseCase
  implements UseCase<MarkCheckBouncedInput, MarkCheckBouncedResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly checks: ICheckRepository,
    private readonly branches: IBranchReader,
    private readonly tenantSettings: ITenantSettingsRepository,
    private readonly audit: AuditService,
    private readonly outbox: IOutboxPublisher,
  ) {}

  async execute(input: MarkCheckBouncedInput): Promise<MarkCheckBouncedResult> {
    const record = await this.checks.findById(input.tenantId, input.checkId);
    if (!record) {
      throw new ApplicationError('CHECK_NOT_FOUND', 'Check was not found.', 404);
    }

    await this.assertBranchAccess(input.tenantId, record.branchId, input.staffContext);

    const settings = await this.tenantSettings.findByModule(input.tenantId, 'installments');
    const bounceSettings = resolveCheckBounceSettings(settings);

    const previousStatus = record.status;
    const checkEntity = reconstituteCheckFromRecord(record);
    const bouncedAt = input.bouncedAt ?? new Date();

    try {
      checkEntity.bounce(input.staffId, input.bounceReason, bouncedAt, {
        allowBounceAfterCollect: bounceSettings.allowBounceAfterCollect,
      });
    } catch (error) {
      if (error instanceof CheckTransitionError) {
        throw mapCheckDomainError(error);
      }
      throw error;
    }

    return this.unitOfWork.transaction(async (tx) => {
      const result = await this.checks.markBounced(
        {
          tenantId: input.tenantId,
          id: input.checkId,
          expectedVersion: record.version,
          status: 'BOUNCED',
          bounceReason: checkEntity.bounceReason ?? input.bounceReason.trim(),
          bouncedAt,
          updatedById: input.staffId,
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
          action: 'check.bounce',
          entityType: 'check',
          entityId: result.check.id,
          newValue: {
            status: 'bounced',
            bounceReason: result.check.bounceReason,
            bouncedAt: bouncedAt.toISOString(),
            previousStatus: previousStatus.toLowerCase(),
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      await this.outbox.publish(
        new CheckBouncedEvent(result.check.id, {
          tenantId: input.tenantId,
          checkId: result.check.id,
          checkType: 'received',
          checkNumber: result.check.checkNumber,
          bankName: result.check.bankName,
          amountRial: result.check.amountRial.toString(),
          bounceReason: result.check.bounceReason ?? input.bounceReason.trim(),
          bouncedAt: bouncedAt.toISOString(),
          installmentId: result.check.installmentId,
          paymentAttemptId: result.check.paymentAttemptId,
          previousStatus: previousStatus.toLowerCase(),
        }),
        { tenantId: input.tenantId, aggregateType: 'check' },
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
