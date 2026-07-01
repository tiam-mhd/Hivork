export interface ILoginRateLimiterPort {
  /** Returns false when IP or phone exceeded sliding window limit. */
  checkAndRecord(phone: string, clientIp?: string): Promise<boolean>;
}

export const LOGIN_IP_LIMIT = 20;
export const LOGIN_IP_WINDOW_SECONDS = 900;

export const LOGIN_PHONE_LIMIT = 10;
export const LOGIN_PHONE_WINDOW_SECONDS = 900;

export const DEFAULT_LOCKOUT_MAX_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_DURATION_MINUTES = 30;

export type LockoutPolicy = {
  maxAttempts: number;
  durationMinutes: number;
  resetAfterSuccess: boolean;
};

export const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = {
  maxAttempts: DEFAULT_LOCKOUT_MAX_ATTEMPTS,
  durationMinutes: DEFAULT_LOCKOUT_DURATION_MINUTES,
  resetAfterSuccess: true,
};
