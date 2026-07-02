import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  assertBranchAccessForSale,
  assertReasonProvided,
  assertSaleAccessible,
} from './sale-lifecycle-guards.js';
import { saleRecordToDomain } from './sale-record.mapper.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type ArchiveContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class ArchiveContractUseCase implements UseCase<ArchiveContractInput, SaleDetailEnterprise> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: ArchiveContractInput): Promise<SaleDetailEnterprise> {
    assertReasonProvided(input.reason, 'Archive reason');

    try {
      const result = await this.unitOfWork.transaction(async (tx) => {
        await assertBranchAccessForSale(
          this.branches,
          input.tenantId,
          input.branchId,
          input.staffContext,
        );

        const record = assertSaleAccessible(
          await this.sales.findById(input.tenantId, input.saleId, tx),
          input.staffId,
          input.staffContext,
          input.branchId,
        );

        if (record.status === 'ARCHIVED') {
          throw new ApplicationError(
            'SALE_ARCHIVED_READONLY',
            'Contract is already archived.',
            409,
          );
        }

        const sale = saleRecordToDomain(record);
        sale.archive(input.staffId, input.reason.trim());

        const updatedSale = await this.sales.archive(
          {
            id: record.id,
            tenantId: record.tenantId,
            version: record.version,
            updatedById: input.staffId,
            archivedAt: sale.archivedAt!,
            archivedById: sale.archivedById!,
            archiveReason: sale.archiveReason!,
            metadata: sale.metadata,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.archive',
            entityType: 'sale',
            entityId: record.id,
            oldValue: { status: record.status },
            newValue: {
              status: 'ARCHIVED',
              archiveReason: updatedSale.archiveReason,
              archivedFromStatus: record.status,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return mapSaleToEnterpriseDetail(updatedSale, []);
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
