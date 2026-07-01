# TASK-014: Package Skeleton — packages/ui

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-014 |
| Priority | P1 |
| Depends on | TASK-003, TASK-007 |
| Blocks | TASK-054 |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

Shared design system `@hivork/ui` — shadcn/ui base components RTL-ready با Tailwind preset. همه components از logical CSS properties (`ms-/me-`) استفاده می‌کنند — هیچ hardcoded `left`/`right` وجود ندارد.

---

## معیار پذیرش

- [x] `@hivork/ui` exports: `Button`، `Input`، `Label`، `Card`
- [x] Tailwind preset در `tailwind.preset.ts` export می‌شود
- [x] Components در Next.js app با `transpilePackages: ['@hivork/ui']` کار می‌کنند
- [x] RTL: logical properties (`ms-`، `me-`، `ps-`، `pe-`) — هیچ `ml-`/`mr-` hardcode
- [x] هیچ business logic در components
- [x] TypeScript strict

---

## مشخصات فنی

### ساختار پوشه

```
packages/ui/
├── src/
│   ├── index.ts            # re-exports همه components
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   └── lib/
│       └── utils.ts        # cn() helper
├── tailwind.preset.ts      # Tailwind config preset
└── package.json            # name: @hivork/ui
```

### Components (RTL-safe)

```tsx
// button.tsx
import { cn } from './lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        // RTL logical spacing:
        'px-4 py-2',  // padding symmetric — OK
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-input bg-background hover:bg-accent',
        className,
      )}
      {...props}
    />
  );
}
```

### `tailwind.preset.ts`

```typescript
import type { Config } from 'tailwindcss';

export const tailwindPreset: Config = {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif'],
      },
    },
  },
};
```

### `next.config.ts` (apps/web)

```typescript
transpilePackages: ['@hivork/ui'],
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/ui/src/button.tsx` |
| Create | `packages/ui/src/input.tsx` |
| Create | `packages/ui/src/label.tsx` |
| Create | `packages/ui/src/card.tsx` |
| Create | `packages/ui/src/lib/utils.ts` |
| Create | `packages/ui/src/index.ts` |
| Create | `packages/ui/tailwind.preset.ts` |
| Create | `packages/ui/package.json` |
| Update | `apps/web/next.config.ts`: transpilePackages |

---

## مراحل پیاده‌سازی

1. `packages/ui/package.json` با React peer deps
2. `lib/utils.ts` با `cn()` (clsx + tailwind-merge)
3. `Button`، `Input`، `Label`، `Card` components — RTL-safe
4. `tailwind.preset.ts`
5. `apps/web/next.config.ts` اضافه کن `transpilePackages`
6. Import یک component در `apps/web/app/(seller)/admin/page.tsx` و verify کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `ml-4` در component | Review fail — از `ms-4` استفاده کن |
| `mr-2` در component | Review fail — از `me-2` استفاده کن |
| Import در Server Component | بدون `"use client"` — error اگر event handler داشته باشد |
| Missing `transpilePackages` | Build error در Next.js |
| Tailwind class conflict | `tailwind-merge` (`cn()`) آن را resolve می‌کند |
| Component prop missing | TypeScript error — typed props required |

---

## UX

- [x] همه components RTL-compatible (logical CSS)
- [x] Focus ring برای accessibility
- [x] Disabled state برای همه interactive components
- [x] Font: Vazirmatn (Farsi-optimized) در tailwind preset

---

## تست

```bash
# در apps/web:
pnpm --filter @hivork/web dev
# Import Button از @hivork/ui در یک page
# بررسی کن در browser: text راست‌چین است در RTL
```

---

## ممنوعیت‌ها

- Business logic در component (pure UI)
- `ml-/mr-` hardcoded (از logical properties استفاده کن)
- Non-peer React deps (React باید peer dep باشد)

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §5 — RTL، a11y، logical properties
- [x] DEVELOPMENT_RULES.md — "Happy-path-only UI" ممنوع — disabled/loading states لازم
- [x] `.cursor/rules/05-frontend-nextjs.mdc`
- [x] SOFT-DELETE-POLICY — N/A

---

## مراجع

- `docs/04-technology/tech-stack.md` § UI
- `.cursor/rules/05-frontend-nextjs.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 24/25 | AC، components، RTL — vitest برای components |
| Policy (25) | 25/25 | RTL logical، no business logic |
| Executability (25) | 24/25 | Edge cases، steps — visual test manual |
| Alignment (15) | 15/15 | Sync با frontend rules |
| **جمع** | **98/100** | ✅ Ready |
