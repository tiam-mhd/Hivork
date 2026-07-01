import { ApiErrorSchema, ErrorCodes, parseApiError, type ApiError } from '@hivork/contracts';

import { getDeviceIdHeader } from '../auth/device-id';
import { getAccessToken, getActiveBranchId } from '../auth/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiClientError extends Error implements ApiError {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function toApiClientError(
  body: unknown,
  fallbackMessage: string,
  httpStatus: number,
): ApiClientError {
  const parsed = parseApiError(body);
  if (parsed) {
    return new ApiClientError(parsed.code, parsed.message, httpStatus, parsed.details);
  }

  return new ApiClientError(ErrorCodes.INTERNAL_ERROR, fallbackMessage, httpStatus);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const branchId = getActiveBranchId();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getDeviceIdHeader(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId ? { 'X-Branch-Id': branchId } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw toApiClientError(body, response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { API_URL, ApiErrorSchema, ErrorCodes, type ApiError };
