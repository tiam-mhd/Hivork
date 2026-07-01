import {
  StaffLastLoginResponseSchema,
  type StaffLastLoginResponseDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export async function fetchStaffLastLogin(): Promise<StaffLastLoginResponseDto> {
  const result = await apiFetch<unknown>('/staff/me/security/last-login');
  return StaffLastLoginResponseSchema.parse(result);
}

export function isStaffLastLoginApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
