import type { FormControlTokens } from '@hivork/contracts/theme';

import { BRAND_INK, BRAND_ORANGE } from '../themes/base/tokens.js';

export type FormPreset = 'solid-light' | 'solid-dark' | 'glass-light' | 'glass-dark';

export function createFormTokens(preset: FormPreset): FormControlTokens {
  switch (preset) {
    case 'solid-light':
      return {
        background: '0 0% 100%',
        foreground: BRAND_INK,
        border: '30 16% 80%',
        borderHover: '30 35% 68%',
        borderFocus: BRAND_ORANGE,
        ring: BRAND_ORANGE,
        placeholder: '0 0% 52%',
        shadow: '0 1px 2px hsl(0 0% 0% / 0.04)',
        shadowHover: '0 4px 14px hsl(30 87% 55% / 0.1)',
        shadowFocus: '0 0 0 3px hsl(30 87% 55% / 0.22), 0 4px 16px hsl(30 87% 55% / 0.12)',
        disabledBackground: '30 15% 94%',
        disabledForeground: '0 0% 55%',
        checkboxBackground: '0 0% 100%',
        checkboxBorder: '30 16% 76%',
        checkboxCheckedBackground: BRAND_ORANGE,
        checkboxCheckedForeground: '0 0% 100%',
        switchTrack: '30 14% 86%',
        switchTrackChecked: BRAND_ORANGE,
        switchThumb: '0 0% 100%',
      };
    case 'solid-dark':
      return {
        background: '0 0% 13%',
        foreground: '0 0% 98%',
        border: '0 0% 26%',
        borderHover: '30 28% 42%',
        borderFocus: BRAND_ORANGE,
        ring: BRAND_ORANGE,
        placeholder: '0 0% 58%',
        shadow: '0 1px 2px hsl(0 0% 0% / 0.35)',
        shadowHover: '0 4px 18px hsl(30 87% 55% / 0.15)',
        shadowFocus: '0 0 0 3px hsl(30 87% 55% / 0.28), 0 4px 20px hsl(30 87% 55% / 0.18)',
        disabledBackground: '0 0% 10%',
        disabledForeground: '0 0% 50%',
        checkboxBackground: '0 0% 13%',
        checkboxBorder: '0 0% 30%',
        checkboxCheckedBackground: BRAND_ORANGE,
        checkboxCheckedForeground: '0 0% 100%',
        switchTrack: '0 0% 22%',
        switchTrackChecked: BRAND_ORANGE,
        switchThumb: '0 0% 98%',
      };
    case 'glass-light':
      return {
        background: '0 0% 100%',
        foreground: BRAND_INK,
        border: '270 22% 82%',
        borderHover: '270 35% 70%',
        borderFocus: BRAND_ORANGE,
        ring: BRAND_ORANGE,
        placeholder: '0 0% 50%',
        shadow: '0 2px 8px hsl(270 40% 50% / 0.08)',
        shadowHover: '0 8px 24px hsl(270 50% 50% / 0.14)',
        shadowFocus: '0 0 0 3px hsl(30 87% 55% / 0.2), 0 8px 28px hsl(270 50% 50% / 0.16)',
        disabledBackground: '250 30% 94%',
        disabledForeground: '0 0% 52%',
        checkboxBackground: '0 0% 100%',
        checkboxBorder: '270 20% 78%',
        checkboxCheckedBackground: BRAND_ORANGE,
        checkboxCheckedForeground: '0 0% 100%',
        switchTrack: '270 18% 86%',
        switchTrackChecked: BRAND_ORANGE,
        switchThumb: '0 0% 100%',
      };
    case 'glass-dark':
      return {
        background: '240 20% 12%',
        foreground: '0 0% 96%',
        border: '240 15% 26%',
        borderHover: '270 30% 40%',
        borderFocus: BRAND_ORANGE,
        ring: BRAND_ORANGE,
        placeholder: '0 0% 50%',
        shadow: '0 2px 10px hsl(0 0% 0% / 0.4)',
        shadowHover: '0 8px 28px hsl(270 50% 30% / 0.35)',
        shadowFocus: '0 0 0 3px hsl(30 87% 55% / 0.3), 0 8px 32px hsl(270 50% 30% / 0.25)',
        disabledBackground: '240 18% 8%',
        disabledForeground: '0 0% 40%',
        checkboxBackground: '240 20% 12%',
        checkboxBorder: '240 14% 32%',
        checkboxCheckedBackground: BRAND_ORANGE,
        checkboxCheckedForeground: '0 0% 100%',
        switchTrack: '240 12% 24%',
        switchTrackChecked: BRAND_ORANGE,
        switchThumb: '0 0% 98%',
      };
  }
}
