import {
  ListStaffSessionsResponseSchema,
  RevokeAllStaffSessionsSchema,
  type ListStaffSessionsQueryDto,
  type ListStaffSessionsResponseDto,
  type RevokeAllStaffSessionsDto,
} from '@hivork/contracts';

import { apiFetch, ApiClientError } from '../api/client';

export const STAFF_SESSION_MANAGE_PERMISSION = 'core.security.session.manage';

export async function fetchStaffSessions(
  query?: ListStaffSessionsQueryDto,
): Promise<ListStaffSessionsResponseDto> {
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
  const result = await apiFetch<unknown>(`/staff/me/sessions${qs ? `?${qs}` : ''}`);
  return ListStaffSessionsResponseSchema.parse(result);
}

export async function revokeStaffSession(sessionId: string) {
  return apiFetch<{ success: true; revokedCurrent?: boolean }>(
    `/staff/me/sessions/${sessionId}`,
    { method: 'DELETE' },
  );
}

export async function revokeAllStaffSessions(input: RevokeAllStaffSessionsDto = {}) {
  const payload = RevokeAllStaffSessionsSchema.parse(input);
  return apiFetch<{ revokedCount: number }>('/staff/me/sessions/revoke-all', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function isStaffSessionsApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
