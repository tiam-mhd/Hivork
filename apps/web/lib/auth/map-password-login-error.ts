import { ErrorCodes } from '@hivork/contracts';

import { LOGIN_PASSWORD_I18N } from './login-password-i18n';
import { isPasswordLoginApiError } from './password-login';

export function mapPasswordLoginError(error: unknown): {
  message: string;
  clearPassword?: boolean;
  lockedUntil?: number;
  rateLimitUntil?: number;
  tenantRequired?: boolean;
  resetCaptcha?: boolean;
  showForgotPasswordLink?: boolean;
} {
  if (!isPasswordLoginApiError(error)) {
    return { message: LOGIN_PASSWORD_I18N.networkError };
  }

  if (error.code === ErrorCodes.AUTH_INVALID_CREDENTIALS) {
    return { message: LOGIN_PASSWORD_I18N.invalidCredentials, clearPassword: true };
  }

  if (error.code === ErrorCodes.AUTH_ACCOUNT_LOCKED) {
    const lockedUntilRaw = error.details?.lockedUntil;
    const retryAfterRaw = error.details?.retryAfterSeconds;
    const lockedUntil =
      typeof lockedUntilRaw === 'string' ? Date.parse(lockedUntilRaw) : undefined;
    const retryAfterSeconds =
      typeof retryAfterRaw === 'number'
        ? retryAfterRaw
        : lockedUntil && !Number.isNaN(lockedUntil)
          ? Math.max(1, Math.ceil((lockedUntil - Date.now()) / 1000))
          : undefined;
    const minutes =
      retryAfterSeconds !== undefined ? Math.max(1, Math.ceil(retryAfterSeconds / 60)) : undefined;

    return {
      message:
        minutes !== undefined
          ? LOGIN_PASSWORD_I18N.accountLockedMinutes(minutes)
          : LOGIN_PASSWORD_I18N.accountLocked,
      lockedUntil: lockedUntil && !Number.isNaN(lockedUntil) ? lockedUntil : undefined,
      showForgotPasswordLink: true,
    };
  }

  if (error.code === ErrorCodes.AUTH_LOGIN_RATE_LIMITED || error.httpStatus === 429) {
    const retryAfter =
      typeof error.details?.retryAfter === 'number' ? error.details.retryAfter * 1000 : 60_000;
    return {
      message: LOGIN_PASSWORD_I18N.rateLimited,
      rateLimitUntil: Date.now() + retryAfter,
    };
  }

  if (error.code === 'NEED_TENANT_SLUG' && error.httpStatus === 409) {
    return { message: LOGIN_PASSWORD_I18N.tenantHelp, tenantRequired: true };
  }

  if (error.code === ErrorCodes.STAFF_SUSPENDED) {
    return { message: LOGIN_PASSWORD_I18N.staffSuspended };
  }

  if (error.code === ErrorCodes.TENANT_SUSPENDED) {
    return { message: LOGIN_PASSWORD_I18N.tenantSuspended };
  }

  if (error.code === ErrorCodes.AUTH_CAPTCHA_INVALID || error.code === ErrorCodes.AUTH_CAPTCHA_REQUIRED) {
    return { message: LOGIN_PASSWORD_I18N.captchaRequired, resetCaptcha: true };
  }

  return { message: error.message || LOGIN_PASSWORD_I18N.networkError };
}
