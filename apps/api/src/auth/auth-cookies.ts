import type { AuthActor } from '@hivork/application';
import type { Response } from 'express';

import { AppConfigService } from '../config/app-config.service';

export const STAFF_REFRESH_COOKIE = 'hivork_staff_refresh';
export const CUSTOMER_REFRESH_COOKIE = 'hivork_customer_refresh';

export function refreshCookieName(actor: AuthActor): string {
  return actor === 'staff' ? STAFF_REFRESH_COOKIE : CUSTOMER_REFRESH_COOKIE;
}

export type RefreshCookieOptions = {
  rememberMe?: boolean;
};

export function setRefreshCookie(
  res: Response,
  config: AppConfigService,
  actor: AuthActor,
  token: string,
  options?: RefreshCookieOptions,
): void {
  res.cookie(refreshCookieName(actor), token, refreshCookieOptions(config, options?.rememberMe ?? false));
}

export function clearRefreshCookie(res: Response, actor: AuthActor): void {
  res.clearCookie(refreshCookieName(actor), {
    path: '/api/v1/auth',
  });
}

function refreshCookieOptions(config: AppConfigService, rememberMe: boolean) {
  const maxAgeSeconds = rememberMe
    ? config.jwtRefreshTtlSeconds
    : config.jwtRefreshSessionTtlSeconds;

  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds * 1_000,
    path: '/api/v1/auth',
  };
}
