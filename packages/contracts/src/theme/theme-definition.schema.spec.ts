import { describe, expect, it } from 'vitest';

import { ThemeDefinitionSchema } from './theme-definition.schema.js';

const minimalSemantic = {
  background: '33 100% 97%',
  foreground: '0 0% 7%',
  card: '0 0% 100%',
  cardForeground: '0 0% 7%',
  primary: '30 87% 55%',
  primaryForeground: '0 0% 100%',
  secondary: '30 25% 94%',
  secondaryForeground: '0 0% 7%',
  muted: '30 20% 93%',
  mutedForeground: '0 0% 40%',
  accent: '30 90% 92%',
  accentForeground: '30 75% 32%',
  destructive: '0 72% 51%',
  destructiveForeground: '0 0% 100%',
  border: '30 15% 88%',
  input: '30 15% 88%',
  ring: '30 87% 55%',
  radius: '0.625rem',
};

const minimalLayout = {
  sidebar: {
    width: '15rem',
    background: '0 0% 100%',
    foreground: '0 0% 7%',
    border: '30 15% 88%',
    brandForeground: '0 0% 7%',
    brandMutedForeground: '0 0% 40%',
    navItemDefault: '0 0% 40%',
    navItemHoverBackground: '30 25% 94%',
    navItemHoverForeground: '0 0% 7%',
    navItemActiveBackground: '30 90% 92%',
    navItemActiveForeground: '30 75% 32%',
    groupBorder: '30 15% 88%',
  },
  header: {
    height: '3.5rem',
    background: '0 0% 100%',
    foreground: '0 0% 7%',
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
    background: '33 100% 97%',
    paddingX: '1.5rem',
    paddingY: '1.5rem',
  },
  breadcrumb: {
    text: '0 0% 40%',
    separator: '0 0% 65%',
    activeText: '0 0% 7%',
    linkHoverText: '0 0% 7%',
  },
  drawer: {
    background: '0 0% 100%',
    foreground: '0 0% 7%',
    border: '30 15% 88%',
    overlay: '0 0% 0% / 0.4',
    shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    width: 'min(18rem, 85vw)',
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
};

const minimalForm = {
  background: '0 0% 100%',
  foreground: '0 0% 7%',
  border: '30 16% 80%',
  borderHover: '30 35% 68%',
  borderFocus: '30 87% 55%',
  ring: '30 87% 55%',
  placeholder: '0 0% 52%',
  shadow: 'none',
  shadowHover: 'none',
  shadowFocus: 'none',
  disabledBackground: '30 15% 94%',
  disabledForeground: '0 0% 55%',
  checkboxBackground: '0 0% 100%',
  checkboxBorder: '30 16% 76%',
  checkboxCheckedBackground: '30 87% 55%',
  checkboxCheckedForeground: '0 0% 100%',
  switchTrack: '30 14% 86%',
  switchTrackChecked: '30 87% 55%',
  switchThumb: '0 0% 100%',
};

const minimalMode = {
  semantic: minimalSemantic,
  layout: minimalLayout,
  form: minimalForm,
  preview: {
    primary: '30 87% 55%',
    sidebar: '0 0% 100%',
    header: '0 0% 100%',
  },
};

const minimalTypography = {
  fontFamilyFa: 'var(--font-vazirmatn), Tahoma, sans-serif',
  fontFamilyEn: 'var(--font-sora), sans-serif',
  fontFamilySans: 'var(--font-vazirmatn), var(--font-sora), sans-serif',
  fontSizeBase: '1rem',
  lineHeightBase: '1.6',
  letterSpacing: '0',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold: '700',
  fontFeatureSettings: '"ss01" on',
};

const minimalSurface = {
  style: 'solid' as const,
  radius: '0.625rem',
  radiusSm: '0.375rem',
  radiusMd: '0.5rem',
  radiusLg: '0.625rem',
  radiusXl: '0.875rem',
  backdropBlur: '0px',
  surfaceOpacity: '1',
  borderOpacity: '1',
  shadowSoft: 'none',
  shadowCard: 'none',
  shellBackground: 'hsl(var(--layout-main-bg))',
};

describe('ThemeDefinitionSchema', () => {
  it('accepts a valid theme definition with light and dark modes', () => {
    const result = ThemeDefinitionSchema.safeParse({
      id: 'base',
      name: 'Hivork',
      description: 'تم مرجع',
      version: '2.1.0',
      modes: {
        light: minimalMode,
        dark: {
          ...minimalMode,
          preview: {
            primary: '30 87% 55%',
            sidebar: '0 0% 7%',
            header: '0 0% 7%',
          },
        },
      },
      typography: minimalTypography,
      surface: minimalSurface,
      layoutVariant: 'sidebar-classic',
      density: 'comfortable',
      headerStyle: 'flat',
      sidebarStyle: 'filled',
    });

    expect(result.success).toBe(true);
  });

  it('rejects theme without typography', () => {
    const result = ThemeDefinitionSchema.safeParse({
      id: 'base',
      name: 'x',
      description: 'x',
      version: '1.0.0',
      modes: { light: minimalMode, dark: minimalMode },
      surface: minimalSurface,
      layoutVariant: 'sidebar-classic',
      density: 'comfortable',
      headerStyle: 'flat',
      sidebarStyle: 'filled',
    });

    expect(result.success).toBe(false);
  });

  it('rejects theme without both modes', () => {
    const result = ThemeDefinitionSchema.safeParse({
      id: 'base',
      name: 'x',
      description: 'x',
      version: '1.0.0',
      modes: { light: minimalMode },
      typography: minimalTypography,
      surface: minimalSurface,
      layoutVariant: 'sidebar-classic',
      density: 'comfortable',
      headerStyle: 'flat',
      sidebarStyle: 'filled',
    });

    expect(result.success).toBe(false);
  });
});
