'use client';

import type { ResolvedTheme, ThemeColorMode, ThemeDefinition } from '@hivork/contracts/theme';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DEFAULT_COLOR_MODE, DEFAULT_THEME_ID } from '../constants.js';
import {
  persistColorMode,
  persistThemeId,
  readColorModeFromStorage,
  readThemeIdFromStorage,
  resolveColorMode,
  resolveThemeId,
} from '../core/persistence.js';
import { getThemeOrThrow, listThemes } from '../core/registry.js';
import { resolveThemeForMode } from '../core/resolver.js';
import { applyResolvedThemeToElement } from '../core/to-css-variables.js';

type ThemeContextValue = {
  themeId: string;
  colorMode: ThemeColorMode;
  theme: ThemeDefinition;
  resolvedTheme: ResolvedTheme;
  themes: ThemeDefinition[];
  setThemeId: (id: string) => void;
  setColorMode: (mode: ThemeColorMode) => void;
  previewThemeId: (id: string | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialThemeId?: string;
  initialColorMode?: ThemeColorMode;
};

export function ThemeProvider({
  children,
  initialThemeId,
  initialColorMode,
}: ThemeProviderProps) {
  const resolvedInitialThemeId = resolveThemeId(initialThemeId ?? readThemeIdFromStorage());
  const resolvedInitialColorMode = resolveColorMode(
    initialColorMode ?? readColorModeFromStorage(),
  );

  const [themeId, setThemeIdState] = useState(resolvedInitialThemeId);
  const [colorMode, setColorModeState] = useState<ThemeColorMode>(resolvedInitialColorMode);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const activeThemeId = previewId ?? themeId;
  const theme = useMemo(() => getThemeOrThrow(activeThemeId), [activeThemeId]);
  const resolvedTheme = useMemo(
    () => resolveThemeForMode(theme, colorMode),
    [colorMode, theme],
  );
  const themes = useMemo(() => listThemes(), []);

  const applyToDocument = useCallback((nextTheme: ResolvedTheme) => {
    applyResolvedThemeToElement(document.documentElement, nextTheme);
  }, []);

  useLayoutEffect(() => {
    applyToDocument(resolvedTheme);
  }, [applyToDocument, resolvedTheme]);

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

  const setColorMode = useCallback(
    (mode: ThemeColorMode) => {
      const resolved = resolveColorMode(mode);
      setColorModeState(resolved);
      persistColorMode(resolved);
      applyToDocument(resolveThemeForMode(getThemeOrThrow(activeThemeId), resolved));
    },
    [activeThemeId, applyToDocument],
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
      colorMode,
      theme,
      resolvedTheme,
      themes,
      setThemeId,
      setColorMode,
      previewThemeId,
    }),
    [colorMode, previewThemeId, resolvedTheme, setColorMode, setThemeId, theme, themeId, themes],
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

export { DEFAULT_COLOR_MODE, DEFAULT_THEME_ID };
