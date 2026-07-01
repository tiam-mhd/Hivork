import {
  GetSecuritySettingsResponseSchema,
  UpdateSecuritySettingsSchema,
  type SecuritySettingsDto,
  type UpdateSecuritySettingsDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export const IP_ALLOWLIST_SETTINGS_PERMISSION = 'core.settings.edit';

export async function fetchTenantSecuritySettings(): Promise<SecuritySettingsDto> {
  const result = await apiFetch<{ data: { security: SecuritySettingsDto } }>('/settings/security');
  return GetSecuritySettingsResponseSchema.parse(result).data.security;
}

export async function patchTenantSecuritySettings(patch: UpdateSecuritySettingsDto) {
  const payload = UpdateSecuritySettingsSchema.parse(patch);
  const result = await apiFetch<{ data: { security: SecuritySettingsDto } }>('/settings/security', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return GetSecuritySettingsResponseSchema.parse(result).data.security;
}

export function isSecuritySettingsApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
