import { SaleFinancials } from '@hivork/domain';

import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IContractVersionRepository } from '../../ports/contract-version.repository.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleLineItemRepository } from '../../ports/sale-line-item.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { buildContractVersionSnapshot } from './contract-version-snapshot.helper.js';
import { assertSaleEditableForContractMetadata } from './sale-contract-edit.helper.js';
import {
  applyFinancialRecalculation,
  assertSaleVersion,
  lineItemsToFinancialsInput,
  parseOptionalInsuranceExpiresAt,
  saleHeaderToFinancialsInput,
} from './sale-financials.helpers.js';
import { mapSaleLineItemToDto } from './sale-line-item.mapper.js';
import type { SaleEnterpriseWithLineItems } from './sale-line-item.use-cases.js';
import { mapSaleToEnterpriseDetail } from './sale-enterprise.mapper.js';

type BaseInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

export type UpdateSaleFinancialsInput = BaseInput & {
  expectedVersion: number;
  taxRial?: bigint | null;
  taxRateBps?: number | null;
  taxInclusive?: boolean;
  insuranceRial?: bigint | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiresAt?: string | null;
};

export class UpdateSaleFinancialsUseCase
  implements UseCase<UpdateSaleFinancialsInput, SaleEnterpriseWithLineItems>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateSaleFinancialsInput): Promise<SaleEnterpriseWithLineItems> {
    try {
      if (input.taxRateBps !== undefined && input.taxRateBps !== null) {
        SaleFinancials.assertValidTaxRateBps(input.taxRateBps);
      }

      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await assertSaleEditableForContractMetadata(
          await this.sales.findById(input.tenantId, input.saleId, tx),
          input.staffId,
          input.staffContext,
          input.branchId,
          this.installments,
          input.tenantId,
          input.saleId,
        );
        assertSaleVersion(sale, input.expectedVersion);

        const insuranceExpiresAt = parseOptionalInsuranceExpiresAt(input.insuranceExpiresAt);
        const workingSale: typeof sale = {
          ...sale,
          ...(input.taxRial !== undefined ? { taxRial: input.taxRial } : {}),
          ...(input.taxRateBps !== undefined ? { taxRateBps: input.taxRateBps } : {}),
          ...(input.taxInclusive !== undefined ? { taxInclusive: input.taxInclusive } : {}),
          ...(input.insuranceRial !== undefined ? { insuranceRial: input.insuranceRial } : {}),
          ...(input.insuranceProvider !== undefined
            ? { insuranceProvider: input.insuranceProvider }
            : {}),
          ...(input.insurancePolicyNumber !== undefined
            ? { insurancePolicyNumber: input.insurancePolicyNumber }
            : {}),
          ...(insuranceExpiresAt !== undefined ? { insuranceExpiresAt } : {}),
        };

        const rows = await this.lineItems.listBySale(
          { tenantId: input.tenantId, saleId: input.saleId },
          tx,
        );
        const installmentRows = await this.installments.findBySaleId(
          input.tenantId,
          input.saleId,
          tx,
        );

        const { updatedSale, requiresScheduleRegeneration, installments } =
          await applyFinancialRecalculation({
            sale: workingSale,
            lineItems: rows,
            installments: installmentRows,
            regenerateInstallments: false,
            enforceInvariant: false,
            updatedById: input.staffId,
            tenantId: input.tenantId,
            sales: this.sales,
            installmentsRepo: this.installments,
            tx,
            additionalSaleFields: {
              ...(input.taxRateBps !== undefined ? { taxRateBps: input.taxRateBps } : {}),
              ...(input.taxInclusive !== undefined ? { taxInclusive: input.taxInclusive } : {}),
              ...(input.insuranceRial !== undefined ? { insuranceRial: input.insuranceRial } : {}),
              ...(input.insuranceProvider !== undefined
                ? { insuranceProvider: input.insuranceProvider }
                : {}),
              ...(input.insurancePolicyNumber !== undefined
                ? { insurancePolicyNumber: input.insurancePolicyNumber }
                : {}),
              ...(insuranceExpiresAt !== undefined ? { insuranceExpiresAt } : {}),
            },
          });

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.financials.update',
            entityType: 'sale',
            entityId: input.saleId,
            newValue: {
              taxRial: updatedSale.taxRial?.toString() ?? null,
              taxRateBps: updatedSale.taxRateBps,
              insuranceRial: updatedSale.insuranceRial?.toString() ?? null,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return {
          ...mapSaleToEnterpriseDetail(updatedSale, installments),
          lineItems: rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        };
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

export type RecalculateSaleFinancialsInput = BaseInput & {
  expectedVersion: number;
  regenerateInstallments: boolean;
  changeReason?: string;
};

export type RecalculateSaleFinancialsResult = {
  totalAmountRial: string;
  subtotalRial: string;
  taxRial: string;
  insuranceRial: string;
  requiresScheduleRegeneration: boolean;
  version: number;
  sale: SaleEnterpriseWithLineItems;
};

export class RecalculateSaleFinancialsUseCase
  implements UseCase<RecalculateSaleFinancialsInput, RecalculateSaleFinancialsResult>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly contractVersions: IContractVersionRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RecalculateSaleFinancialsInput): Promise<RecalculateSaleFinancialsResult> {
    try {
      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await assertSaleEditableForContractMetadata(
          await this.sales.findById(input.tenantId, input.saleId, tx),
          input.staffId,
          input.staffContext,
          input.branchId,
          this.installments,
          input.tenantId,
          input.saleId,
        );
        assertSaleVersion(sale, input.expectedVersion);

        const rows = await this.lineItems.listBySale(
          { tenantId: input.tenantId, saleId: input.saleId },
          tx,
        );
        const installmentRows = await this.installments.findBySaleId(
          input.tenantId,
          input.saleId,
          tx,
        );

        const { updatedSale, recalculated, requiresScheduleRegeneration, installments } =
          await applyFinancialRecalculation({
            sale,
            lineItems: rows,
            installments: installmentRows,
            regenerateInstallments: input.regenerateInstallments,
            enforceInvariant: true,
            updatedById: input.staffId,
            tenantId: input.tenantId,
            sales: this.sales,
            installmentsRepo: this.installments,
            tx,
          });

        const latestVersion = await this.contractVersions.findLatestVersionNumber(
          input.tenantId,
          input.saleId,
        );

        await this.contractVersions.appendVersion(
          {
            tenantId: input.tenantId,
            saleId: input.saleId,
            versionNumber: (latestVersion ?? 0) + 1,
            changeType: 'FINANCIAL_RECALC',
            changeReason: input.changeReason?.trim() || 'Financial recalculation',
            snapshot: buildContractVersionSnapshot(updatedSale, installments),
            createdById: input.staffId,
          },
          tx,
        );

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.financials.recalculate',
            entityType: 'sale',
            entityId: input.saleId,
            newValue: {
              totalAmountRial: updatedSale.totalAmountRial.toString(),
              requiresScheduleRegeneration,
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        const saleDto: SaleEnterpriseWithLineItems = {
          ...mapSaleToEnterpriseDetail(updatedSale, installments),
          lineItems: rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        };

        return {
          totalAmountRial: recalculated.totalAmountRial.toString(),
          subtotalRial: recalculated.subtotalRial.toString(),
          taxRial: recalculated.taxRial.toString(),
          insuranceRial: recalculated.insuranceRial.toString(),
          requiresScheduleRegeneration,
          version: updatedSale.version,
          sale: saleDto,
        };
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

// Re-export preview helper for tests
export function previewSaleFinancialTotals(
  sale: Parameters<typeof saleHeaderToFinancialsInput>[0],
  lineItems: Parameters<typeof lineItemsToFinancialsInput>[0],
) {
  return SaleFinancials.recalculateTotals(
    lineItemsToFinancialsInput(lineItems),
    saleHeaderToFinancialsInput(sale),
  );
}
