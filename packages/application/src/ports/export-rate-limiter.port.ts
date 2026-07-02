export interface IExportRateLimiterPort {
  /** Throws when staff exceeds export rate limit (10/hour default). */
  assertWithinLimit(staffId: string): Promise<void>;
}

export const EXPORT_RATE_LIMIT_PER_HOUR = 10;
/** @deprecated Use EXPORT_RATE_LIMIT_PER_HOUR */
export const EXPORT_RATE_LIMIT_PER_MINUTE = 5;
