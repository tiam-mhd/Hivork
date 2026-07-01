# IFP-TASK-029: Dark/Light Theme + RTL Polish (packages/theme)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-05-Theme-i18n-a11y |
| ID | IFP-TASK-029 |
| Priority | P0 |
| Depends on | TASK-101, TASK-102 |
| Blocks | IFP-TASK-030, all admin pages visual consistency |
| Estimated | 10h |

---

## هدف

یکپارچه‌سازی **`packages/theme`** با admin shell — toggle **حالت تاریک/روشن**، اعمال semantic tokens از `ThemeDefinition`، و **RTL polish** برای layout، DataTable، و فرم‌ها. رنگ‌های hardcoded در صفحات ممنوع.

---

## معیار پذیرش

- [ ] `ThemeProvider` در `apps/web` — wraps admin layout
- [ ] Toggle در header: sun/moon icon — persists `localStorage` key `hivork-theme-mode`
- [ ] Modes: `light` | `dark` | `system` (follows OS)
- [ ] CSS variables injected from active `ThemeDefinition` (`base` theme default)
- [ ] `class="dark"` on `<html>` strategy (Tailwind darkMode: 'class')
- [ ] RTL: `dir="rtl"` on `<html>` — logical properties (`ms-`, `me-`, `ps-`, `pe-`)
- [ ] Sidebar, header, DataTable, modals — verified in both modes
- [ ] Focus rings visible WCAG AA in dark mode
- [ ] Tenant theme override hook (read `tenant.settings.themeId`) — fallback `base`
- [ ] No flash on load — blocking script in layout sets class before paint
- [ ] Storybook/doc: token reference page (dev)

---

## مشخصات فنی

### Theme Provider

```
apps/web/src/providers/theme-provider.tsx
```

```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  themeId?: string; // from @hivork/theme registry
}

// Uses getTheme(themeId) from @hivork/theme
// Applies semantic tokens as CSS variables on :root and .dark
```

### CSS Variable Injection

```typescript
// packages/theme/src/runtime/apply-theme.ts
export function applyThemeToDocument(theme: ThemeDefinition, mode: 'light' | 'dark'): void {
  const tokens = mode === 'dark' ? theme.dark : theme.light;
  Object.entries(tokens.semantic).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${camelToKebab(key)}`, value);
  });
}
```

### Theme Toggle Component

```
apps/web/src/components/layout/theme-toggle.tsx
```

```tsx
<DropdownMenu>
  <DropdownMenuItem onClick={() => setTheme('light')}>روشن</DropdownMenuItem>
  <DropdownMenuItem onClick={() => setTheme('dark')}>تاریک</DropdownMenuItem>
  <DropdownMenuItem onClick={() => setTheme('system')}>سیستم</DropdownMenuItem>
</DropdownMenu>
```

### RTL Polish Checklist (implement)

| Area | Fix |
|------|-----|
| DataTable sort icons | mirror in RTL |
| Bulk action bar | actions order RTL |
| Drawer/dropdown | align to start edge |
| Form labels | `text-start` |
| Icons directional | chevron-left ↔ right swap |
| Scrollbar | native OK |

### Layout Integration

```tsx
// apps/web/src/app/(admin)/layout.tsx
<ThemeProvider defaultTheme="system" themeId={tenant?.settings?.themeId ?? 'base'}>
  <div dir="rtl" className="min-h-screen bg-background text-foreground">
    {children}
  </div>
</ThemeProvider>
```

### Anti-FOUC Script

```tsx
// apps/web/src/app/layout.tsx inline script
(function() {
  const t = localStorage.getItem('hivork-theme-mode');
  if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.add('dark');
})();
```

### packages/theme Usage

```typescript
import { getThemeOrThrow, listThemes } from '@hivork/theme';
import type { ThemeDefinition } from '@hivork/contracts/theme';
```

Existing registry: `base`, `bubble-space` — admin uses `base` unless tenant override.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/providers/theme-provider.tsx` |
| Create | `apps/web/src/components/layout/theme-toggle.tsx` |
| Create | `packages/theme/src/runtime/apply-theme.ts` |
| Update | `apps/web/src/app/(admin)/layout.tsx` |
| Update | `apps/web/src/app/layout.tsx` — anti-FOUC script |
| Update | `apps/web/tailwind.config.ts` — CSS variable mapping |
| Update | `apps/web/src/components/data-table/*` — RTL logical classes |
| Update | `packages/theme/package.json` — export runtime |

---

## مراحل پیاده‌سازی

1. `applyThemeToDocument` runtime
2. ThemeProvider + context
3. Theme toggle in admin header
4. Anti-FOUC script
5. Audit admin components for hardcoded colors → CSS vars
6. DataTable RTL pass
7. Dark mode contrast QA
8. Tenant themeId from settings (optional read)
9. Dev token reference page

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Invalid themeId in tenant settings | Fallback `base` + log structured warning |
| localStorage blocked | Default system mode session-only |
| SSR hydration mismatch | suppressHydrationWarning on html class |
| Print view | Force light mode for print CSS |

---

## تست

- [ ] Component: toggle switches `dark` class
- [ ] Component: system mode respects matchMedia mock
- [ ] Visual regression: DataTable light/dark snapshots (optional)
- [ ] a11y: focus ring contrast check (manual checklist)

---

## UX

- [ ] Toggle accessible `aria-label="تغییر تم"`
- [ ] Smooth transition optional `transition-colors duration-200`
- [ ] Preference persists across sessions
- [ ] Excellence §7 — consistent chrome all pages

---

## Flow

```
First visit → system mode → apply OS preference
User selects dark → localStorage → class dark → tokens applied
Tenant themeId → load ThemeDefinition on login
```

---

## Policy Alignment

- [ ] ADR-010 — shadcn + theme tokens
- [ ] `@hivork/contracts/theme` — single source
- [ ] No business logic in theme provider

---

## مراجع

- `packages/theme/src/core/registry.ts`
- `packages/contracts/src/theme/theme-definition.schema.ts`
- `docs/01-product/installment-module-features.md` — حالت تاریک و روشن

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 23 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | packages/theme |
| **جمع** | **/100** | **98** | ≥95 ✅ |
