import type { ThemeModeTokens } from '@hivork/contracts/theme';

import { createFormTokens } from '../../tokens/form-controls.js';

/** Hivork brand orange — #F28C28 */
export const BRAND_ORANGE = '30 87% 55%';

/** Warm cream — complements brand orange */
export const BRAND_CREAM = '33 100% 97%';

/** Near-black for text and dark surfaces */
export const BRAND_INK = '0 0% 7%';

/** Very dark gray surfaces — elevated cards in dark mode */
export const BRAND_SURFACE_DARK = '0 0% 14%';

const sharedLayoutStructure = {
  sidebar: { width: '15rem' as const },
  header: { height: '3.5rem' as const },
  main: { paddingX: '1.5rem' as const, paddingY: '1.5rem' as const },
  drawer: {
    overlay: '0 0% 0% / 0.45',
    width: 'min(18rem, 85vw)',
  },
};

export const baseLightMode: ThemeModeTokens = {
  form: createFormTokens('solid-light'),
  preview: {
    primary: BRAND_ORANGE,
    sidebar: '0 0% 100%',
    header: '0 0% 100%',
  },
  semantic: {
    background: BRAND_CREAM,
    foreground: BRAND_INK,
    card: '0 0% 100%',
    cardForeground: BRAND_INK,
    primary: BRAND_ORANGE,
    primaryForeground: '0 0% 100%',
    secondary: '30 25% 94%',
    secondaryForeground: BRAND_INK,
    muted: '30 20% 93%',
    mutedForeground: '0 0% 40%',
    accent: '30 90% 92%',
    accentForeground: '30 75% 32%',
    destructive: '0 72% 51%',
    destructiveForeground: '0 0% 100%',
    border: '30 15% 88%',
    input: '30 15% 88%',
    ring: BRAND_ORANGE,
    radius: '0.625rem',
  },
  layout: {
    sidebar: {
      ...sharedLayoutStructure.sidebar,
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '30 15% 88%',
      brandForeground: BRAND_INK,
      brandMutedForeground: '0 0% 40%',
      navItemDefault: '0 0% 40%',
      navItemHoverBackground: '30 25% 94%',
      navItemHoverForeground: BRAND_INK,
      navItemActiveBackground: '30 90% 92%',
      navItemActiveForeground: '30 75% 32%',
      groupBorder: '30 15% 88%',
    },
    header: {
      ...sharedLayoutStructure.header,
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '30 15% 88%',
      shadow: 'none',
      menuButtonBorder: '30 15% 88%',
      menuButtonHoverBackground: '30 20% 93%',
    },
    footer: {
      background: '0 0% 100%',
      foreground: '0 0% 45%',
      border: '30 15% 88%',
    },
    main: {
      background: BRAND_CREAM,
      ...sharedLayoutStructure.main,
    },
    breadcrumb: {
      text: '0 0% 40%',
      separator: '0 0% 65%',
      activeText: BRAND_INK,
      linkHoverText: BRAND_INK,
    },
    drawer: {
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '30 15% 88%',
      overlay: sharedLayoutStructure.drawer.overlay,
      shadow: '0 20px 25px -5px rgb(0 0 0 / 0.12)',
      width: sharedLayoutStructure.drawer.width,
      closeButtonHoverBackground: '30 20% 93%',
    },
    banner: {
      trialBackground: '30 90% 92%',
      trialForeground: '30 75% 32%',
      trialBorder: '30 80% 85%',
      suspendedBackground: '30 90% 92%',
      suspendedForeground: '30 75% 32%',
      suspendedBorder: '30 80% 85%',
      errorBackground: '0 86% 97%',
      errorForeground: '0 72% 51%',
      errorBorder: '0 93% 94%',
      successBackground: '152 76% 95%',
      successForeground: '160 84% 25%',
      successBorder: '152 76% 88%',
      infoBackground: '30 90% 94%',
      infoForeground: '30 75% 32%',
      infoBorder: '30 80% 88%',
    },
  },
};

export const baseDarkMode: ThemeModeTokens = {
  form: createFormTokens('solid-dark'),
  preview: {
    primary: BRAND_ORANGE,
    sidebar: '0 0% 7%',
    header: '0 0% 7%',
  },
  semantic: {
    background: '0 0% 5%',
    foreground: '0 0% 98%',
    card: BRAND_SURFACE_DARK,
    cardForeground: '0 0% 98%',
    primary: BRAND_ORANGE,
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 16%',
    secondaryForeground: '0 0% 98%',
    muted: '0 0% 14%',
    mutedForeground: '0 0% 72%',
    accent: '30 45% 18%',
    accentForeground: '30 92% 74%',
    destructive: '0 62% 50%',
    destructiveForeground: '0 0% 100%',
    border: '0 0% 22%',
    input: '0 0% 22%',
    ring: BRAND_ORANGE,
    radius: '0.625rem',
  },
  layout: {
    sidebar: {
      ...sharedLayoutStructure.sidebar,
      background: '0 0% 7%',
      foreground: '0 0% 96%',
      border: '0 0% 22%',
      brandForeground: '0 0% 100%',
      brandMutedForeground: '0 0% 72%',
      navItemDefault: '0 0% 72%',
      navItemHoverBackground: '0 0% 16%',
      navItemHoverForeground: '0 0% 98%',
      navItemActiveBackground: '30 45% 18%',
      navItemActiveForeground: '30 92% 74%',
      groupBorder: '0 0% 22%',
    },
    header: {
      ...sharedLayoutStructure.header,
      background: '0 0% 7%',
      foreground: '0 0% 98%',
      border: '0 0% 22%',
      shadow: '0 1px 3px rgb(0 0 0 / 0.35)',
      menuButtonBorder: '0 0% 18%',
      menuButtonHoverBackground: '0 0% 14%',
    },
    footer: {
      background: '0 0% 7%',
      foreground: '0 0% 65%',
      border: '0 0% 22%',
    },
    main: {
      background: '0 0% 5%',
      ...sharedLayoutStructure.main,
    },
    breadcrumb: {
      text: '0 0% 72%',
      separator: '0 0% 38%',
      activeText: '0 0% 98%',
      linkHoverText: '0 0% 100%',
    },
    drawer: {
      background: BRAND_SURFACE_DARK,
      foreground: '0 0% 98%',
      border: '0 0% 22%',
      overlay: sharedLayoutStructure.drawer.overlay,
      shadow: '0 24px 48px -12px rgb(0 0 0 / 0.6)',
      width: sharedLayoutStructure.drawer.width,
      closeButtonHoverBackground: '0 0% 14%',
    },
    banner: {
      trialBackground: '30 45% 16%',
      trialForeground: '30 90% 72%',
      trialBorder: '30 40% 22%',
      suspendedBackground: '30 45% 16%',
      suspendedForeground: '30 90% 72%',
      suspendedBorder: '30 40% 22%',
      errorBackground: '0 45% 14%',
      errorForeground: '0 90% 72%',
      errorBorder: '0 40% 22%',
      successBackground: '152 35% 14%',
      successForeground: '152 70% 68%',
      successBorder: '152 30% 22%',
      infoBackground: '30 40% 14%',
      infoForeground: '30 90% 72%',
      infoBorder: '30 35% 22%',
    },
  },
};
