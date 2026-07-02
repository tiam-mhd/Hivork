'use client';

import { resolvedThemeToCssVariables } from '@hivork/theme';
import { useTheme } from '@hivork/theme/react';

export default function ThemeTokensDevPage() {
  const { resolvedTheme, themeMode, colorMode } = useTheme();
  const variables = resolvedThemeToCssVariables(resolvedTheme);
  const semanticKeys = Object.entries(variables).filter(([key]) =>
    key.startsWith('--') && !key.startsWith('--layout-') && !key.startsWith('--form-') && !key.startsWith('--font-') && !key.startsWith('--theme-'),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">مرجع توکن‌های تم</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          حالت ترجیحی: {themeMode} — اعمال‌شده: {colorMode} — تم: {resolvedTheme.id}
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Semantic tokens</h2>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {semanticKeys.map(([key, value]) => (
            <div key={key} className="rounded-lg border border-border px-3 py-2 text-sm">
              <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block size-6 rounded border border-border"
                  style={{ background: `hsl(${value})` }}
                  aria-hidden
                />
                <code className="text-xs">{value}</code>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
