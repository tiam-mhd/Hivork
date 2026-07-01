import {
  ChangeRequiredPasswordSchema,
  ChangeStaffPasswordSchema,
  ChangeStaffPasswordResponseSchema,
  ChangeRequiredPasswordResponseSchema,
  StaffAccountSecurityResponseSchema,
  type ChangeRequiredPasswordDto,
  type ChangeStaffPasswordDto,
  type StaffAccountSecurityResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export async function changeStaffPassword(input: ChangeStaffPasswordDto) {
  const payload = ChangeStaffPasswordSchema.parse(input);
  const result = await apiFetch<unknown>('/staff/me/password/change', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ChangeStaffPasswordResponseSchema.parse(result);
}

export async function changeRequiredPassword(input: ChangeRequiredPasswordDto) {
  const payload = ChangeRequiredPasswordSchema.parse(input);
  const result = await apiFetch<unknown>('/auth/password/change-required', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ChangeRequiredPasswordResponseSchema.parse(result);
}

export async function fetchAccountSecurity(): Promise<StaffAccountSecurityResponseDto> {
  const result = await apiFetch<unknown>('/staff/me/password/account-security');
  return StaffAccountSecurityResponseSchema.parse(result);
}

export function isChangePasswordApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
