import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  getSystemColorMode,
  readThemeModeFromStorage,
  resolveEffectiveColorMode,
  resolveThemeModePreference,
} from './persistence.js';
import { THEME_MODE_STORAGE_KEY } from '../constants.js';

describe('theme mode persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: {
        store: {} as Record<string, string>,
        getItem(key: string) {
          return this.store[key] ?? null;
        },
        setItem(key: string, value: string) {
          this.store[key] = value;
        },
      },
      matchMedia: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves system preference from matchMedia', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as never);

    expect(getSystemColorMode()).toBe('dark');
    expect(resolveEffectiveColorMode('system')).toBe('dark');
  });

  it('defaults unknown values to system', () => {
    expect(resolveThemeModePreference('invalid')).toBe('system');
  });

  it('reads theme mode from localStorage', () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark');
    expect(readThemeModeFromStorage()).toBe('dark');
  });
});
