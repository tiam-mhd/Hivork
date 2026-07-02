import type { ThemeColorMode, ThemeDefinition } from '@hivork/contracts/theme';

import { resolveThemeForMode } from '../core/resolver.js';
import { applyResolvedThemeToElement } from '../core/to-css-variables.js';

/** Apply semantic + layout tokens from a theme definition to the document root. */
export function applyThemeToDocument(theme: ThemeDefinition, mode: ThemeColorMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  const resolved = resolveThemeForMode(theme, mode);
  applyResolvedThemeToElement(document.documentElement, resolved);
}

export { applyResolvedThemeToElement, syncDocumentDarkClass } from '../core/to-css-variables.js';
