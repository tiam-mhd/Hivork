import {
  MfaRequestOtpResponseSchema,
  MfaVerifySessionResponseSchema,
  type MfaVerifyDto,
} from '@hivork/contracts';

import { API_URL, ApiClientError, toApiClientError } from '../api/client';

export type MfaRequestOtpResult = {
  expiresIn: number;
  cooldownSeconds: number;
};

export type MfaVerifyResult = {
  kind: 'session';
  accessToken: string;
  expiresIn: number;
  staff: {
    id: string;
    tenantId: string;
    name: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
};

export async function requestMfaOtp(mfaToken: string): Promise<MfaRequestOtpResult> {
  const response = await fetch(`${API_URL}/auth/mfa/otp/request`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfaToken}`,
    },
    body: JSON.stringify({ method: 'otp' }),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw toApiClientError(body, 'خطا در ارسال کد', response.status);
  }

  return MfaRequestOtpResponseSchema.parse(body);
}

export async function verifyMfa(
  mfaToken: string,
  input: MfaVerifyDto,
): Promise<MfaVerifyResult> {
  const response = await fetch(`${API_URL}/auth/mfa/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfaToken}`,
    },
    body: JSON.stringify(input),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw toApiClientError(body, 'خطا در تأیید هویت', response.status);
  }

  return MfaVerifySessionResponseSchema.parse(body);
}

export function isMfaApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function mapMfaError(error: unknown): string {
  if (!isMfaApiError(error)) {
    return 'خطا در ارتباط با سرور. دوباره تلاش کنید.';
  }

  if (error.code === 'AUTH_MFA_TOKEN_EXPIRED' || error.code === 'AUTH_MFA_TOKEN_INVALID') {
    return 'نشست تأیید دو مرحله‌ای منقضی شده. لطفاً دوباره وارد شوید.';
  }

  if (error.code === 'AUTH_OTP_INVALID') {
    return 'کد تأیید اشتباه است.';
  }

  if (error.code === 'AUTH_OTP_EXPIRED') {
    return 'کد تأیید منقضی شده. دوباره درخواست دهید.';
  }

  if (error.code === 'AUTH_OTP_TOO_MANY_ATTEMPTS' || error.code === 'AUTH_OTP_RATE_LIMITED') {
    return 'تعداد تلاش‌ها بیش از حد مجاز است. کمی صبر کنید.';
  }

  if (error.code === 'AUTH_TOTP_INVALID') {
    return 'کد Authenticator اشتباه است.';
  }

  if (error.code === 'AUTH_MFA_NOT_ENABLED') {
    return 'تأیید دو مرحله‌ای برای این حساب غیرفعال شده. دوباره وارد شوید.';
  }

  return error.message || 'خطا در تأیید هویت.';
}
