export interface IForgotPasswordRateLimiterPort {
  checkRequestAllowed(phone: string, clientIp?: string): Promise<boolean>;
  checkResetAllowed(clientIp?: string): Promise<boolean>;
}

export const FORGOT_PASSWORD_PHONE_LIMIT = 3;
export const FORGOT_PASSWORD_PHONE_WINDOW_SECONDS = 3600;
export const FORGOT_PASSWORD_IP_LIMIT = 10;
export const FORGOT_PASSWORD_IP_WINDOW_SECONDS = 3600;
export const RESET_PASSWORD_IP_LIMIT = 5;
export const RESET_PASSWORD_IP_WINDOW_SECONDS = 3600;
