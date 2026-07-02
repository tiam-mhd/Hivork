export const DEFAULT_THEME_ID = 'base' as const;

export const DEFAULT_COLOR_MODE = 'light' as const;

export const DEFAULT_THEME_MODE = 'system' as const;

export const THEME_STORAGE_KEY = 'hivork-theme-id';

export const THEME_COOKIE_NAME = 'hivork-theme-id';

/** User preference: light | dark | system */
export const THEME_MODE_STORAGE_KEY = 'hivork-theme-mode';

export const THEME_MODE_COOKIE_NAME = 'hivork-theme-mode';

/** @deprecated Legacy color mode key — migrated to THEME_MODE_STORAGE_KEY */
export const COLOR_MODE_STORAGE_KEY = 'hivork-color-mode';

/** @deprecated Legacy color mode cookie — migrated to THEME_MODE_COOKIE_NAME */
export const COLOR_MODE_COOKIE_NAME = 'hivork-color-mode';

/** 1 year */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
