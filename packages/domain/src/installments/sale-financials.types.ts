import type { ComputeLineTotalInput } from './sale-line-item.types.js';

/** Maximum tax rate in basis points (10000 = 100%). */
export const MAX_TAX_RATE_BPS = 10_000;

export type SaleFinancialsLineItemInput = ComputeLineTotalInput & {
  /** When set, used instead of recomputing from quantity/unit/discount/tax. */
  lineTotalRial?: bigint;
};

export type SaleFinancialsHeaderInput = {
  /** Fixed header tax (wins over taxRateBps when both set). */
  taxRial?: bigint | null;
  taxRateBps?: number | null;
  taxInclusive?: boolean;
  insuranceRial?: bigint | null;
  insuranceExpiresAt?: Date | null;
  /** Tenant setting `insurance_included_in_total` — default true (add-on in total). */
  insuranceIncludedInTotal?: boolean;
  /** Reference date for insurance expiry warning (defaults to now). */
  asOf?: Date;
};

export type RecalculateTotalsResult = {
  subtotalRial: bigint;
  lineTaxRial: bigint;
  headerTaxRial: bigint;
  /** Combined tax: line-level + header-level. */
  taxRial: bigint;
  insuranceRial: bigint;
  totalAmountRial: bigint;
  insuranceExpired: boolean;
};
