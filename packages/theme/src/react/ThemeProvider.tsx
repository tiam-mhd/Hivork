import type { ThemeColorMode, ThemeModePreference } from '@hivork/contracts/theme';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_THEME_ID, DEFAULT_THEME_MODE } from '../constants.js';
import {
  getSystemColorMode,
  persistThemeId,
  persistThemeMode,
  readThemeIdFromStorage,
  readThemeModeFromStorage,
  resolveEffectiveColorMode,
  resolveThemeId,
  resolveThemeModePreference,
} from '../core/persistence.js';
import { getThemeOrThrow, listThemes } from '../core/registry.js';
import { resolveThemeForMode } from '../core/resolver.js';
import { applyResolvedThemeToElement } from '../core/to-css-variables.js';
import type { ThemeContextValue } from './theme-context.js';

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialThemeId?: string;
  /** @deprecated Use initialThemeMode */
  initialColorMode?: ThemeColorMode;
  initialThemeMode?: ThemeModePreference;
};

export function ThemeProvider({
  children,
  initialThemeId,
  initialColorMode,
  initialThemeMode,
}: ThemeProviderProps) {
  const resolvedInitialThemeId = resolveThemeId(initialThemeId ?? readThemeIdFromStorage());
  const resolvedInitialThemeMode = resolveThemeModePreference(
    initialThemeMode ??
      (initialColorMode === 'light' || initialColorMode === 'dark' ? initialColorMode : undefined) ??
      readThemeModeFromStorage(),
  );

  const [themeId, setThemeIdState] = useState(resolvedInitialThemeId);
  const [themeMode, setThemeModeState] = useState<ThemeModePreference>(resolvedInitialThemeMode);
  const [systemColorMode, setSystemColorMode] = useState<ThemeColorMode>(() =>
    resolvedInitialThemeMode === 'system' ? getSystemColorMode() : resolveEffectiveColorMode(resolvedInitialThemeMode),
  );
  const [previewId, setPreviewId] = useState<string | null>(null);

  const activeThemeId = previewId ?? themeId;
  const colorMode = useMemo(
    () => (themeMode === 'system' ? systemColorMode : themeMode),
    [systemColorMode, themeMode],
  );
  const theme = useMemo(() => getThemeOrThrow(activeThemeId), [activeThemeId]);
  const resolvedTheme = useMemo(
    () => resolveThemeForMode(theme, colorMode),
    [colorMode, theme],
  );
  const themes = useMemo(() => listThemes(), []);

  const applyToDocument = useCallback((nextTheme: ReturnType<typeof resolveThemeForMode>) => {
    applyResolvedThemeToElement(document.documentElement, nextTheme);
  }, []);

  useLayoutEffect(() => {
    applyToDocument(resolvedTheme);
  }, [applyToDocument, resolvedTheme]);

  useLayoutEffect(() => {
    if (themeMode !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemColorMode(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [themeMode]);

  const setThemeId = useCallback(
    (id: string) => {
      const resolved = resolveThemeId(id);
      setPreviewId(null);
      setThemeIdState(resolved);
      persistThemeId(resolved);
      applyToDocument(resolveThemeForMode(getThemeOrThrow(resolved), colorMode));
    },
    [applyToDocument, colorMode],
  );

  const setThemeMode = useCallback(
    (mode: ThemeModePreference) => {
      const resolved = resolveThemeModePreference(mode);
      const effective = resolveEffectiveColorMode(resolved);
      setThemeModeState(resolved);
      if (resolved === 'system') {
        setSystemColorMode(getSystemColorMode());
      }
      persistThemeMode(resolved);
      applyToDocument(resolveThemeForMode(getThemeOrThrow(activeThemeId), effective));
    },
    [activeThemeId, applyToDocument],
  );

  /** @deprecated Use setThemeMode */
  const setColorMode = useCallback(
    (mode: ThemeColorMode) => {
      setThemeMode(mode);
    },
    [setThemeMode],
  );

  const previewThemeId = useCallback((id: string | null) => {
    if (id === null) {
      setPreviewId(null);
      return;
    }
    setPreviewId(resolveThemeId(id));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      themeMode,
      colorMode,
      theme,
      resolvedTheme,
      themes,
      setThemeId,
      setThemeMode,
      setColorMode,
      previewThemeId,
    }),
    [
      colorMode,
      previewThemeId,
      resolvedTheme,
      setColorMode,
      setThemeId,
      setThemeMode,
      theme,
      themeId,
      themeMode,
      themes,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

export { DEFAULT_THEME_ID, DEFAULT_THEME_MODE };
