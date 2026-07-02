import type { ThemeColorMode, ThemeModePreference } from '@hivork/contracts/theme';

import {
  COLOR_MODE_COOKIE_NAME,
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  THEME_MODE_COOKIE_NAME,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../constants.js';
import { isRegisteredThemeId } from './registry.js';

export function getSystemColorMode(): ThemeColorMode {
  if (typeof window === 'undefined') {
    return DEFAULT_COLOR_MODE;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveEffectiveColorMode(preference: ThemeModePreference): ThemeColorMode {
  if (preference === 'system') {
    return getSystemColorMode();
  }

  return preference;
}

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

export function resolveThemeModePreference(candidate: string | null | undefined): ThemeModePreference {
  if (candidate === 'light' || candidate === 'dark' || candidate === 'system') {
    return candidate;
  }
  return DEFAULT_THEME_MODE;
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

export function hasUserThemeIdPreference(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function readThemeModeFromStorage(): ThemeModePreference {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_MODE;
  }

  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored) {
      return resolveThemeModePreference(stored);
    }

    const legacy = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      return legacy;
    }
  } catch {
    // localStorage may be unavailable in private mode
  }

  return DEFAULT_THEME_MODE;
}

/** @deprecated Use readThemeModeFromStorage */
export function readColorModeFromStorage(): ThemeColorMode {
  return resolveEffectiveColorMode(readThemeModeFromStorage());
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

function readCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(name.length + 1));
}

export function readThemeModeFromCookie(cookieHeader: string | undefined): ThemeModePreference {
  const mode = readCookieValue(cookieHeader, THEME_MODE_COOKIE_NAME);
  if (mode) {
    return resolveThemeModePreference(mode);
  }

  const legacy = readCookieValue(cookieHeader, COLOR_MODE_COOKIE_NAME);
  if (legacy === 'light' || legacy === 'dark') {
    return legacy;
  }

  return DEFAULT_THEME_MODE;
}

/** SSR-safe resolved color mode — `system` falls back to light on the server */
export function resolveColorModeForSsr(preference: ThemeModePreference): ThemeColorMode {
  if (preference === 'system') {
    return DEFAULT_COLOR_MODE;
  }

  return preference;
}

/** @deprecated Use readThemeModeFromCookie */
export function readColorModeFromCookie(cookieHeader: string | undefined): ThemeColorMode {
  return resolveColorModeForSsr(readThemeModeFromCookie(cookieHeader));
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

export function persistThemeMode(preference: ThemeModePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  const resolved = resolveThemeModePreference(preference);
  const effective = resolveEffectiveColorMode(resolved);

  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, resolved);
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, effective);
  } catch {
    // localStorage may be unavailable in private mode
  }

  writeCookie(THEME_MODE_COOKIE_NAME, resolved);
  writeCookie(COLOR_MODE_COOKIE_NAME, effective);
}

/** @deprecated Use persistThemeMode */
export function persistColorMode(colorMode: ThemeColorMode): void {
  persistThemeMode(colorMode);
}

export function persistThemePreferences(themeId: string, themeMode: ThemeModePreference): void {
  persistThemeId(themeId);
  persistThemeMode(themeMode);
}
