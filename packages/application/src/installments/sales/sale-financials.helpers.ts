import {
  SaleFinancials,
  assertDownPaymentWithinTotal,
  calculateLineTotal,
  evaluateScheduleRegeneration,
  validateFinancialInvariant,
} from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { OutboxTransaction } from '../../ports/outbox.port.js';
import type { SaleLineItemRecord } from '../../ports/sale-line-item.repository.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import type { ISaleRepository } from '../../ports/sale.repository.port.js';
import { parseDateOnlyUtc } from './contract-version-snapshot.helper.js';

export function lineItemsToFinancialsInput(items: SaleLineItemRecord[]) {
  return items.map((item) => ({
    quantity: item.quantity,
    unitPriceRial: item.unitPriceRial,
    discountRial: item.discountRial,
    taxRial: item.taxRial,
    lineTotalRial: item.lineTotalRial,
  }));
}

export function saleHeaderToFinancialsInput(sale: SaleRecord) {
  return {
    taxRial: sale.taxRial,
    taxRateBps: sale.taxRateBps,
    taxInclusive: sale.taxInclusive,
    insuranceRial: sale.insuranceRial,
    insuranceExpiresAt: sale.insuranceExpiresAt,
  };
}

export function assertSaleVersion(sale: SaleRecord, expectedVersion: number): void {
  if (sale.version !== expectedVersion) {
    throw new ApplicationError(
      'VERSION_CONFLICT',
      'Sale was updated by another user. Refresh and try again.',
      409,
    );
  }
}

export type ApplyFinancialRecalculationInput = {
  sale: SaleRecord;
  lineItems: SaleLineItemRecord[];
  installments: Awaited<ReturnType<IInstallmentRepository['findBySaleId']>>;
  regenerateInstallments: boolean;
  enforceInvariant: boolean;
  updatedById: string;
  tenantId: string;
  sales: ISaleRepository;
  installmentsRepo: IInstallmentRepository;
  tx: OutboxTransaction;
  additionalSaleFields?: Omit<
    import('../../ports/sale.repository.port.js').UpdateSaleFinancialsPersistenceInput,
    'id' | 'tenantId' | 'version' | 'updatedById' | 'totalAmountRial' | 'taxRial'
  >;
};

export type ApplyFinancialRecalculationResult = {
  updatedSale: SaleRecord;
  recalculated: ReturnType<typeof SaleFinancials.recalculateTotals>;
  requiresScheduleRegeneration: boolean;
  installments: Awaited<ReturnType<IInstallmentRepository['findBySaleId']>>;
};

export async function applyFinancialRecalculation(
  input: ApplyFinancialRecalculationInput,
): Promise<ApplyFinancialRecalculationResult> {
  try {
    const recalculated = SaleFinancials.recalculateTotals(
      lineItemsToFinancialsInput(input.lineItems),
      saleHeaderToFinancialsInput(input.sale),
    );

    assertDownPaymentWithinTotal(recalculated.totalAmountRial, input.sale.downPaymentRial);

    const evaluation = evaluateScheduleRegeneration({
      previousTotalAmountRial: input.sale.totalAmountRial,
      totalAmountRial: recalculated.totalAmountRial,
      downPaymentRial: input.sale.downPaymentRial,
      installmentAmounts: input.installments.map((row) => row.amountRial),
    });

    if (evaluation.requiresScheduleRegeneration) {
      if (input.enforceInvariant && !input.regenerateInstallments) {
        throw new ApplicationError(
          'INSTALLMENT_SUM_MISMATCH',
          'Installment schedule no longer matches contract total. Regenerate installments or adjust down payment.',
          409,
        );
      }

      if (input.regenerateInstallments) {
        await input.installmentsRepo.regeneratePendingAmounts(
          {
            tenantId: input.tenantId,
            saleId: input.sale.id,
            totalAmountRial: recalculated.totalAmountRial,
            downPaymentRial: input.sale.downPaymentRial,
            installmentCount: input.sale.installmentCount,
            firstDueDate: input.sale.firstDueDate,
            intervalDays: input.sale.intervalDays,
            updatedById: input.updatedById,
          },
          input.tx,
        );
      }
    }

    const updatedSale = await input.sales.updateFinancials(
      {
        id: input.sale.id,
        tenantId: input.tenantId,
        version: input.sale.version,
        updatedById: input.updatedById,
        totalAmountRial: recalculated.totalAmountRial,
        taxRial: recalculated.taxRial,
        ...(input.additionalSaleFields ?? {}),
      },
      input.tx,
    );

    const installments = await input.installmentsRepo.findBySaleId(
      input.tenantId,
      input.sale.id,
      input.tx,
    );

    if (input.enforceInvariant && input.regenerateInstallments) {
      const postRegen = validateFinancialInvariant({
        totalAmountRial: recalculated.totalAmountRial,
        downPaymentRial: input.sale.downPaymentRial,
        installmentAmounts: installments.map((row) => row.amountRial),
      });

      if (!postRegen.ok) {
        throw new ApplicationError(
          'INSTALLMENT_SUM_MISMATCH',
          'Installment schedule could not be reconciled with the new total.',
          409,
        );
      }
    }

    const postEvaluation = evaluateScheduleRegeneration({
      totalAmountRial: recalculated.totalAmountRial,
      downPaymentRial: input.sale.downPaymentRial,
      installmentAmounts: installments.map((row) => row.amountRial),
    });

    return {
      updatedSale,
      recalculated,
      requiresScheduleRegeneration: postEvaluation.requiresScheduleRegeneration,
      installments,
    };
  } catch (error) {
    throw mapDomainError(error);
  }
}

export function parseOptionalInsuranceExpiresAt(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseDateOnlyUtc(value);
}

export function computeLineTotalFromInput(input: {
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
}): bigint {
  return calculateLineTotal(input);
}
