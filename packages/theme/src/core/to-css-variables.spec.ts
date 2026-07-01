import { describe, expect, it } from 'vitest';

import { resolveThemeForMode } from './resolver.js';
import { baseTheme } from '../themes/base/index.js';
import { bubbleSpaceTheme } from '../themes/bubble-space/index.js';
import { resolvedThemeToCssVariables } from './to-css-variables.js';

describe('resolvedThemeToCssVariables', () => {
  it('maps Hivork brand light tokens to CSS custom properties', () => {
    const resolved = resolveThemeForMode(baseTheme, 'light');
    const vars = resolvedThemeToCssVariables(resolved);

    expect(vars['--background']).toBe('33 100% 97%');
    expect(vars['--primary']).toBe('30 87% 55%');
    expect(vars['--font-family-sans']).toContain('vazirmatn');
    expect(vars['--font-family-en']).toContain('sora');
    expect(vars['--form-control-border-focus']).toBe('30 87% 55%');
  });

  it('maps bubble-space glass tokens', () => {
    const resolved = resolveThemeForMode(bubbleSpaceTheme, 'light');
    const vars = resolvedThemeToCssVariables(resolved);

    expect(vars['--theme-surface-style']).toBe('glass');
    expect(vars['--radius']).toBe('1.5rem');
    expect(vars['--theme-backdrop-blur']).toBe('20px');
    expect(vars['--theme-shell-background']).toContain('radial-gradient');
  });

  it('uses per-mode shell background for bubble-space dark', () => {
    const resolved = resolveThemeForMode(bubbleSpaceTheme, 'dark');
    expect(resolved.surface.shellBackground).toContain('240 28% 6%');
  });
});
