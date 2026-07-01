import type { ThemeColorMode } from '@hivork/contracts/theme';

import {
  COLOR_MODE_COOKIE_NAME,
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
} from '../constants.js';
import { isRegisteredThemeId } from './registry.js';

export function resolveThemeId(candidate: string | null | undefined): string {
  if (candidate && isRegisteredThemeId(candidate)) {
    return candidate;
  }
  return DEFAULT_THEME_ID;
}

export function resolveColorMode(candidate: string | null | undefined): ThemeColorMode {
  if (candidate === 'light' || candidate === 'dark') {
    return candidate;
  }
  return DEFAULT_COLOR_MODE;
}

export function readThemeIdFromStorage(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return resolveThemeId(stored);
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function readColorModeFromStorage(): ThemeColorMode {
  if (typeof window === 'undefined') {
    return DEFAULT_COLOR_MODE;
  }

  try {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    return resolveColorMode(stored);
  } catch {
    return DEFAULT_COLOR_MODE;
  }
}

export function readThemeIdFromCookie(cookieHeader: string | undefined): string {
  if (!cookieHeader) {
    return DEFAULT_THEME_ID;
  }

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));

  if (!match) {
    return DEFAULT_THEME_ID;
  }

  const value = decodeURIComponent(match.slice(THEME_COOKIE_NAME.length + 1));
  return resolveThemeId(value);
}

export function readColorModeFromCookie(cookieHeader: string | undefined): ThemeColorMode {
  if (!cookieHeader) {
    return DEFAULT_COLOR_MODE;
  }

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COLOR_MODE_COOKIE_NAME}=`));

  if (!match) {
    return DEFAULT_COLOR_MODE;
  }

  const value = decodeURIComponent(match.slice(COLOR_MODE_COOKIE_NAME.length + 1));
  return resolveColorMode(value);
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${THEME_COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
}

export function persistThemeId(themeId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const resolved = resolveThemeId(themeId);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch {
    // localStorage may be unavailable in private mode
  }

  writeCookie(THEME_COOKIE_NAME, resolved);
}

export function persistColorMode(colorMode: ThemeColorMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  const resolved = resolveColorMode(colorMode);

  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, resolved);
  } catch {
    // localStorage may be unavailable in private mode
  }

  writeCookie(COLOR_MODE_COOKIE_NAME, resolved);
}

export function persistThemePreferences(themeId: string, colorMode: ThemeColorMode): void {
  persistThemeId(themeId);
  persistColorMode(colorMode);
}
