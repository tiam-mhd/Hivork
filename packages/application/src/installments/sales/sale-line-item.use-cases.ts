import { randomUUID } from 'node:crypto';

import { MAX_SALE_LINE_ITEMS_PER_SALE, SaleLineItem } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { ISaleLineItemRepository } from '../../ports/sale-line-item.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import type { IUnitOfWork } from '../../ports/unit-of-work.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sale-data-scope.js';
import { assertSaleEditableForContractMetadata } from './sale-contract-edit.helper.js';
import {
  applyFinancialRecalculation,
  assertSaleVersion,
  computeLineTotalFromInput,
} from './sale-financials.helpers.js';
import {
  mapSaleLineItemToDto,
  type SaleLineItemDto,
} from './sale-line-item.mapper.js';
import {
  mapSaleToEnterpriseDetail,
  type SaleDetailEnterprise,
} from './sale-enterprise.mapper.js';

export type SaleEnterpriseWithLineItems = SaleDetailEnterprise & {
  lineItems: SaleLineItemDto[];
  requiresScheduleRegeneration?: boolean;
};

type BaseFinancialsInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};

async function loadEditableSale(
  input: BaseFinancialsInput,
  sales: ISaleRepository,
  installments: IInstallmentRepository,
) {
  return assertSaleEditableForContractMetadata(
    await sales.findById(input.tenantId, input.saleId),
    input.staffId,
    input.staffContext,
    input.branchId,
    installments,
    input.tenantId,
    input.saleId,
  );
}

function buildEnterpriseWithLineItems(
  sale: Awaited<ReturnType<ISaleRepository['findById']>> & object,
  installments: Awaited<ReturnType<IInstallmentRepository['findBySaleId']>>,
  lineItems: SaleLineItemDto[],
  requiresScheduleRegeneration?: boolean,
): SaleEnterpriseWithLineItems {
  const sortedInstallments = [...installments].sort(
    (left, right) => left.sequenceNumber - right.sequenceNumber,
  );

  return {
    ...mapSaleToEnterpriseDetail(sale, sortedInstallments),
    lineItems,
    ...(requiresScheduleRegeneration !== undefined ? { requiresScheduleRegeneration } : {}),
  };
}

export type ListSaleLineItemsInput = BaseFinancialsInput;

export class ListSaleLineItemsUseCase
  implements UseCase<ListSaleLineItemsInput, SaleLineItemDto[]>
{
  constructor(
    private readonly sales: ISaleRepository,
    private readonly lineItems: ISaleLineItemRepository,
  ) {}

  async execute(input: ListSaleLineItemsInput): Promise<SaleLineItemDto[]> {
    const record = await this.sales.findById(input.tenantId, input.saleId);
    if (!record || record.deletedAt) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    if (!isSaleInScope(record, input.staffId, input.staffContext)) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const rows = await this.lineItems.listBySale({
      tenantId: input.tenantId,
      saleId: input.saleId,
    });

    return rows.map(mapSaleLineItemToDto);
  }
}

export type CreateSaleLineItemCommandInput = BaseFinancialsInput & {
  title: string;
  sku?: string;
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
  sortOrder?: number;
};

export class CreateSaleLineItemUseCase
  implements UseCase<CreateSaleLineItemCommandInput, SaleEnterpriseWithLineItems>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateSaleLineItemCommandInput): Promise<SaleEnterpriseWithLineItems> {
    try {
      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await loadEditableSale(input, this.sales, this.installments);
        const activeCount = await this.lineItems.countActiveBySale(input.tenantId, input.saleId);
        SaleLineItem.assertLimit(activeCount);

        const lineTotalRial = computeLineTotalFromInput({
          quantity: input.quantity,
          unitPriceRial: input.unitPriceRial,
          discountRial: input.discountRial,
          taxRial: input.taxRial,
        });

        const entity = SaleLineItem.create({
          tenantId: input.tenantId,
          saleId: input.saleId,
          title: input.title,
          sku: input.sku ?? null,
          quantity: input.quantity,
          unitPriceRial: input.unitPriceRial,
          discountRial: input.discountRial,
          taxRial: input.taxRial,
          sortOrder: input.sortOrder,
          createdById: input.staffId,
        });

        const props = entity.toProps();
        await this.lineItems.create(
          {
            id: props.id,
            tenantId: props.tenantId,
            saleId: props.saleId,
            title: props.title,
            sku: props.sku,
            quantity: props.quantity,
            unitPriceRial: props.unitPriceRial,
            discountRial: props.discountRial,
            taxRial: props.taxRial,
            lineTotalRial,
            sortOrder: props.sortOrder,
            createdById: input.staffId,
          },
          tx,
        );

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
            sale,
            lineItems: rows,
            installments: installmentRows,
            regenerateInstallments: false,
            enforceInvariant: false,
            updatedById: input.staffId,
            tenantId: input.tenantId,
            sales: this.sales,
            installmentsRepo: this.installments,
            tx,
          });

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.line_item.create',
            entityType: 'sale_line_item',
            entityId: props.id,
            newValue: { saleId: input.saleId, title: props.title, lineTotalRial: lineTotalRial.toString() },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return buildEnterpriseWithLineItems(
          updatedSale,
          installments,
          rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        );
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

export type BulkUpsertSaleLineItemsInput = BaseFinancialsInput & {
  expectedVersion: number;
  regenerateInstallments: boolean;
  items: Array<{
    title: string;
    sku?: string;
    quantity: number;
    unitPriceRial: bigint;
    discountRial: bigint;
    taxRial: bigint;
    sortOrder?: number;
  }>;
};

export class BulkUpsertSaleLineItemsUseCase
  implements UseCase<BulkUpsertSaleLineItemsInput, SaleEnterpriseWithLineItems>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: BulkUpsertSaleLineItemsInput): Promise<SaleEnterpriseWithLineItems> {
    if (input.items.length > MAX_SALE_LINE_ITEMS_PER_SALE) {
      throw new ApplicationError('LINE_ITEM_LIMIT_EXCEEDED', 'Too many line items for this sale.', 409);
    }

    try {
      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await loadEditableSale(input, this.sales, this.installments);
        assertSaleVersion(sale, input.expectedVersion);

        const createInputs = input.items.map((item, index) => {
          const lineTotalRial = computeLineTotalFromInput(item);
          return {
            id: randomUUID(),
            tenantId: input.tenantId,
            saleId: input.saleId,
            title: item.title,
            sku: item.sku ?? null,
            quantity: item.quantity,
            unitPriceRial: item.unitPriceRial,
            discountRial: item.discountRial,
            taxRial: item.taxRial,
            lineTotalRial,
            sortOrder: item.sortOrder ?? index,
            createdById: input.staffId,
          };
        });

        await this.lineItems.replaceAllForSale(
          {
            tenantId: input.tenantId,
            saleId: input.saleId,
            items: createInputs,
            replacedById: input.staffId,
            deleteReason: 'Bulk replace line items',
          },
          tx,
        );

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

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.line_item.bulk_upsert',
            entityType: 'sale',
            entityId: input.saleId,
            newValue: {
              itemCount: rows.length,
              totalAmountRial: updatedSale.totalAmountRial.toString(),
            },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return buildEnterpriseWithLineItems(
          updatedSale,
          installments,
          rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        );
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

export type UpdateSaleLineItemCommandInput = BaseFinancialsInput & {
  lineItemId: string;
  title?: string;
  sku?: string | null;
  quantity?: number;
  unitPriceRial?: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
  sortOrder?: number;
};

export class UpdateSaleLineItemUseCase
  implements UseCase<UpdateSaleLineItemCommandInput, SaleEnterpriseWithLineItems>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UpdateSaleLineItemCommandInput): Promise<SaleEnterpriseWithLineItems> {
    try {
      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await loadEditableSale(input, this.sales, this.installments);
        const existing = await this.lineItems.findById(input.lineItemId, input.tenantId);
        if (!existing || existing.saleId !== input.saleId) {
          throw new ApplicationError('LINE_ITEM_NOT_FOUND', 'Sale line item was not found.', 404);
        }

        const quantity = input.quantity ?? existing.quantity;
        const unitPriceRial = input.unitPriceRial ?? existing.unitPriceRial;
        const discountRial = input.discountRial ?? existing.discountRial;
        const taxRial = input.taxRial ?? existing.taxRial;
        const lineTotalRial = computeLineTotalFromInput({
          quantity,
          unitPriceRial,
          discountRial,
          taxRial,
        });

        await this.lineItems.update(
          {
            id: input.lineItemId,
            tenantId: input.tenantId,
            title: input.title,
            sku: input.sku,
            quantity: input.quantity,
            unitPriceRial: input.unitPriceRial,
            discountRial: input.discountRial,
            taxRial: input.taxRial,
            lineTotalRial,
            sortOrder: input.sortOrder,
            updatedById: input.staffId,
          },
          tx,
        );

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
            sale,
            lineItems: rows,
            installments: installmentRows,
            regenerateInstallments: false,
            enforceInvariant: false,
            updatedById: input.staffId,
            tenantId: input.tenantId,
            sales: this.sales,
            installmentsRepo: this.installments,
            tx,
          });

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.line_item.update',
            entityType: 'sale_line_item',
            entityId: input.lineItemId,
            newValue: { lineTotalRial: lineTotalRial.toString() },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return buildEnterpriseWithLineItems(
          updatedSale,
          installments,
          rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        );
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}

export type SoftDeleteSaleLineItemInput = BaseFinancialsInput & {
  lineItemId: string;
  deleteReason: string;
};

export class SoftDeleteSaleLineItemUseCase
  implements UseCase<SoftDeleteSaleLineItemInput, SaleEnterpriseWithLineItems>
{
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly sales: ISaleRepository,
    private readonly installments: IInstallmentRepository,
    private readonly lineItems: ISaleLineItemRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SoftDeleteSaleLineItemInput): Promise<SaleEnterpriseWithLineItems> {
    try {
      return await this.unitOfWork.transaction(async (tx) => {
        const sale = await loadEditableSale(input, this.sales, this.installments);
        const existing = await this.lineItems.findById(input.lineItemId, input.tenantId);
        if (!existing || existing.saleId !== input.saleId) {
          throw new ApplicationError('LINE_ITEM_NOT_FOUND', 'Sale line item was not found.', 404);
        }

        await this.lineItems.softDelete(
          {
            id: input.lineItemId,
            tenantId: input.tenantId,
            deletedById: input.staffId,
            deleteReason: input.deleteReason,
          },
          tx,
        );

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
            sale,
            lineItems: rows,
            installments: installmentRows,
            regenerateInstallments: false,
            enforceInvariant: false,
            updatedById: input.staffId,
            tenantId: input.tenantId,
            sales: this.sales,
            installmentsRepo: this.installments,
            tx,
          });

        await this.audit.log(
          {
            tenantId: input.tenantId,
            actorType: 'staff',
            actorId: input.staffId,
            action: 'sale.line_item.delete',
            entityType: 'sale_line_item',
            entityId: input.lineItemId,
            newValue: { deleteReason: input.deleteReason },
            ip: input.ip,
            userAgent: input.userAgent,
          },
          tx,
        );

        return buildEnterpriseWithLineItems(
          updatedSale,
          installments,
          rows.map(mapSaleLineItemToDto),
          requiresScheduleRegeneration,
        );
      });
    } catch (error) {
      throw mapDomainError(error);
    }
  }
}
