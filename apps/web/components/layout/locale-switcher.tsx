'use client';

import { LOCALE_STORAGE_KEY } from '@hivork/i18n';
import { Button, cn } from '@hivork/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const locale = useLocale() as 'fa' | 'en';
  const t = useTranslations('locale');
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (next: 'fa' | 'en') => {
      if (next === locale) {
        return;
      }

      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // private mode
      }

      const stripped = pathname.replace(/^\/en/, '') || '/';
      const target = next === 'en' ? `/en${stripped === '/' ? '/admin/dashboard' : stripped}` : stripped;
      router.push(target);
      router.refresh();
    },
    [locale, pathname, router],
  );

  return (
    <div
      className={cn('inline-flex rounded-md border border-header-border bg-card/80 p-0.5', className)}
      role="group"
      aria-label={t('switchLabel')}
    >
      {(['fa', 'en'] as const).map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant={locale === code ? 'default' : 'ghost'}
          className="h-8 px-2 text-xs"
          aria-pressed={locale === code}
          onClick={() => switchLocale(code)}
        >
          {t(code)}
        </Button>
      ))}
    </div>
  );
}
