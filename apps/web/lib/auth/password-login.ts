import {
  ErrorCodes,
  PasswordLoginResponseSchema,
  PasswordLoginSchema,
  type PasswordLoginDto,
  type PasswordLoginResponseDto,
} from '@hivork/contracts';

import { getDeviceIdHeader } from './device-id';
import { API_URL, ApiClientError, toApiClientError } from '../api/client';

export type PasswordLoginInput = PasswordLoginDto;

export type PasswordLoginResult = PasswordLoginResponseDto;

export type PasswordLoginErrorCode =
  | typeof ErrorCodes.AUTH_INVALID_CREDENTIALS
  | typeof ErrorCodes.AUTH_ACCOUNT_LOCKED
  | typeof ErrorCodes.AUTH_LOGIN_RATE_LIMITED
  | 'NEED_TENANT_SLUG'
  | typeof ErrorCodes.STAFF_SUSPENDED
  | typeof ErrorCodes.TENANT_SUSPENDED
  | typeof ErrorCodes.VALIDATION_ERROR
  | typeof ErrorCodes.INTERNAL_ERROR;

export async function passwordLogin(input: PasswordLoginInput): Promise<PasswordLoginResult> {
  const payload = PasswordLoginSchema.parse(input);

  const response = await fetch(`${API_URL}/auth/password/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getDeviceIdHeader(),
    },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return PasswordLoginResponseSchema.parse(body);
  }

  if (response.status === 403 && isRecord(body) && body.code === 'AUTH_MUST_CHANGE_PASSWORD') {
    return {
      kind: 'must_change_password',
      changePasswordToken: String(body.changePasswordToken ?? ''),
      expiresIn: Number(body.expiresIn ?? 600),
    };
  }

  throw toApiClientError(body, 'خطا در ورود', response.status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isPasswordLoginApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
