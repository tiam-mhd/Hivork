import {
  StaffMfaStatusResponseSchema,
  TotpDisableSchema,
  TotpRegenerateBackupCodesSchema,
  TotpSetupResponseSchema,
  TotpVerifySetupResponseSchema,
  TotpVerifySetupSchema,
  type StaffMfaStatusResponseDto,
  type TotpDisableDto,
  type TotpRegenerateBackupCodesDto,
  type TotpSetupResponseDto,
  type TotpVerifySetupDto,
  type TotpVerifySetupResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export async function fetchMfaStatus(): Promise<StaffMfaStatusResponseDto> {
  const result = await apiFetch<unknown>('/staff/me/mfa/status');
  return StaffMfaStatusResponseSchema.parse(result);
}

export async function setupTotp(): Promise<TotpSetupResponseDto> {
  const result = await apiFetch<unknown>('/staff/me/mfa/totp/setup', { method: 'POST' });
  return TotpSetupResponseSchema.parse(result);
}

export async function verifyTotpSetup(input: TotpVerifySetupDto): Promise<TotpVerifySetupResponseDto> {
  const payload = TotpVerifySetupSchema.parse(input);
  const result = await apiFetch<unknown>('/staff/me/mfa/totp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return TotpVerifySetupResponseSchema.parse(result);
}

export async function disableTotp(input: TotpDisableDto) {
  const payload = TotpDisableSchema.parse(input);
  return apiFetch<{ success: true }>('/staff/me/mfa/totp', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export async function regenerateTotpBackupCodes(input: TotpRegenerateBackupCodesDto) {
  const payload = TotpRegenerateBackupCodesSchema.parse(input);
  return apiFetch<{ backupCodes: string[] }>('/staff/me/mfa/totp/backup-codes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function isMfaSettingsApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
