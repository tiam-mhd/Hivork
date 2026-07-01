'use client';

import { ThemePreviewCard, useTheme } from '@hivork/theme/react';
import { useEffect, useState } from 'react';

function ColorModeSelector() {
  const { colorMode, setColorMode } = useTheme();

  return (
    <section
      aria-labelledby="color-mode-heading"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <h2 id="color-mode-heading" className="text-lg font-semibold text-foreground">
        حالت رنگ
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        هر تم شامل نسخه روشن و تاریک است. حالت انتخابی روی تم فعال اعمال می‌شود.
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {(['light', 'dark'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={colorMode === mode}
            onClick={() => setColorMode(mode)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              colorMode === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'light' ? 'روشن' : 'تاریک'}
          </button>
        ))}
      </div>
    </section>
  );
}

function ActiveThemeSummary() {
  const { theme, themeId, colorMode, resolvedTheme } = useTheme();

  return (
    <section
      aria-labelledby="active-theme-heading"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="active-theme-heading" className="text-lg font-semibold text-foreground">
            تم فعال
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            تنظیمات ظاهری فقط برای حساب کاربری شما ذخیره می‌شود.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {theme.name}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">شناسه</dt>
          <dd className="mt-0.5 font-medium text-foreground">{themeId}</dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">حالت رنگ</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {colorMode === 'dark' ? 'تاریک' : 'روشن'}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">سطح UI</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {resolvedTheme.surface.style === 'glass' ? 'شیشه‌ای' : 'جامد'}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 sm:col-span-2 lg:col-span-3">
          <dt className="text-muted-foreground">تایپوگرافی</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            فارسی: Vazirmatn — انگلیسی: Sora
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">
            اندازه پایه {resolvedTheme.typography.fontSizeBase} · ارتفاع خط{' '}
            {resolvedTheme.typography.lineHeightBase}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">چیدمان</dt>
          <dd className="mt-0.5 font-medium text-foreground">{layoutVariantFa(theme.layoutVariant)}</dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">تراکم</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {theme.density === 'compact' ? 'فشرده' : 'راحت'}
          </dd>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <dt className="text-muted-foreground">نسخه تم</dt>
          <dd className="mt-0.5 font-medium text-foreground">{theme.version}</dd>
        </div>
      </dl>
    </section>
  );
}

function ThemeGallery() {
  const { themeId, colorMode, themes, setThemeId, previewThemeId } = useTheme();
  const [activatedToast, setActivatedToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activatedToast) {
      return;
    }
    const timer = setTimeout(() => setActivatedToast(null), 3000);
    return () => clearTimeout(timer);
  }, [activatedToast]);

  return (
    <section aria-labelledby="theme-gallery-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="theme-gallery-heading" className="text-lg font-semibold text-foreground">
          گالری تم‌ها
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          پیش‌نمایش با حالت رنگ فعلی ({colorMode === 'dark' ? 'تاریک' : 'روشن'}) نمایش داده می‌شود.
        </p>
      </div>

      {activatedToast ? (
        <div
          role="status"
          className="rounded-lg border border-banner-success-border bg-banner-success px-4 py-3 text-sm text-banner-success-foreground"
        >
          {activatedToast}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => (
          <ThemePreviewCard
            key={theme.id}
            theme={theme}
            colorMode={colorMode}
            active={theme.id === themeId}
            onActivate={() => {
              setThemeId(theme.id);
              setActivatedToast(`تم «${theme.name}» فعال شد.`);
            }}
            onPreviewStart={() => previewThemeId(theme.id)}
            onPreviewEnd={() => previewThemeId(null)}
          />
        ))}
      </div>
    </section>
  );
}

function layoutVariantFa(variant: string): string {
  switch (variant) {
    case 'sidebar-classic':
      return 'سایدبار کلاسیک';
    case 'sidebar-compact':
      return 'سایدبار فشرده';
    case 'sidebar-wide':
      return 'سایدبار عریض';
    default:
      return variant;
  }
}

export function AppearanceSettingsPanel() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">ظاهر و تم</h1>
        <p className="text-sm text-muted-foreground">
          تم پنل فروشنده را انتخاب کنید. هر تم شامل حالت روشن و تاریک است و هدر، سایدبار، فوتر و
          تمام اجزای داشبورد از آن پیروی می‌کنند.
        </p>
      </header>

      <ColorModeSelector />
      <ActiveThemeSummary />
      <ThemeGallery />
    </div>
  );
}
