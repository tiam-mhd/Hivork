import {
  ForgotPasswordRequestResponseSchema,
  ForgotPasswordRequestSchema,
  ForgotPasswordVerifyOtpResponseSchema,
  ForgotPasswordVerifyOtpSchema,
  ResetPasswordResponseSchema,
  ResetPasswordSchema,
  type ForgotPasswordRequestDto,
  type ForgotPasswordVerifyOtpDto,
  type ResetPasswordDto,
} from '@hivork/contracts';

import { API_URL, ApiClientError, toApiClientError } from '../api/client';

export async function requestForgotPassword(input: ForgotPasswordRequestDto) {
  const payload = ForgotPasswordRequestSchema.parse(input);

  const response = await fetch(`${API_URL}/auth/password/forgot/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiClientError(body, 'خطا در ارسال کد بازیابی', response.status);
  }

  return ForgotPasswordRequestResponseSchema.parse(body);
}

export async function verifyForgotPasswordOtp(input: ForgotPasswordVerifyOtpDto) {
  const payload = ForgotPasswordVerifyOtpSchema.parse(input);

  const response = await fetch(`${API_URL}/auth/password/forgot/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiClientError(body, 'خطا در تأیید کد', response.status);
  }

  return ForgotPasswordVerifyOtpResponseSchema.parse(body);
}

export async function resetPassword(input: ResetPasswordDto) {
  const payload = ResetPasswordSchema.parse(input);

  const response = await fetch(`${API_URL}/auth/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiClientError(body, 'خطا در تنظیم رمز جدید', response.status);
  }

  return ResetPasswordResponseSchema.parse(body);
}

export function isForgotPasswordApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
