import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import {
  assertBranchAccessForSale,
  assertSaleAccessible,
} from './sale-lifecycle-guards.js';
import { saleRecordToDomain } from './sale-record.mapper.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type UnarchiveContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class UnarchiveContractUseCase
  implements UseCase<UnarchiveContractInput, SaleDetailEnterprise>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: UnarchiveContractInput): Promise<SaleDetailEnterprise> {
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

        if (record.status !== 'ARCHIVED') {
          throw new ApplicationError(
            'INVALID_STATUS_TRANSITION',
            'Only archived contracts can be unarchived.',
            409,
          );
        }

        const installmentRows = await this.installments.findBySaleId(
          input.tenantId,
          input.saleId,
          tx,
        );

        const sale = saleRecordToDomain(record);
        const archivedFromStatus = record.metadata?.archivedFromStatus as string | undefined;
        sale.unarchive(input.staffId);

        const updatedSale = await this.sales.unarchive(
          {
            id: record.id,
            tenantId: record.tenantId,
            version: record.version,
            updatedById: input.staffId,
            status: sale.status as typeof record.status,
            metadata: sale.metadata,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.unarchive',
            entityType: 'sale',
            entityId: record.id,
            oldValue: { status: 'ARCHIVED', archivedFromStatus },
            newValue: { status: updatedSale.status },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return mapSaleToEnterpriseDetail(updatedSale, installmentRows);
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
