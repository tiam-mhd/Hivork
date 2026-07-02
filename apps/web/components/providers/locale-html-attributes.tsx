'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Syncs document lang/dir with the active next-intl locale. */
export function LocaleHtmlAttributes() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
