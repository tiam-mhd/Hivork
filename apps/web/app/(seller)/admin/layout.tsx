import {
  COLOR_MODE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  resolveColorMode,
  resolveThemeId,
} from '@hivork/theme';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';


import { AdminLayoutClient } from './admin-layout-client';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialThemeId = resolveThemeId(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const initialColorMode = resolveColorMode(cookieStore.get(COLOR_MODE_COOKIE_NAME)?.value);

  return (
    <AdminLayoutClient initialThemeId={initialThemeId} initialColorMode={initialColorMode}>
      {children}
    </AdminLayoutClient>
  );
}
