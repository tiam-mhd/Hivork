import { ThemeDefinitionSchema, type ThemeDefinition } from '@hivork/contracts/theme';

import { baseTheme } from '../themes/base/index.js';
import { bubbleSpaceTheme } from '../themes/bubble-space/index.js';

const themes = new Map<string, ThemeDefinition>();

function registerThemeInternal(theme: ThemeDefinition): void {
  const parsed = ThemeDefinitionSchema.parse(theme);
  themes.set(parsed.id, parsed);
}

registerThemeInternal(baseTheme);
registerThemeInternal(bubbleSpaceTheme);

export function registerTheme(theme: ThemeDefinition): void {
  registerThemeInternal(theme);
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.get(id);
}

export function getThemeOrThrow(id: string): ThemeDefinition {
  const theme = themes.get(id);
  if (!theme) {
    throw new Error(`Theme not found: ${id}`);
  }
  return theme;
}

export function listThemes(): ThemeDefinition[] {
  return [...themes.values()];
}

export function isRegisteredThemeId(id: string): boolean {
  return themes.has(id);
}
