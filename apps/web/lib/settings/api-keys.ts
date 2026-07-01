import {
  CreateTenantApiKeyResponseSchema,
  ListTenantApiKeysResponseSchema,
  RevokeTenantApiKeyResponseSchema,
  type CreateTenantApiKeyDto,
  type CreateTenantApiKeyResponseDto,
  type ListTenantApiKeysQueryDto,
  type ListTenantApiKeysResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export const API_KEY_VIEW_PERMISSION = 'core.security.apikey.view';
export const API_KEY_CREATE_PERMISSION = 'core.security.apikey.create';
export const API_KEY_REVOKE_PERMISSION = 'core.security.apikey.revoke';

export async function fetchTenantApiKeys(
  query?: ListTenantApiKeysQueryDto,
): Promise<ListTenantApiKeysResponseDto> {
  const params = new URLSearchParams();
  if (query?.cursor) {
    params.set('cursor', query.cursor);
  }
  if (query?.limit) {
    params.set('limit', String(query.limit));
  }
  if (query?.status) {
    params.set('status', query.status);
  }
  const qs = params.toString();
  const result = await apiFetch<unknown>(`/settings/api-keys${qs ? `?${qs}` : ''}`);
  return ListTenantApiKeysResponseSchema.parse(result);
}

export async function createTenantApiKey(
  input: CreateTenantApiKeyDto,
): Promise<CreateTenantApiKeyResponseDto> {
  const result = await apiFetch<unknown>('/settings/api-keys', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return CreateTenantApiKeyResponseSchema.parse(result);
}

export async function revokeTenantApiKey(id: string) {
  const result = await apiFetch<unknown>(`/settings/api-keys/${id}`, {
    method: 'DELETE',
  });
  return RevokeTenantApiKeyResponseSchema.parse(result);
}

export function isApiKeysApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
