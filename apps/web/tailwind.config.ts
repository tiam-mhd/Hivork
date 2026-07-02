import uiPreset from '@hivork/ui/tailwind.preset';
import type { Config } from 'tailwindcss';

/**
 * RTL: prefer logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`).
 * Dark mode: `class` strategy on `<html class="dark">` — see `app/globals.css`.
 * CI: `pnpm ci:rtl-class-check`
 */
export default {
  darkMode: 'class',
  presets: [uiPreset],
} satisfies Config;
