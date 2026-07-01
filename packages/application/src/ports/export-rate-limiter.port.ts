export interface IExportRateLimiterPort {
  /** Throws when staff exceeds export rate limit (5/min default). */
  assertWithinLimit(staffId: string): Promise<void>;
}

export const EXPORT_RATE_LIMIT_PER_MINUTE = 5;
