import type { ThemeModeTokens } from '@hivork/contracts/theme';

import { createFormTokens } from '../../tokens/form-controls.js';
import { BRAND_INK, BRAND_ORANGE, BRAND_SURFACE_DARK } from '../base/tokens.js';

const BUBBLE_LIGHT_SHELL =
  'radial-gradient(ellipse 120% 90% at 0% -30%, hsl(270 55% 88% / 0.85), transparent),' +
  'radial-gradient(ellipse 90% 70% at 100% 0%, hsl(30 90% 82% / 0.55), transparent),' +
  'radial-gradient(ellipse 80% 60% at 50% 110%, hsl(220 70% 88% / 0.45), transparent),' +
  'radial-gradient(ellipse 60% 40% at 80% 60%, hsl(280 50% 92% / 0.35), transparent),' +
  'hsl(250 45% 97%)';

const BUBBLE_DARK_SHELL =
  'radial-gradient(ellipse 100% 80% at 10% -20%, hsl(270 55% 28% / 0.55), transparent),' +
  'radial-gradient(ellipse 80% 60% at 100% 10%, hsl(30 80% 42% / 0.18), transparent),' +
  'radial-gradient(ellipse 70% 50% at 50% 100%, hsl(240 60% 22% / 0.5), transparent),' +
  'radial-gradient(ellipse 50% 35% at 85% 55%, hsl(280 45% 20% / 0.35), transparent),' +
  'hsl(240 28% 6%)';

const spaciousLayout = {
  sidebar: { width: '17rem' as const },
  header: { height: '4rem' as const },
  main: { paddingX: '2rem' as const, paddingY: '2rem' as const },
  drawer: {
    overlay: '0 0% 0% / 0.35',
    width: 'min(20rem, 88vw)',
  },
};

export const bubbleSpaceLightMode: ThemeModeTokens = {
  shellBackground: BUBBLE_LIGHT_SHELL,
  form: createFormTokens('glass-light'),
  preview: {
    primary: BRAND_ORANGE,
    sidebar: '0 0% 100%',
    header: '0 0% 100%',
  },
  semantic: {
    background: '250 45% 97%',
    foreground: BRAND_INK,
    card: '0 0% 100%',
    cardForeground: BRAND_INK,
    primary: BRAND_ORANGE,
    primaryForeground: '0 0% 100%',
    secondary: '270 30% 94%',
    secondaryForeground: BRAND_INK,
    muted: '250 25% 93%',
    mutedForeground: '0 0% 42%',
    accent: '30 85% 90%',
    accentForeground: '30 70% 30%',
    destructive: '0 72% 51%',
    destructiveForeground: '0 0% 100%',
    border: '270 20% 88%',
    input: '270 18% 86%',
    ring: BRAND_ORANGE,
    radius: '1.5rem',
  },
  layout: {
    sidebar: {
      ...spaciousLayout.sidebar,
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '270 25% 88%',
      brandForeground: BRAND_INK,
      brandMutedForeground: '0 0% 45%',
      navItemDefault: '0 0% 42%',
      navItemHoverBackground: '270 30% 94%',
      navItemHoverForeground: BRAND_INK,
      navItemActiveBackground: '30 85% 90%',
      navItemActiveForeground: '30 70% 30%',
      groupBorder: '270 20% 90%',
    },
    header: {
      ...spaciousLayout.header,
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '270 22% 88%',
      shadow: '0 8px 32px hsl(270 40% 60% / 0.12)',
      menuButtonBorder: '270 20% 88%',
      menuButtonHoverBackground: '270 25% 94%',
    },
    footer: {
      background: '0 0% 100%',
      foreground: '0 0% 48%',
      border: '270 22% 88%',
    },
    main: {
      background: '250 45% 97%',
      ...spaciousLayout.main,
    },
    breadcrumb: {
      text: '0 0% 45%',
      separator: '0 0% 68%',
      activeText: BRAND_INK,
      linkHoverText: BRAND_INK,
    },
    drawer: {
      background: '0 0% 100%',
      foreground: BRAND_INK,
      border: '270 22% 88%',
      overlay: spaciousLayout.drawer.overlay,
      shadow: '0 24px 64px hsl(270 40% 40% / 0.18)',
      width: spaciousLayout.drawer.width,
      closeButtonHoverBackground: '270 25% 94%',
    },
    banner: {
      trialBackground: '30 85% 90%',
      trialForeground: '30 70% 30%',
      trialBorder: '30 75% 82%',
      suspendedBackground: '30 85% 90%',
      suspendedForeground: '30 70% 30%',
      suspendedBorder: '30 75% 82%',
      errorBackground: '0 86% 97%',
      errorForeground: '0 72% 51%',
      errorBorder: '0 93% 94%',
      successBackground: '152 76% 95%',
      successForeground: '160 84% 25%',
      successBorder: '152 76% 88%',
      infoBackground: '270 40% 94%',
      infoForeground: '270 50% 32%',
      infoBorder: '270 35% 88%',
    },
  },
};

export const bubbleSpaceDarkMode: ThemeModeTokens = {
  shellBackground: BUBBLE_DARK_SHELL,
  form: createFormTokens('glass-dark'),
  preview: {
    primary: BRAND_ORANGE,
    sidebar: '0 0% 9%',
    header: '0 0% 9%',
  },
  semantic: {
    background: '240 28% 6%',
    foreground: '0 0% 98%',
    card: '240 22% 14%',
    cardForeground: '0 0% 98%',
    primary: BRAND_ORANGE,
    primaryForeground: '0 0% 100%',
    secondary: '240 20% 16%',
    secondaryForeground: '0 0% 98%',
    muted: '240 18% 14%',
    mutedForeground: '0 0% 72%',
    accent: '30 45% 18%',
    accentForeground: '30 92% 74%',
    destructive: '0 62% 50%',
    destructiveForeground: '0 0% 100%',
    border: '240 15% 24%',
    input: '240 15% 24%',
    ring: BRAND_ORANGE,
    radius: '1.5rem',
  },
  layout: {
    sidebar: {
      ...spaciousLayout.sidebar,
      background: '0 0% 9%',
      foreground: '0 0% 96%',
      border: '240 15% 20%',
      brandForeground: '0 0% 100%',
      brandMutedForeground: '0 0% 72%',
      navItemDefault: '0 0% 72%',
      navItemHoverBackground: '240 20% 14%',
      navItemHoverForeground: '0 0% 96%',
      navItemActiveBackground: '30 45% 18%',
      navItemActiveForeground: '30 90% 72%',
      groupBorder: '240 15% 20%',
    },
    header: {
      ...spaciousLayout.header,
      background: '0 0% 9%',
      foreground: '0 0% 96%',
      border: '240 15% 20%',
      shadow: '0 8px 40px hsl(0 0% 0% / 0.45)',
      menuButtonBorder: '240 15% 22%',
      menuButtonHoverBackground: '240 20% 14%',
    },
    footer: {
      background: '0 0% 9%',
      foreground: '0 0% 55%',
      border: '240 15% 20%',
    },
    main: {
      background: '240 28% 6%',
      ...spaciousLayout.main,
    },
    breadcrumb: {
      text: '0 0% 72%',
      separator: '0 0% 38%',
      activeText: '0 0% 98%',
      linkHoverText: '0 0% 100%',
    },
    drawer: {
      background: BRAND_SURFACE_DARK,
      foreground: '0 0% 96%',
      border: '240 15% 22%',
      overlay: spaciousLayout.drawer.overlay,
      shadow: '0 28px 72px hsl(0 0% 0% / 0.65)',
      width: spaciousLayout.drawer.width,
      closeButtonHoverBackground: '240 20% 14%',
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
      infoBackground: '270 35% 16%',
      infoForeground: '270 70% 78%',
      infoBorder: '270 30% 22%',
    },
  },
};

export { BUBBLE_DARK_SHELL, BUBBLE_LIGHT_SHELL };
