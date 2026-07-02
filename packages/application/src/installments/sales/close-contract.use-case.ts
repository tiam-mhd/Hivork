import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { IInstallmentCloseWaiver } from '../../ports/installment-close-waiver.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { IReportCache } from '../../ports/report-cache.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { buildContractVersionSnapshot } from './contract-version-snapshot.helper.js';
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

export type CloseContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  reason: string;
  waiveRemaining?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export class CloseContractUseCase implements UseCase<CloseContractInput, SaleDetailEnterprise> {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly contractVersions: IContractVersionRepository,
    private readonly closeWaiver: IInstallmentCloseWaiver,
    private readonly branches: IBranchReader,
    private readonly audit: AuditService,
    private readonly reportCache?: IReportCache,
  ) {}

  async execute(input: CloseContractInput): Promise<SaleDetailEnterprise> {
    assertReasonProvided(input.reason, 'Close reason');

    const waiveRemaining = input.waiveRemaining ?? false;

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

        if (record.archivedAt || record.status === 'ARCHIVED') {
          throw new ApplicationError(
            'SALE_ARCHIVED_READONLY',
            'Archived contracts are read-only.',
            409,
          );
        }

        if (record.status === 'CLOSED') {
          throw new ApplicationError(
            'SALE_ALREADY_CLOSED',
            'Contract is already closed.',
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

        const latestVersion = await this.contractVersions.findLatestVersionNumber(
          input.tenantId,
          input.saleId,
        );

        await this.contractVersions.appendVersion(
          {
            tenantId: input.tenantId,
            saleId: input.saleId,
            versionNumber: (latestVersion ?? 0) + 1,
            changeType: 'CLOSE',
            changeReason: input.reason.trim(),
            snapshot: buildContractVersionSnapshot(record, sortedInstallments),
            createdById: input.staffId,
          },
          tx,
        );

        const sale = saleRecordToDomain(record);
        sale.close(input.staffId, input.reason.trim(), { waiveRemaining });

        if (waiveRemaining) {
          await this.closeWaiver.waiveRemainingOnClose(
            {
              tenantId: input.tenantId,
              saleId: input.saleId,
              actorId: input.staffId,
              reason: input.reason.trim(),
            },
            tx,
          );
        }

        const updatedSale = await this.sales.close(
          {
            id: record.id,
            tenantId: record.tenantId,
            version: record.version,
            updatedById: input.staffId,
            closedAt: sale.closedAt!,
            closedById: sale.closedById!,
            closeReason: sale.closeReason!,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.close',
            entityType: 'sale',
            entityId: record.id,
            oldValue: { status: record.status },
            newValue: {
              status: 'CLOSED',
              closeReason: updatedSale.closeReason,
              waiveRemaining,
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
