import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IInstallmentScheduleExtender } from '../../ports/installment-schedule-extender.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import {
  buildContractVersionSnapshot,
  parseDateOnlyUtc,
  resolveLastInstallmentDueDate,
} from './contract-version-snapshot.helper.js';
import { isSaleInScope } from './sale-data-scope.js';
import { saleRecordToDomain } from './sale-record.mapper.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type ExtendContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  newLastDueDate: string;
  additionalInstallmentCount?: number;
  reason: string;
  regenerateSchedule?: boolean;
  expectedVersion: number;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class ExtendContractUseCase implements UseCase<ExtendContractInput, SaleDetailEnterprise> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly contractVersions: IContractVersionRepository,
    private readonly scheduleExtender: IInstallmentScheduleExtender,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: ExtendContractInput): Promise<SaleDetailEnterprise> {
    if (input.reason.trim().length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Extension reason is required.', 400);
    }

    const newLastDueDate = parseDateOnlyUtc(input.newLastDueDate);

    try {
      const result = await this.unitOfWork.transaction(async (tx) => {
        await this.assertBranchAccess(input.tenantId, input.branchId, input.staffContext);

        const record = await this.sales.findById(input.tenantId, input.saleId, tx);
        if (!record || record.deletedAt) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        if (!isSaleInScope(record, input.staffId, input.staffContext)) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        if (record.branchId !== input.branchId) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        if (record.version !== input.expectedVersion) {
          throw new ApplicationError(
            'VERSION_CONFLICT',
            'Sale was updated by another user. Refresh and try again.',
            409,
          );
        }

        if (record.status !== 'ACTIVE') {
          throw new ApplicationError(
            'INVALID_STATUS_TRANSITION',
            'Only active contracts can be extended.',
            409,
          );
        }

        if (record.archivedAt) {
          throw new ApplicationError(
            'SALE_ARCHIVED_READONLY',
            'Archived contracts are read-only.',
            409,
          );
        }

        const installmentRows = await this.installments.findBySaleId(
          input.tenantId,
          input.saleId,
          tx,
        );
        const sortedInstallments = [...installmentRows].sort(
          (left, right) => left.sequenceNumber - right.sequenceNumber,
        );

        const sale = saleRecordToDomain(record);
        const lastDueDate = resolveLastInstallmentDueDate(sortedInstallments);

        if (!sale.canExtend(lastDueDate, newLastDueDate)) {
          throw new ApplicationError(
            'EXTEND_DATE_INVALID',
            'New last due date must be after the current last installment due date.',
            422,
          );
        }

        const latestVersion = await this.contractVersions.findLatestVersionNumber(
          input.tenantId,
          input.saleId,
        );
        const nextVersionNumber = (latestVersion ?? 0) + 1;

        await this.contractVersions.appendVersion(
          {
            tenantId: input.tenantId,
            saleId: input.saleId,
            versionNumber: nextVersionNumber,
            changeType: 'EXTEND',
            changeReason: input.reason.trim(),
            snapshot: buildContractVersionSnapshot(record, sortedInstallments),
            createdById: input.staffId,
          },
          tx,
        );

        const additionalCount = input.additionalInstallmentCount ?? 0;
        const metadata = {
          ...(record.metadata ?? {}),
          lastExtend: {
            at: new Date().toISOString(),
            newLastDueDate: input.newLastDueDate,
            additionalInstallmentCount: additionalCount,
            reason: input.reason.trim(),
            regenerateSchedule: input.regenerateSchedule ?? false,
          },
        };

        const updatedSale = await this.sales.extend(
          {
            id: record.id,
            tenantId: record.tenantId,
            version: record.version,
            updatedById: input.staffId,
            extendedFromSaleId: record.extendedFromSaleId ?? record.id,
            installmentCount: record.installmentCount + additionalCount,
            metadata,
          },
          tx,
        );

        if (input.regenerateSchedule) {
          await this.scheduleExtender.extend(
            {
              tenantId: input.tenantId,
              saleId: input.saleId,
              newLastDueDate,
              additionalInstallmentCount: input.additionalInstallmentCount,
              actorId: input.staffId,
            },
            tx,
          );
        }

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.extend',
            entityType: 'sale',
            entityId: record.id,
            oldValue: {
              installmentCount: record.installmentCount,
              extendedFromSaleId: record.extendedFromSaleId,
            },
            newValue: {
              installmentCount: updatedSale.installmentCount,
              extendedFromSaleId: updatedSale.extendedFromSaleId,
              newLastDueDate: input.newLastDueDate,
              reason: input.reason.trim(),
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return mapSaleToEnterpriseDetail(updatedSale, sortedInstallments);
      });

      await this.invalidateDashboardCache(input.tenantId);
      return result;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw mapDomainError(error);
    }
  }

  private async assertBranchAccess(
    tenantId: string,
    branchId: string,
    staffContext: DataScopeStaffContext,
  ): Promise<void> {
    const exists = await this.branches.existsActiveInTenant(tenantId, branchId);
    if (!exists) {
      throw new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is not available for this tenant.', 403);
    }

    if (staffContext.dataScope === 'all') {
      return;
    }

    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0 && !effective.includes(branchId)) {
      throw new ApplicationError(
        'BRANCH_NOT_ALLOWED',
        'Branch is not assigned to this staff.',
        403,
      );
    }
  }

  private async invalidateDashboardCache(tenantId: string): Promise<void> {
    if (!this.reportCache) {
      return;
    }

    try {
      await this.reportCache.invalidateTenantDashboard(tenantId);
    } catch {
      // cache invalidation is best-effort
    }
  }
}
