import { DomainError } from '../errors/domain.error.js';
import { startOfUtcDay } from './date.utils.js';
import { computeLineTotal } from './sale-line-item.entity.js';
import {
  MAX_TAX_RATE_BPS,
  type RecalculateTotalsResult,
  type SaleFinancialsHeaderInput,
  type SaleFinancialsLineItemInput,
} from './sale-financials.types.js';

/**
 * Header-level tax and insurance aggregation for contract financials (IFP-069).
 *
 * Formula:
 * - subtotal = Σ line totals (qty × unitPrice − discount + lineTax)
 * - headerTax = taxInclusive ? 0 : fixed taxRial OR applyRate(subtotal, taxRateBps)
 * - total = subtotal + headerTax + insurance (when included in total)
 *
 * When both `taxRial` and `taxRateBps` are set, fixed `taxRial` wins (BR-048).
 */
export class SaleFinancials {
  static recalculateTotals(
    lineItems: SaleFinancialsLineItemInput[],
    header: SaleFinancialsHeaderInput = {},
  ): RecalculateTotalsResult {
    let subtotalRial = 0n;
    let lineTaxRial = 0n;

    for (const item of lineItems) {
      const lineTotal =
        item.lineTotalRial ??
        computeLineTotal({
          quantity: item.quantity,
          unitPriceRial: item.unitPriceRial,
          discountRial: item.discountRial,
          taxRial: item.taxRial,
        });

      if (lineTotal < 0n) {
        throw new DomainError('AMOUNT_INVALID');
      }

      subtotalRial += lineTotal;
      lineTaxRial += item.taxRial ?? 0n;
    }

    const headerTaxRial = resolveHeaderTaxRial(subtotalRial, header);
    const insuranceRial = normalizeNonNegativeBigInt(header.insuranceRial);
    const insuranceInTotal = header.insuranceIncludedInTotal !== false;
    const insuranceComponent = insuranceInTotal ? insuranceRial : 0n;
    const totalAmountRial = subtotalRial + headerTaxRial + insuranceComponent;

    if (totalAmountRial <= 0n) {
      throw new DomainError('AMOUNT_INVALID');
    }

    return {
      subtotalRial,
      lineTaxRial,
      headerTaxRial,
      taxRial: lineTaxRial + headerTaxRial,
      insuranceRial,
      totalAmountRial,
      insuranceExpired: isInsuranceExpired(header.insuranceExpiresAt, header.asOf),
    };
  }

  static assertValidTaxRateBps(taxRateBps: number | null | undefined): void {
    if (taxRateBps === null || taxRateBps === undefined) {
      return;
    }

    if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > MAX_TAX_RATE_BPS) {
      throw new DomainError('TAX_RATE_INVALID');
    }
  }
}

/** Apply basis points to subtotal with half-up rounding. */
export function applyTaxRateBps(subtotalRial: bigint, taxRateBps: number): bigint {
  SaleFinancials.assertValidTaxRateBps(taxRateBps);

  if (subtotalRial <= 0n || taxRateBps === 0) {
    return 0n;
  }

  return (subtotalRial * BigInt(taxRateBps) + 5_000n) / 10_000n;
}

function resolveHeaderTaxRial(subtotalRial: bigint, header: SaleFinancialsHeaderInput): bigint {
  if (header.taxInclusive) {
    return 0n;
  }

  if (header.taxRial !== null && header.taxRial !== undefined) {
    return normalizeNonNegativeBigInt(header.taxRial);
  }

  if (header.taxRateBps !== null && header.taxRateBps !== undefined) {
    return applyTaxRateBps(subtotalRial, header.taxRateBps);
  }

  return 0n;
}

function normalizeNonNegativeBigInt(value: bigint | null | undefined): bigint {
  const amount = value ?? 0n;
  if (amount < 0n) {
    throw new DomainError('AMOUNT_INVALID');
  }
  return amount;
}

export function isInsuranceExpired(
  insuranceExpiresAt: Date | null | undefined,
  asOf?: Date,
): boolean {
  if (!insuranceExpiresAt) {
    return false;
  }

  const reference = startOfUtcDay(asOf ?? new Date());
  const expiry = startOfUtcDay(insuranceExpiresAt);
  return expiry < reference;
}
