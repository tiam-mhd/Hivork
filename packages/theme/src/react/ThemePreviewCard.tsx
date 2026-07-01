'use client';

import type { ResolvedTheme, ThemeColorMode, ThemeDefinition } from '@hivork/contracts/theme';
import { useLayoutEffect, useRef } from 'react';

import { resolveThemeForMode } from '../core/resolver.js';
import { applyResolvedThemeToElement } from '../core/to-css-variables.js';

type ThemePreviewCardProps = {
  theme: ThemeDefinition;
  colorMode: ThemeColorMode;
  active: boolean;
  onActivate: () => void;
  onPreviewStart: () => void;
  onPreviewEnd: () => void;
};

export function ThemePreviewCard({
  theme,
  colorMode,
  active,
  onActivate,
  onPreviewStart,
  onPreviewEnd,
}: ThemePreviewCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const resolved = resolveThemeForMode(theme, colorMode);

  useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node) {
      return;
    }
    applyResolvedThemeToElement(node, resolved);
  }, [resolved]);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      onMouseEnter={onPreviewStart}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreviewStart}
      onBlur={onPreviewEnd}
    >
      <div
        ref={previewRef}
        className="relative aspect-[16/10] overflow-hidden border-b border-border"
        aria-hidden
      >
        <div className="absolute inset-0 flex" style={{ background: 'hsl(var(--layout-main-bg))' }}>
          <div
            className="h-full shrink-0 border-e"
            style={{
              width: '28%',
              background: 'hsl(var(--layout-sidebar-bg))',
              borderColor: 'hsl(var(--layout-sidebar-border))',
            }}
          >
            <div
              className="mx-2 mt-2 h-2 rounded-full"
              style={{ background: 'hsl(var(--layout-sidebar-brand-fg) / 0.85)' }}
            />
            <div
              className="mx-2 mt-1 h-1.5 w-2/3 rounded-full"
              style={{ background: 'hsl(var(--layout-sidebar-brand-muted-fg) / 0.5)' }}
            />
            <div
              className="mx-2 mt-3 h-2 rounded"
              style={{ background: 'hsl(var(--layout-sidebar-nav-active-bg))' }}
            />
            <div
              className="mx-2 mt-1 h-2 rounded"
              style={{ background: 'hsl(var(--layout-sidebar-nav-hover-bg) / 0.7)' }}
            />
            <div
              className="mx-2 mt-1 h-2 rounded"
              style={{ background: 'hsl(var(--layout-sidebar-nav-hover-bg) / 0.5)' }}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div
              className="h-[22%] border-b"
              style={{
                background: 'hsl(var(--layout-header-bg))',
                borderColor: 'hsl(var(--layout-header-border))',
              }}
            >
              <div
                className="ms-auto me-2 mt-2 h-2 w-8 rounded-full"
                style={{ background: 'hsl(var(--primary))' }}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              <div
                className="h-2 w-1/2 rounded"
                style={{ background: 'hsl(var(--layout-breadcrumb-active-text) / 0.25)' }}
              />
              <div
                className="flex-1 rounded-md border"
                style={{
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="absolute bottom-2 start-2 size-4 rounded-full ring-2 ring-card"
          style={{ background: `hsl(${resolved.preview.primary})` }}
        />
        <span className="absolute end-2 top-2 rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground">
          {colorMode === 'dark' ? 'تاریک' : 'روشن'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{theme.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{theme.description}</p>
          </div>
          {active ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              فعال
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">{layoutVariantLabel(theme.layoutVariant)}</span>
          <span className="rounded bg-muted px-1.5 py-0.5">{densityLabel(theme.density)}</span>
          <span className="rounded bg-muted px-1.5 py-0.5">روشن + تاریک</span>
          <span className="rounded bg-muted px-1.5 py-0.5">
            {theme.surface.style === 'glass' ? 'شیشه‌ای' : 'جامد'}
          </span>
        </div>

        <button
          type="button"
          disabled={active}
          onClick={onActivate}
          className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-default disabled:opacity-60"
        >
          {active ? 'تم فعال' : 'فعال‌سازی'}
        </button>
      </div>
    </article>
  );
}

function layoutVariantLabel(variant: ThemeDefinition['layoutVariant']): string {
  switch (variant) {
    case 'sidebar-classic':
      return 'سایدبار کلاسیک';
    case 'sidebar-compact':
      return 'سایدبار فشرده';
    case 'sidebar-wide':
      return 'سایدبار عریض';
  }
}

function densityLabel(density: ThemeDefinition['density']): string {
  return density === 'compact' ? 'فشرده' : 'راحت';
}

export type { ResolvedTheme };
