'use client';

import type { ThemeModePreference } from '@hivork/contracts/theme';
import {
  hasUserThemeIdPreference,
  isRegisteredThemeId,
  resolveThemeId,
} from '@hivork/theme';
import { useThemeOptional } from '@hivork/theme/react';
import { useEffect, useRef } from 'react';

/**
 * Applies tenant default theme on first login when the user has no personal theme preference.
 * Invalid theme ids fall back to `base`.
 */
export function useTenantThemeSync(tenantThemeId?: string | null): void {
  const theme = useThemeOptional();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current || !theme || !tenantThemeId) {
      return;
    }

    if (hasUserThemeIdPreference()) {
      appliedRef.current = true;
      return;
    }

    if (!isRegisteredThemeId(tenantThemeId)) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console -- dev-only structured warning for invalid tenant theme
        console.warn(
          JSON.stringify({
            event: 'tenant_theme_invalid',
            themeId: tenantThemeId,
            fallback: 'base',
          }),
        );
      }
      appliedRef.current = true;
      return;
    }

    const resolved = resolveThemeId(tenantThemeId);
    if (resolved !== theme.themeId) {
      theme.setThemeId(resolved);
    }
    appliedRef.current = true;
  }, [tenantThemeId, theme]);
}

export function themeModeLabel(mode: ThemeModePreference): string {
  switch (mode) {
    case 'light':
      return 'روشن';
    case 'dark':
      return 'تاریک';
    case 'system':
      return 'سیستم';
  }
}
