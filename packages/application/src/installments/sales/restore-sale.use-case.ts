import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type RestoreSaleInput = {
  tenantId: string;
  staffId: string;
  saleId: string;
  ip?: string;
  userAgent?: string;
};

export class RestoreSaleUseCase implements UseCase<RestoreSaleInput, SaleDetailEnterprise> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: RestoreSaleInput): Promise<SaleDetailEnterprise> {
    const result = await this.unitOfWork.transaction(async (tx) => {
      const deleted = await this.sales.findDeletedById(input.tenantId, input.saleId, tx);
      if (!deleted) {
        const active = await this.sales.findById(input.tenantId, input.saleId, tx);
        if (active && !active.deletedAt) {
          throw new ApplicationError('NOT_DELETED', 'Sale is not deleted.', 409);
        }

        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      const restored = await this.sales.restore(
        {
          id: deleted.id,
          tenantId: deleted.tenantId,
          restoredById: input.staffId,
        },
        tx,
      );

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'sale.restore',
          entityType: 'sale',
          entityId: deleted.id,
          oldValue: {
            deletedAt: deleted.deletedAt?.toISOString() ?? null,
            deleteReason: deleted.deleteReason,
          },
          newValue: { deletedAt: null },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return mapSaleToEnterpriseDetail(restored, []);
    });

    await this.invalidateDashboardCache(input.tenantId);
    return result;
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
