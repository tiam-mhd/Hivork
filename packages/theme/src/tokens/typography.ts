import type { SurfaceTokens, TypographyTokens } from '@hivork/contracts/theme';

/** Startup typography — Vazirmatn (fa) + Sora (en) */
export const hivorkTypography: TypographyTokens = {
  fontFamilyFa: 'var(--font-vazirmatn), "Segoe UI", Tahoma, Arial, sans-serif',
  fontFamilyEn: 'var(--font-sora), "Segoe UI", ui-sans-serif, system-ui, sans-serif',
  fontFamilySans:
    'var(--font-vazirmatn), var(--font-sora), Tahoma, ui-sans-serif, system-ui, sans-serif',
  fontSizeBase: '0.9375rem',
  lineHeightBase: '1.6',
  letterSpacing: '-0.01em',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold: '600',
  fontFeatureSettings: '"ss01" on, "kern" on',
};

/** Airier typography for glass / bubble themes */
export const bubbleTypography: TypographyTokens = {
  fontFamilyFa: 'var(--font-vazirmatn), "Segoe UI", Tahoma, Arial, sans-serif',
  fontFamilyEn: 'var(--font-sora), "Segoe UI", ui-sans-serif, system-ui, sans-serif',
  fontFamilySans:
    'var(--font-vazirmatn), var(--font-sora), Tahoma, ui-sans-serif, system-ui, sans-serif',
  fontSizeBase: '1rem',
  lineHeightBase: '1.7',
  letterSpacing: '0',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold: '600',
  fontFeatureSettings: '"ss01" on, "kern" on',
};

export const solidSurface: SurfaceTokens = {
  style: 'solid',
  radius: '0.625rem',
  radiusSm: '0.375rem',
  radiusMd: '0.5rem',
  radiusLg: '0.625rem',
  radiusXl: '0.875rem',
  backdropBlur: '0px',
  surfaceOpacity: '1',
  borderOpacity: '1',
  shadowSoft: '0 1px 2px hsl(var(--foreground) / 0.04)',
  shadowCard: '0 12px 40px hsl(var(--foreground) / 0.08)',
  shellBackground: 'hsl(var(--layout-main-bg))',
};

export function glassSurface(shellBackground: string): SurfaceTokens {
  return {
    style: 'glass',
    radius: '1.5rem',
    radiusSm: '1rem',
    radiusMd: '1.25rem',
    radiusLg: '1.5rem',
    radiusXl: '2rem',
    backdropBlur: '20px',
    surfaceOpacity: '0.62',
    borderOpacity: '0.4',
    shadowSoft: '0 8px 32px hsl(var(--primary) / 0.1)',
    shadowCard:
      '0 16px 48px hsl(var(--foreground) / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.35)',
    shellBackground,
  };
}
