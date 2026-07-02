import type { ResolvedTheme, ThemeColorMode } from '@hivork/contracts/theme';

export type CssVariableMap = Record<string, string>;

export function resolvedThemeToCssVariables(theme: ResolvedTheme): CssVariableMap {
  const { semantic, layout, typography, surface, form } = theme;

  return {
    '--background': semantic.background,
    '--foreground': semantic.foreground,
    '--card': semantic.card,
    '--card-foreground': semantic.cardForeground,
    '--primary': semantic.primary,
    '--primary-foreground': semantic.primaryForeground,
    '--secondary': semantic.secondary,
    '--secondary-foreground': semantic.secondaryForeground,
    '--muted': semantic.muted,
    '--muted-foreground': semantic.mutedForeground,
    '--accent': semantic.accent,
    '--accent-foreground': semantic.accentForeground,
    '--destructive': semantic.destructive,
    '--destructive-foreground': semantic.destructiveForeground,
    '--border': semantic.border,
    '--input': semantic.input,
    '--ring': semantic.ring,
    '--radius': semantic.radius,

    '--form-control-bg': form.background,
    '--form-control-fg': form.foreground,
    '--form-control-border': form.border,
    '--form-control-border-hover': form.borderHover,
    '--form-control-border-focus': form.borderFocus,
    '--form-control-ring': form.ring,
    '--form-control-placeholder': form.placeholder,
    '--form-control-shadow': form.shadow,
    '--form-control-shadow-hover': form.shadowHover,
    '--form-control-shadow-focus': form.shadowFocus,
    '--form-control-disabled-bg': form.disabledBackground,
    '--form-control-disabled-fg': form.disabledForeground,
    '--form-checkbox-bg': form.checkboxBackground,
    '--form-checkbox-border': form.checkboxBorder,
    '--form-checkbox-checked-bg': form.checkboxCheckedBackground,
    '--form-checkbox-checked-fg': form.checkboxCheckedForeground,
    '--form-switch-track': form.switchTrack,
    '--form-switch-track-checked': form.switchTrackChecked,
    '--form-switch-thumb': form.switchThumb,

    '--font-family-fa': typography.fontFamilyFa,
    '--font-family-en': typography.fontFamilyEn,
    '--font-family-sans': typography.fontFamilySans,
    '--font-size-base': typography.fontSizeBase,
    '--line-height-base': typography.lineHeightBase,
    '--letter-spacing-base': typography.letterSpacing,
    '--font-weight-normal': typography.fontWeightNormal,
    '--font-weight-medium': typography.fontWeightMedium,
    '--font-weight-bold': typography.fontWeightBold,
    '--font-feature-settings': typography.fontFeatureSettings,

    '--theme-surface-style': surface.style,
    '--theme-radius-sm': surface.radiusSm,
    '--theme-radius-md': surface.radiusMd,
    '--theme-radius-lg': surface.radiusLg,
    '--theme-radius-xl': surface.radiusXl,
    '--theme-backdrop-blur': surface.backdropBlur,
    '--theme-surface-opacity': surface.surfaceOpacity,
    '--theme-border-opacity': surface.borderOpacity,
    '--theme-shadow-soft': surface.shadowSoft,
    '--theme-shadow-card': surface.shadowCard,
    '--theme-shell-background': surface.shellBackground,

    '--layout-sidebar-width': layout.sidebar.width,
    '--layout-sidebar-bg': layout.sidebar.background,
    '--layout-sidebar-fg': layout.sidebar.foreground,
    '--layout-sidebar-border': layout.sidebar.border,
    '--layout-sidebar-brand-fg': layout.sidebar.brandForeground,
    '--layout-sidebar-brand-muted-fg': layout.sidebar.brandMutedForeground,
    '--layout-sidebar-nav-default': layout.sidebar.navItemDefault,
    '--layout-sidebar-nav-hover-bg': layout.sidebar.navItemHoverBackground,
    '--layout-sidebar-nav-hover-fg': layout.sidebar.navItemHoverForeground,
    '--layout-sidebar-nav-active-bg': layout.sidebar.navItemActiveBackground,
    '--layout-sidebar-nav-active-fg': layout.sidebar.navItemActiveForeground,
    '--layout-sidebar-group-border': layout.sidebar.groupBorder,

    '--layout-header-height': layout.header.height,
    '--layout-header-bg': layout.header.background,
    '--layout-header-fg': layout.header.foreground,
    '--layout-header-border': layout.header.border,
    '--layout-header-shadow': layout.header.shadow,
    '--layout-header-menu-btn-border': layout.header.menuButtonBorder,
    '--layout-header-menu-btn-hover-bg': layout.header.menuButtonHoverBackground,

    '--layout-footer-bg': layout.footer.background,
    '--layout-footer-fg': layout.footer.foreground,
    '--layout-footer-border': layout.footer.border,

    '--layout-main-bg': layout.main.background,
    '--layout-main-padding-x': layout.main.paddingX,
    '--layout-main-padding-y': layout.main.paddingY,

    '--layout-breadcrumb-text': layout.breadcrumb.text,
    '--layout-breadcrumb-separator': layout.breadcrumb.separator,
    '--layout-breadcrumb-active-text': layout.breadcrumb.activeText,
    '--layout-breadcrumb-link-hover-text': layout.breadcrumb.linkHoverText,

    '--layout-drawer-bg': layout.drawer.background,
    '--layout-drawer-fg': layout.drawer.foreground,
    '--layout-drawer-border': layout.drawer.border,
    '--layout-drawer-overlay': layout.drawer.overlay,
    '--layout-drawer-shadow': layout.drawer.shadow,
    '--layout-drawer-width': layout.drawer.width,
    '--layout-drawer-close-hover-bg': layout.drawer.closeButtonHoverBackground,

    '--layout-banner-trial-bg': layout.banner.trialBackground,
    '--layout-banner-trial-fg': layout.banner.trialForeground,
    '--layout-banner-trial-border': layout.banner.trialBorder,
    '--layout-banner-suspended-bg': layout.banner.suspendedBackground,
    '--layout-banner-suspended-fg': layout.banner.suspendedForeground,
    '--layout-banner-suspended-border': layout.banner.suspendedBorder,
    '--layout-banner-error-bg': layout.banner.errorBackground,
    '--layout-banner-error-fg': layout.banner.errorForeground,
    '--layout-banner-error-border': layout.banner.errorBorder,
    '--layout-banner-success-bg': layout.banner.successBackground,
    '--layout-banner-success-fg': layout.banner.successForeground,
    '--layout-banner-success-border': layout.banner.successBorder,
    '--layout-banner-info-bg': layout.banner.infoBackground,
    '--layout-banner-info-fg': layout.banner.infoForeground,
    '--layout-banner-info-border': layout.banner.infoBorder,
  };
}

export function applyResolvedThemeToElement(element: HTMLElement, theme: ResolvedTheme): void {
  const variables = resolvedThemeToCssVariables(theme);
  for (const [key, value] of Object.entries(variables)) {
    element.style.setProperty(key, value);
  }
  element.dataset.themeId = theme.id;
  element.dataset.themeColorMode = theme.colorMode;
  element.dataset.themeSurfaceStyle = theme.surface.style;
  element.dataset.themeLayoutVariant = theme.layoutVariant;
  element.dataset.themeDensity = theme.density;
  element.dataset.themeHeaderStyle = theme.headerStyle;
  element.dataset.themeSidebarStyle = theme.sidebarStyle;
  element.style.colorScheme = theme.colorMode;
  element.style.fontFamily = theme.typography.fontFamilySans;
  element.style.fontSize = theme.typography.fontSizeBase;
  element.style.lineHeight = theme.typography.lineHeightBase;
  element.style.letterSpacing = theme.typography.letterSpacing;
  syncDocumentDarkClass(theme.colorMode);
}

export function syncDocumentDarkClass(colorMode: ThemeColorMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.classList.toggle('dark', colorMode === 'dark');
}

/** @deprecated Use applyResolvedThemeToElement */
export function applyThemeToElement(element: HTMLElement, theme: ResolvedTheme): void {
  applyResolvedThemeToElement(element, theme);
}

/** @deprecated Use resolvedThemeToCssVariables */
export function themeToCssVariables(theme: ResolvedTheme): CssVariableMap {
  return resolvedThemeToCssVariables(theme);
}
