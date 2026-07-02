import { ApplicationError } from '../../errors/application.error.js';
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
  assertReasonProvided,
  assertSaleAccessible,
} from './sale-lifecycle-guards.js';

export type SoftDeleteSaleInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  reason: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type SoftDeleteSaleResult = {
  id: string;
  deletedAt: string;
};

export class SoftDeleteSaleUseCase implements UseCase<SoftDeleteSaleInput, SoftDeleteSaleResult> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: SoftDeleteSaleInput): Promise<SoftDeleteSaleResult> {
    assertReasonProvided(input.reason, 'Delete reason');

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

      if (record.status === 'ARCHIVED' || record.archivedAt) {
        throw new ApplicationError(
          'SALE_ARCHIVED_READONLY',
          'Unarchive the contract before deleting it.',
          409,
        );
      }

      const installments = await this.installments.findBySaleId(
        input.tenantId,
        input.saleId,
        tx,
      );
      const hasPaidInstallment = installments.some((row) => row.status === 'PAID');
      if (hasPaidInstallment) {
        throw new ApplicationError(
          'SALE_HAS_PAID_INSTALLMENT',
          'Sales with paid installments cannot be deleted.',
          409,
        );
      }

      const updated = await this.sales.softDelete(
        {
          id: record.id,
          tenantId: record.tenantId,
          deletedById: input.staffId,
          deleteReason: input.reason.trim(),
        },
        tx,
      );

      if (!updated.deletedAt) {
        throw new ApplicationError('ALREADY_DELETED', 'Sale is already deleted.', 409);
      }

      await this.audit.log(
        {
          tenantId: input.tenantId,
          actorType: 'staff',
          actorId: input.staffId,
          action: 'sale.soft_delete',
          entityType: 'sale',
          entityId: record.id,
          oldValue: { deletedAt: null, status: record.status },
          newValue: {
            deletedAt: updated.deletedAt.toISOString(),
            deleteReason: updated.deleteReason,
          },
          ip: input.ip,
          userAgent: input.userAgent,
        },
        tx,
      );

      return {
        id: updated.id,
        deletedAt: updated.deletedAt.toISOString(),
      };
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
