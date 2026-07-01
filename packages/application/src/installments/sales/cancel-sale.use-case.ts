import { InstallmentStatus } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sale-data-scope.js';
import { saleRecordToDomain } from './sale-record.mapper.js';

export type CancelSaleInput = {
  tenantId: string;
  actorId: string;
  saleId: string;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type CancelSaleResult = {
  status: 'cancelled';
  cancelledAt: Date;
};

export class CancelSaleUseCase implements UseCase<CancelSaleInput, CancelSaleResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: CancelSaleInput): Promise<CancelSaleResult> {
    if (input.reason.trim().length < 3) {
      throw new ApplicationError('FIELD_REQUIRED', 'Cancellation reason is required.', 400);
    }

    try {
      const result = await this.unitOfWork.transaction(async (tx) => {
        const record = await this.sales.findById(input.tenantId, input.saleId, tx);
        if (!record || record.deletedAt) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        if (!isSaleInScope(record, input.actorId, input.staffContext)) {
          throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
        }

        const installmentRows = await this.installments.findBySaleId(
          input.tenantId,
          input.saleId,
          tx,
        );
        const snapshots = installmentRows.map((installment) => ({
          status: installment.status as InstallmentStatus,
        }));

        const sale = saleRecordToDomain(record);
        sale.cancel(input.reason, input.actorId, snapshots);

        await this.sales.update(
          {
            id: sale.id,
            tenantId: sale.tenantId,
            status: 'CANCELLED',
            cancelledAt: sale.cancelledAt,
            cancelledById: sale.cancelledById,
            cancelReason: sale.cancelReason,
            version: record.version,
            updatedById: input.actorId,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.actorId,
            action: 'sale.cancel',
            entityType: 'sale',
            entityId: sale.id,
            oldValue: { status: 'active' },
            newValue: { status: 'cancelled', reason: sale.cancelReason },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return {
          status: 'cancelled' as const,
          cancelledAt: sale.cancelledAt!,
        };
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
