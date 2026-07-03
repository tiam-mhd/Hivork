/** Tenant policy for defer operations — maps to `installments.defer.maxDays` (IFP-081). */
export type DeferPolicySettings = {
  defer_max_days?: number;
};

const DEFAULT_MAX_DEFER_DAYS = 30;

export class DeferPolicy {
  readonly maxDeferDays: number;

  constructor(settings?: DeferPolicySettings) {
    const maxDays = settings?.defer_max_days ?? DEFAULT_MAX_DEFER_DAYS;
    if (!Number.isInteger(maxDays) || maxDays < 1) {
      throw new RangeError('defer_max_days must be a positive integer');
    }
    this.maxDeferDays = maxDays;
  }

  static fromSettings(settings?: DeferPolicySettings): DeferPolicy {
    return new DeferPolicy(settings);
  }
}
