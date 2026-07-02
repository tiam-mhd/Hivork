import { z } from 'zod';

/** HSL components without `hsl()` wrapper — e.g. `210 25% 97%` */
export const HslColorTokenSchema = z
  .string()
  .regex(/^\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%$/);

export const SemanticTokensSchema = z.object({
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  card: HslColorTokenSchema,
  cardForeground: HslColorTokenSchema,
  primary: HslColorTokenSchema,
  primaryForeground: HslColorTokenSchema,
  secondary: HslColorTokenSchema,
  secondaryForeground: HslColorTokenSchema,
  muted: HslColorTokenSchema,
  mutedForeground: HslColorTokenSchema,
  accent: HslColorTokenSchema,
  accentForeground: HslColorTokenSchema,
  destructive: HslColorTokenSchema,
  destructiveForeground: HslColorTokenSchema,
  border: HslColorTokenSchema,
  input: HslColorTokenSchema,
  ring: HslColorTokenSchema,
  radius: z.string().min(1),
});

export const LayoutSidebarTokensSchema = z.object({
  width: z.string().min(1),
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  border: HslColorTokenSchema,
  brandForeground: HslColorTokenSchema,
  brandMutedForeground: HslColorTokenSchema,
  navItemDefault: HslColorTokenSchema,
  navItemHoverBackground: HslColorTokenSchema,
  navItemHoverForeground: HslColorTokenSchema,
  navItemActiveBackground: HslColorTokenSchema,
  navItemActiveForeground: HslColorTokenSchema,
  groupBorder: HslColorTokenSchema,
});

export const LayoutHeaderTokensSchema = z.object({
  height: z.string().min(1),
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  border: HslColorTokenSchema,
  shadow: z.string(),
  menuButtonBorder: HslColorTokenSchema,
  menuButtonHoverBackground: HslColorTokenSchema,
});

export const LayoutFooterTokensSchema = z.object({
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  border: HslColorTokenSchema,
});

export const LayoutMainTokensSchema = z.object({
  background: HslColorTokenSchema,
  paddingX: z.string().min(1),
  paddingY: z.string().min(1),
});

export const LayoutBreadcrumbTokensSchema = z.object({
  text: HslColorTokenSchema,
  separator: HslColorTokenSchema,
  activeText: HslColorTokenSchema,
  linkHoverText: HslColorTokenSchema,
});

export const LayoutDrawerTokensSchema = z.object({
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  border: HslColorTokenSchema,
  overlay: z.string().min(1),
  shadow: z.string(),
  width: z.string().min(1),
  closeButtonHoverBackground: HslColorTokenSchema,
});

export const LayoutBannerTokensSchema = z.object({
  trialBackground: HslColorTokenSchema,
  trialForeground: HslColorTokenSchema,
  trialBorder: HslColorTokenSchema,
  suspendedBackground: HslColorTokenSchema,
  suspendedForeground: HslColorTokenSchema,
  suspendedBorder: HslColorTokenSchema,
  errorBackground: HslColorTokenSchema,
  errorForeground: HslColorTokenSchema,
  errorBorder: HslColorTokenSchema,
  successBackground: HslColorTokenSchema,
  successForeground: HslColorTokenSchema,
  successBorder: HslColorTokenSchema,
  infoBackground: HslColorTokenSchema,
  infoForeground: HslColorTokenSchema,
  infoBorder: HslColorTokenSchema,
});

export const LayoutTokensSchema = z.object({
  sidebar: LayoutSidebarTokensSchema,
  header: LayoutHeaderTokensSchema,
  footer: LayoutFooterTokensSchema,
  main: LayoutMainTokensSchema,
  breadcrumb: LayoutBreadcrumbTokensSchema,
  drawer: LayoutDrawerTokensSchema,
  banner: LayoutBannerTokensSchema,
});

export const ThemePreviewSchema = z.object({
  primary: HslColorTokenSchema,
  sidebar: HslColorTokenSchema,
  header: HslColorTokenSchema,
});

export const ThemeColorModeSchema = z.enum(['light', 'dark']);

/** User preference — `system` follows OS via `prefers-color-scheme` */
export const ThemeModePreferenceSchema = z.enum(['light', 'dark', 'system']);

export const FormControlTokensSchema = z.object({
  background: HslColorTokenSchema,
  foreground: HslColorTokenSchema,
  border: HslColorTokenSchema,
  borderHover: HslColorTokenSchema,
  borderFocus: HslColorTokenSchema,
  ring: HslColorTokenSchema,
  placeholder: HslColorTokenSchema,
  shadow: z.string(),
  shadowHover: z.string(),
  shadowFocus: z.string(),
  disabledBackground: HslColorTokenSchema,
  disabledForeground: HslColorTokenSchema,
  checkboxBackground: HslColorTokenSchema,
  checkboxBorder: HslColorTokenSchema,
  checkboxCheckedBackground: HslColorTokenSchema,
  checkboxCheckedForeground: HslColorTokenSchema,
  switchTrack: HslColorTokenSchema,
  switchTrackChecked: HslColorTokenSchema,
  switchThumb: HslColorTokenSchema,
});

export const ThemeModeTokensSchema = z.object({
  semantic: SemanticTokensSchema,
  layout: LayoutTokensSchema,
  preview: ThemePreviewSchema,
  form: FormControlTokensSchema,
  /** Overrides `surface.shellBackground` for this color mode */
  shellBackground: z.string().min(1).optional(),
});

export const TypographyTokensSchema = z.object({
  /** Persian / Arabic script stack */
  fontFamilyFa: z.string().min(1),
  /** Latin / English stack */
  fontFamilyEn: z.string().min(1),
  /** Combined body stack (RTL-first) */
  fontFamilySans: z.string().min(1),
  fontSizeBase: z.string().min(1),
  lineHeightBase: z.string().min(1),
  letterSpacing: z.string(),
  fontWeightNormal: z.string().min(1),
  fontWeightMedium: z.string().min(1),
  fontWeightBold: z.string().min(1),
  fontFeatureSettings: z.string(),
});

export const ThemeSurfaceStyleSchema = z.enum(['solid', 'glass']);

export const SurfaceTokensSchema = z.object({
  style: ThemeSurfaceStyleSchema,
  radius: z.string().min(1),
  radiusSm: z.string().min(1),
  radiusMd: z.string().min(1),
  radiusLg: z.string().min(1),
  radiusXl: z.string().min(1),
  backdropBlur: z.string().min(1),
  /** 0–1 opacity applied to glass surfaces */
  surfaceOpacity: z.string().min(1),
  borderOpacity: z.string().min(1),
  shadowSoft: z.string(),
  shadowCard: z.string(),
  /** Full CSS `background` for the app shell */
  shellBackground: z.string().min(1),
});

export const ThemeLayoutVariantSchema = z.enum([
  'sidebar-classic',
  'sidebar-compact',
  'sidebar-wide',
]);

export const ThemeDensitySchema = z.enum(['comfortable', 'compact']);

export const ThemeHeaderStyleSchema = z.enum(['flat', 'elevated']);

export const ThemeSidebarStyleSchema = z.enum(['filled', 'transparent', 'accent-rail']);

export const ThemeDefinitionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().min(1),
  modes: z.object({
    light: ThemeModeTokensSchema,
    dark: ThemeModeTokensSchema,
  }),
  typography: TypographyTokensSchema,
  surface: SurfaceTokensSchema,
  layoutVariant: ThemeLayoutVariantSchema,
  density: ThemeDensitySchema,
  headerStyle: ThemeHeaderStyleSchema,
  sidebarStyle: ThemeSidebarStyleSchema,
});

export const ThemeIdSchema = z.string().min(1).regex(/^[a-z][a-z0-9-]*$/);

export type HslColorToken = z.infer<typeof HslColorTokenSchema>;
export type SemanticTokens = z.infer<typeof SemanticTokensSchema>;
export type LayoutSidebarTokens = z.infer<typeof LayoutSidebarTokensSchema>;
export type LayoutHeaderTokens = z.infer<typeof LayoutHeaderTokensSchema>;
export type LayoutFooterTokens = z.infer<typeof LayoutFooterTokensSchema>;
export type LayoutMainTokens = z.infer<typeof LayoutMainTokensSchema>;
export type LayoutBreadcrumbTokens = z.infer<typeof LayoutBreadcrumbTokensSchema>;
export type LayoutDrawerTokens = z.infer<typeof LayoutDrawerTokensSchema>;
export type LayoutBannerTokens = z.infer<typeof LayoutBannerTokensSchema>;
export type LayoutTokens = z.infer<typeof LayoutTokensSchema>;
export type ThemePreview = z.infer<typeof ThemePreviewSchema>;
export type ThemeColorMode = z.infer<typeof ThemeColorModeSchema>;
export type ThemeModePreference = z.infer<typeof ThemeModePreferenceSchema>;
export type FormControlTokens = z.infer<typeof FormControlTokensSchema>;
export type ThemeModeTokens = z.infer<typeof ThemeModeTokensSchema>;
export type TypographyTokens = z.infer<typeof TypographyTokensSchema>;
export type ThemeSurfaceStyle = z.infer<typeof ThemeSurfaceStyleSchema>;
export type SurfaceTokens = z.infer<typeof SurfaceTokensSchema>;
export type ThemeLayoutVariant = z.infer<typeof ThemeLayoutVariantSchema>;
export type ThemeDensity = z.infer<typeof ThemeDensitySchema>;
export type ThemeHeaderStyle = z.infer<typeof ThemeHeaderStyleSchema>;
export type ThemeSidebarStyle = z.infer<typeof ThemeSidebarStyleSchema>;
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;
export type ThemeId = z.infer<typeof ThemeIdSchema>;

/** Runtime tokens after resolving theme + color mode */
export type ResolvedTheme = {
  id: string;
  name: string;
  description: string;
  version: string;
  colorMode: ThemeColorMode;
  semantic: SemanticTokens;
  layout: LayoutTokens;
  form: FormControlTokens;
  preview: ThemePreview;
  typography: TypographyTokens;
  surface: SurfaceTokens;
  layoutVariant: ThemeLayoutVariant;
  density: ThemeDensity;
  headerStyle: ThemeHeaderStyle;
  sidebarStyle: ThemeSidebarStyle;
};
