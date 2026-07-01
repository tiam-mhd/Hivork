import type { ThemeDefinition } from '@hivork/contracts/theme';

import { bubbleTypography, glassSurface } from '../../tokens/typography.js';
import { BUBBLE_LIGHT_SHELL, bubbleSpaceDarkMode, bubbleSpaceLightMode } from './tokens.js';

/** Glass bubble theme — soft rounded surfaces, cosmic spacious backdrop. */
export const bubbleSpaceTheme: ThemeDefinition = {
  id: 'bubble-space',
  name: 'حباب فضایی',
  description:
    'طراحی شیشه‌ای با گوشه‌های نرم حبابی، فضای باز و پس‌زمینه کهکشانی — روشن و تاریک.',
  version: '1.0.0',
  modes: {
    light: bubbleSpaceLightMode,
    dark: bubbleSpaceDarkMode,
  },
  typography: bubbleTypography,
  surface: glassSurface(BUBBLE_LIGHT_SHELL),
  layoutVariant: 'sidebar-wide',
  density: 'comfortable',
  headerStyle: 'elevated',
  sidebarStyle: 'transparent',
};
