/** Tracks failed password login attempts per client IP (IFP-012). */
export interface IPasswordLoginFailureCounterPort {
  getCount(clientIp: string): Promise<number>;
  recordFailure(clientIp: string): Promise<number>;
}

export const DEFAULT_CAPTCHA_AFTER_FAILURES = 2;
export const PASSWORD_LOGIN_FAILURE_WINDOW_SECONDS = 900;
