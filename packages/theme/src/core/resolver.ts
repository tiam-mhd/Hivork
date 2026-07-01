import type { ThemeColorMode, ThemeDefinition, ResolvedTheme } from '@hivork/contracts/theme';

import { DEFAULT_COLOR_MODE } from '../constants.js';

export function resolveThemeForMode(
  theme: ThemeDefinition,
  colorMode: ThemeColorMode,
): ResolvedTheme {
  const modeTokens = theme.modes[colorMode];

  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    version: theme.version,
    colorMode,
    semantic: modeTokens.semantic,
    layout: modeTokens.layout,
    form: modeTokens.form,
    preview: modeTokens.preview,
    typography: theme.typography,
    surface: {
      ...theme.surface,
      shellBackground: modeTokens.shellBackground ?? theme.surface.shellBackground,
    },
    layoutVariant: theme.layoutVariant,
    density: theme.density,
    headerStyle: theme.headerStyle,
    sidebarStyle: theme.sidebarStyle,
  };
}

export function resolveThemeWithDefaults(
  theme: ThemeDefinition,
  colorMode?: ThemeColorMode | null,
): ResolvedTheme {
  return resolveThemeForMode(theme, colorMode ?? DEFAULT_COLOR_MODE);
}
