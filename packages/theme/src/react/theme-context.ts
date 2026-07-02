import type { ResolvedTheme, ThemeColorMode, ThemeDefinition, ThemeModePreference } from '@hivork/contracts/theme';

export type ThemeContextValue = {
  themeId: string;
  themeMode: ThemeModePreference;
  colorMode: ThemeColorMode;
  theme: ThemeDefinition;
  resolvedTheme: ResolvedTheme;
  themes: ThemeDefinition[];
  setThemeId: (id: string) => void;
  setThemeMode: (mode: ThemeModePreference) => void;
  /** @deprecated Use setThemeMode */
  setColorMode: (mode: ThemeColorMode) => void;
  previewThemeId: (id: string | null) => void;
};
