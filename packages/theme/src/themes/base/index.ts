import type { ThemeDefinition } from '@hivork/contracts/theme';

import { hivorkTypography, solidSurface } from '../../tokens/typography.js';
import { baseDarkMode, baseLightMode } from './tokens.js';

/** Hivork brand theme — orange, cream, ink black; light + dark modes. */
export const baseTheme: ThemeDefinition = {
  id: 'base',
  name: 'Hivork',
  description: 'تم رسمی برند — نارنجی، کرم گرم، مشکی و خاکستری تیره؛ با حالت روشن و تاریک.',
  version: '2.1.0',
  modes: {
    light: baseLightMode,
    dark: baseDarkMode,
  },
  typography: hivorkTypography,
  surface: solidSurface,
  layoutVariant: 'sidebar-classic',
  density: 'comfortable',
  headerStyle: 'flat',
  sidebarStyle: 'filled',
};
