import type { RoundingMode } from '../holiday-calendar.js';

/** Tenant policy for merge/split/regenerate amount rules (IFP-079 / IFP-084 / IFP-085). */
export type MergeSplitPolicySettings = {
  split_min_part_rial?: string;
  rounding_mode?: RoundingMode;
  rounding_unit_rial?: string;
};

const DEFAULT_MIN_PART_RIAL = 1_000n;
const DEFAULT_ROUNDING_UNIT_RIAL = 1_000n;

export class MergeSplitPolicy {
  readonly minPartRial: bigint;
  readonly minMergeCount: number;
  readonly roundingToleranceRial: bigint;

  constructor(settings?: MergeSplitPolicySettings) {
    this.minPartRial = BigInt(settings?.split_min_part_rial ?? String(DEFAULT_MIN_PART_RIAL));
    this.minMergeCount = 2;
    const unit = BigInt(settings?.rounding_unit_rial ?? String(DEFAULT_ROUNDING_UNIT_RIAL));
    this.roundingToleranceRial =
      settings?.rounding_mode === 'none' || unit <= 0n ? 0n : unit;
  }

  static fromSettings(settings?: MergeSplitPolicySettings): MergeSplitPolicy {
    return new MergeSplitPolicy(settings);
  }
}
