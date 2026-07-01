import {
  ChangePhoneConfirmResponseSchema,
  ChangePhoneInitResponseSchema,
  ChangePhoneInitSchema,
  ChangePhoneOtpResponseSchema,
  ChangePhoneRequestNewSchema,
  ChangePhoneSessionSchema,
  ChangePhoneVerifyCurrentResponseSchema,
  ChangePhoneVerifyOtpSchema,
  type ChangePhoneInitDto,
  type ChangePhoneRequestNewDto,
  type ChangePhoneSessionDto,
  type ChangePhoneVerifyOtpDto,
  type ChangePhoneInitResponseDto,
  type ChangePhoneOtpResponseDto,
  type ChangePhoneVerifyCurrentResponseDto,
  type ChangePhoneConfirmResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export const CHANGE_PHONE_PERMISSION = 'core.security.phone.change';

export async function initChangePhone(input: ChangePhoneInitDto): Promise<ChangePhoneInitResponseDto> {
  const payload = ChangePhoneInitSchema.parse(input);
  const result = await apiFetch<unknown>('/staff/me/phone/change/init', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ChangePhoneInitResponseSchema.parse(result);
}

export async function requestCurrentPhoneOtp(
  input: ChangePhoneSessionDto,
): Promise<ChangePhoneOtpResponseDto> {
  const payload = ChangePhoneSessionSchema.parse(input);
  const result = await apiFetch<unknown>(
    '/staff/me/phone/change/request-current',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return ChangePhoneOtpResponseSchema.parse(result);
}

export async function verifyCurrentPhoneOtp(
  input: ChangePhoneVerifyOtpDto,
): Promise<ChangePhoneVerifyCurrentResponseDto> {
  const payload = ChangePhoneVerifyOtpSchema.parse(input);
  const result = await apiFetch<unknown>(
    '/staff/me/phone/change/verify-current',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return ChangePhoneVerifyCurrentResponseSchema.parse(result);
}

export async function requestNewPhoneOtp(
  input: ChangePhoneRequestNewDto,
): Promise<ChangePhoneOtpResponseDto> {
  const payload = ChangePhoneRequestNewSchema.parse(input);
  const result = await apiFetch<unknown>(
    '/staff/me/phone/change/request-new',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
  return ChangePhoneOtpResponseSchema.parse(result);
}

export async function confirmChangePhone(
  input: ChangePhoneVerifyOtpDto,
): Promise<ChangePhoneConfirmResponseDto> {
  const payload = ChangePhoneVerifyOtpSchema.parse(input);
  const result = await apiFetch<unknown>('/staff/me/phone/change/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ChangePhoneConfirmResponseSchema.parse(result);
}

export function isChangePhoneApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function mapChangePhoneError(error: unknown): string {
  if (!isChangePhoneApiError(error)) {
    return 'خطا در ارتباط با سرور. دوباره تلاش کنید.';
  }

  if (error.code === 'AUTH_INVALID_CREDENTIALS') {
    return 'رمز عبور اشتباه است.';
  }

  if (error.code === 'AUTH_PHONE_CHANGE_EXPIRED') {
    return 'نشست تغییر شماره منقضی شده. از ابتدا شروع کنید.';
  }

  if (error.code === 'AUTH_PHONE_CHANGE_IN_PROGRESS') {
    return 'یک فرآیند تغییر شماره در حال انجام است. کمی صبر کنید یا دوباره تلاش کنید.';
  }

  if (error.code === 'PHONE_ALREADY_IN_USE') {
    return error.message || 'این شماره قبلاً ثبت شده است. با پشتیبانی تماس بگیرید.';
  }

  if (error.code === 'INVALID_PHONE') {
    return 'شماره موبایل نامعتبر است.';
  }

  if (
    error.code === 'AUTH_OTP_INVALID' ||
    error.code === 'AUTH_OTP_EXPIRED' ||
    error.code === 'AUTH_OTP_TOO_MANY_ATTEMPTS' ||
    error.code === 'AUTH_OTP_RATE_LIMITED'
  ) {
    return 'کد تأیید نامعتبر یا منقضی شده. دوباره تلاش کنید.';
  }

  if (error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED') {
    return 'دسترسی به این عملیات ندارید.';
  }

  return error.message || 'خطا در تغییر شماره موبایل.';
}
